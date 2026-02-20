const express = require("express");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
require("dotenv").config({ path: "./config.env" });

const app = express();
const cors = require("cors");
app.use(cors());

// ── Configuration ────────────────────────────────────────────────────
const SERIAL_PORT =
    process.env.SCALE_PORT || (process.platform === "win32" ? "COM3" : "/dev/ttyUSB0");
const BAUD_RATE = parseInt(process.env.SCALE_BAUD_RATE || "9600", 10);
const HTTP_PORT = parseInt(process.env.SCALE_HTTP_PORT || "4001", 10);
const STALE_THRESHOLD_MS = 10000; // 10 seconds

// ── State ────────────────────────────────────────────────────────────
let latestWeight = {
    weight: 0,
    unit: "kg",
    raw: "",
    timestamp: null,
    stable: false,
    net: false,
    error: null,
};

let serialConnected = false;
let reconnectTimer = null;
let currentPort = null;

// ── Weight Parsing ───────────────────────────────────────────────────
function parseWeight(data) {
    const trimmed = data.trim();

    // Check stability: ST = Stable, US = Unstable
    const isStable = trimmed.includes("ST") || !trimmed.includes("US");

    // Check if Net or Gross
    const isNet = trimmed.includes("NT");

    // Extract weight - handles: "ST,GS,  12.50 kg" or "+012.50 kg 0" or "-0.50 kg"
    const weightMatch = trimmed.match(/(-?\s*[\d.]+)\s*(kg|g|lb|oz)/i);

    if (weightMatch) {
        let weight = parseFloat(weightMatch[1].replace(/\s/g, ""));
        let unit = weightMatch[2].toLowerCase();

        // Convert to kg if needed
        if (unit === "g") {
            weight = weight / 1000;
            unit = "kg";
        } else if (unit === "lb") {
            weight = weight * 0.453592;
            unit = "kg";
        } else if (unit === "oz") {
            weight = weight * 0.0283495;
            unit = "kg";
        }

        return {
            weight: Math.round(weight * 1000) / 1000, // Round to 3 decimals
            unit: unit,
            raw: trimmed,
            timestamp: new Date().toISOString(),
            stable: isStable,
            net: isNet,
            error: null,
        };
    }
    return null;
}

// ── Serial Port Connection ───────────────────────────────────────────
async function listPorts() {
    try {
        const ports = await SerialPort.list();
        if (ports.length === 0) {
            console.log("[Scale] No serial ports found. Is the scale connected?");
        } else {
            console.log("[Scale] Available serial ports:");
            ports.forEach((port) => {
                console.log(`  - ${port.path} (${port.manufacturer || "Unknown"})`);
            });
        }
    } catch (err) {
        console.error("[Scale] Error listing ports:", err.message);
    }
}

function connectSerial() {
    // Close existing connection first to prevent memory leak
    if (currentPort && currentPort.isOpen) {
        try {
            currentPort.close();
        } catch (e) {
            console.log("[Scale] Error closing old port:", e.message);
        }
    }

    try {
        console.log(`[Scale] Attempting to connect to ${SERIAL_PORT}...`);

        currentPort = new SerialPort({
            path: SERIAL_PORT,
            baudRate: BAUD_RATE,
            dataBits: 8,
            parity: "none",
            stopBits: 1,
        });

        const parser = currentPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

        currentPort.on("open", () => {
            console.log(`[Scale] Connected to ${SERIAL_PORT} at ${BAUD_RATE} baud`);
            serialConnected = true;
            latestWeight.error = null;

            // Clear reconnect timer on successful connection
            if (reconnectTimer) {
                clearInterval(reconnectTimer);
                reconnectTimer = null;
            }
        });

        parser.on("data", (data) => {
            try {
                const parsed = parseWeight(data);
                if (parsed) {
                    latestWeight = parsed;
                    console.log(
                        `[Scale] Weight: ${parsed.weight} ${parsed.unit} | Stable: ${parsed.stable} | Net: ${parsed.net}`
                    );
                }
            } catch (parseError) {
                console.error("[Scale] Parse error:", parseError.message);
            }
        });

        currentPort.on("error", (err) => {
            console.error("[Scale] Serial error:", err.message);
            serialConnected = false;
            latestWeight.error = "Serial port error: " + err.message;

            if (!reconnectTimer) {
                listPorts();
            }
            scheduleReconnect();
        });

        currentPort.on("close", () => {
            console.log("[Scale] Serial port closed");
            serialConnected = false;
            latestWeight.error = "Serial port disconnected";
            scheduleReconnect();
        });

        return currentPort;
    } catch (err) {
        console.error("[Scale] Connection failed:", err.message);
        serialConnected = false;
        latestWeight.error = "Connection failed: " + err.message;
        listPorts();
        scheduleReconnect();
        return null;
    }
}

function scheduleReconnect() {
    if (!reconnectTimer && !serialConnected) {
        console.log("[Scale] Will attempt reconnect every 5 seconds...");
        reconnectTimer = setInterval(() => {
            if (!serialConnected) {
                console.log("[Scale] Attempting reconnect...");
                connectSerial();
            } else {
                // Already connected, clear the timer
                clearInterval(reconnectTimer);
                reconnectTimer = null;
            }
        }, 5000);
    }
}

// ── HTTP Endpoints ───────────────────────────────────────────────────

// GET /weight - Return current weight reading
app.get("/weight", (req, res) => {
    const now = Date.now();
    const readingAge = latestWeight.timestamp
        ? now - new Date(latestWeight.timestamp).getTime()
        : null;

    res.json({
        ...latestWeight,
        connected: serialConnected,
        stale: readingAge === null || readingAge > STALE_THRESHOLD_MS,
    });
});

// GET /status - Service health check
app.get("/status", (req, res) => {
    res.json({
        service: "scale-service",
        connected: serialConnected,
        port: SERIAL_PORT,
        baudRate: BAUD_RATE,
        lastReading: latestWeight.timestamp,
    });
});

// GET /ports - List available serial ports (useful for debugging)
app.get("/ports", async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json({
            available: ports.map((p) => ({
                path: p.path,
                manufacturer: p.manufacturer || "Unknown",
                vendorId: p.vendorId,
                productId: p.productId,
            })),
            current: SERIAL_PORT,
            connected: serialConnected,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Graceful Shutdown ────────────────────────────────────────────────
process.on("SIGINT", () => {
    console.log("\n[Scale] Shutting down...");

    if (reconnectTimer) {
        clearInterval(reconnectTimer);
    }

    if (currentPort && currentPort.isOpen) {
        currentPort.close(() => {
            console.log("[Scale] Serial port closed");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// ── Start ────────────────────────────────────────────────────────────
console.log("[Scale] T-Scale BW/BWS Service Starting...");
console.log(`[Scale] Platform: ${process.platform}`);
console.log(`[Scale] Target port: ${SERIAL_PORT}`);
console.log(`[Scale] Baud rate: ${BAUD_RATE}`);

connectSerial();

app.listen(HTTP_PORT, () => {
    console.log(`[Scale] HTTP API listening on port ${HTTP_PORT}`);
    console.log(`[Scale] Endpoints:`);
    console.log(`  GET http://localhost:${HTTP_PORT}/weight  - Current reading`);
    console.log(`  GET http://localhost:${HTTP_PORT}/status  - Service status`);
    console.log(`  GET http://localhost:${HTTP_PORT}/ports   - List serial ports`);
});
