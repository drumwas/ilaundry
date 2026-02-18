/**
 * Weighing Scale Service (T-Scale BW/BWS via RS232)
 * 
 * Standalone microservice that reads weight from a serial-connected
 * weighing scale and exposes it via HTTP API on port 4001.
 * 
 * Usage:
 *   node scale-service.js
 * 
 * Environment variables (optional):
 *   SCALE_PORT       - Serial port path (default: COM3 on Windows, /dev/ttyUSB0 on Linux)
 *   SCALE_BAUD_RATE  - Baud rate (default: 9600)
 *   SCALE_HTTP_PORT  - HTTP port for the API (default: 4001)
 */

const express = require("express");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
require("dotenv").config({ path: "./config.env" });

const app = express();

// ── Configuration ────────────────────────────────────────────────────
const SERIAL_PORT = process.env.SCALE_PORT || (process.platform === "win32" ? "COM3" : "/dev/ttyUSB0");
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
    error: null,
};

let serialConnected = false;
let reconnectTimer = null;

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
    try {
        console.log(`[Scale] Attempting to connect to ${SERIAL_PORT}...`);
        const port = new SerialPort({
            path: SERIAL_PORT,
            baudRate: BAUD_RATE,
            dataBits: 8,
            parity: "none",
            stopBits: 1,
        });

        const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

        port.on("open", () => {
            console.log(`[Scale] Connected to ${SERIAL_PORT} at ${BAUD_RATE} baud`);
            serialConnected = true;
            latestWeight.error = null;
            if (reconnectTimer) {
                clearInterval(reconnectTimer);
                reconnectTimer = null;
            }
        });

        parser.on("data", (data) => {
            try {
                const trimmed = data.trim();
                // T-Scale format examples: "ST,GS,  1.234kg", "ST,NT,  0.000kg", "US,GS,  1.234kg"
                // ST = Stable, US = Unstable
                // GS = Gross, NT = Net
                const isStable = trimmed.startsWith("ST");
                const weightMatch = trimmed.match(/([\d.]+)\s*(kg|g|lb|oz)/i);

                if (weightMatch) {
                    let weight = parseFloat(weightMatch[1]);
                    let unit = weightMatch[2].toLowerCase();

                    // Convert to kg if needed
                    if (unit === "g") {
                        weight = weight / 1000;
                        unit = "kg";
                    }

                    latestWeight = {
                        weight: weight,
                        unit: unit,
                        raw: trimmed,
                        timestamp: new Date().toISOString(),
                        stable: isStable,
                        error: null,
                    };
                }
            } catch (parseError) {
                console.error("[Scale] Parse error:", parseError.message);
            }
        });

        port.on("error", (err) => {
            console.error("[Scale] Serial error:", err.message);
            serialConnected = false;
            latestWeight.error = "Serial port error: " + err.message;
            if (!reconnectTimer) {
                listPorts(); // List ports to help debugging
            }
            scheduleReconnect();
        });

        port.on("close", () => {
            console.log("[Scale] Serial port closed");
            serialConnected = false;
            latestWeight.error = "Serial port disconnected";
            scheduleReconnect();
        });

        return port;
    } catch (err) {
        console.error("[Scale] Connection failed:", err.message);
        serialConnected = false;
        latestWeight.error = "Connection failed: " + err.message;
        listPorts(); // List ports to help debugging
        scheduleReconnect();
        return null;
    }
}

function scheduleReconnect() {
    if (!reconnectTimer) {
        console.log("[Scale] Will attempt reconnect every 5 seconds...");
        reconnectTimer = setInterval(() => {
            console.log("[Scale] Attempting reconnect...");
            connectSerial();
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

// ── Start ────────────────────────────────────────────────────────────
connectSerial();

app.listen(HTTP_PORT, () => {
    console.log(`[Scale] HTTP API listening on port ${HTTP_PORT}`);
    console.log(`[Scale] Endpoints:`);
    console.log(`  GET http://localhost:${HTTP_PORT}/weight`);
    console.log(`  GET http://localhost:${HTTP_PORT}/status`);
});
