const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const auth = require("../middelwer/auth");
const { upload } = require("../middelwer/multer");
const bcrypt = require("bcrypt");
var { DataDelete, DataUpdate, DataInsert, DataFind, DataQuery } = require("../middelwer/databaseQurey");


router.post("/login", async (req, res) => {
  try {
    const { username, password, loginas } = req.body;

    let data;
    if (loginas == 0) {
      data = await DataQuery(
        "SELECT * FROM tbl_customer WHERE username = ? AND delet_flage=0 AND approved=1",
        [username]
      );
    } else {
      data = await DataQuery(
        "SELECT * FROM tbl_admin WHERE username = ? AND delet_flage=0 AND approved=1",
        [username]
      );
    }

    if (data.length == 0) {
      return res.status(200).json({
        status: "error",
        ResponseCode: "400",
        message: "Invalid Username.",
      });
    }

    // Use bcrypt to compare passwords securely
    const isValidPass = bcrypt.compareSync(password, data[0].password);
    if (!isValidPass) {
      return res.status(200).json({
        status: "error",
        ResponseCode: "400",
        message: "Invalid password.",
      });
    }

    let token;
    if (loginas == 0) {
      token = jwt.sign(
        { id: data[0].id, roll: 0, store: data[0].store_ID, loginas },
        process.env.TOKEN_KEY,
        { expiresIn: '1h' }
      );
    } else {
      token = jwt.sign(
        {
          id: data[0].id,
          roll: data[0].roll_id,
          store: data[0].store_ID,
          loginas,
        },
        process.env.TOKEN_KEY,
        { expiresIn: '1h' }
      );
    }

    const {
      password: pass,
      roll_id,
      approved,
      delet_flage,
      ...userdata
    } = data[0];

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      message: "Login successful",
      userdata: userdata,
      token: token,
    });
  } catch (error) {
    console.error("App login error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "500",
      message: "An error occurred. Please try again.",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      number,
      email,
      taxnumber,
      address,
      username,
      password,
      store,
    } = req.body;

    const check_number = await DataQuery(
      "SELECT * FROM tbl_customer WHERE number = ?",
      [number]
    );
    if (check_number.length > 0) {
      return res.status(200).json({
        status: "error",
        ResponseCode: "400",
        message: "This Mobile Number Already Registered!",
      });
    }

    const check_username = await DataQuery(
      "SELECT * FROM tbl_customer WHERE username = ?",
      [username]
    );
    if (check_username.length > 0) {
      return res.status(200).json({
        status: "error",
        ResponseCode: "400",
        message: "This Username Already Registered!",
      });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    if (store) {
      await DataQuery(
        "INSERT INTO tbl_customer (name, number, email, address, taxnumber, username, password, store_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, number, email, address, taxnumber, username, hashedPassword, store]
      );
    } else {
      await DataQuery(
        "INSERT INTO tbl_customer (name, number, email, address, taxnumber, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, number, email, address, taxnumber, username, hashedPassword]
      );
    }

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      message: "Registration was successful, and data was sent to the administrator for approval.",
    });
  } catch (error) {
    console.error("App register error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "500",
      message: "An error occurred. Please try again.",
    });
  }
});

router.get("/multy", async (req, res) => {
  try {
    const multiy = await DataFind("SELECT type FROM tbl_master_shop");
    if (multiy[0].type == 1) {
      var storeList = await DataFind(
        "SELECT id,name FROM tbl_store WHERE status=1 AND delete_flage=0"
      );
      res.status(200).json({
        status: "success",
        ResponseCode: "200",
        multiy: true,
        storelist: storeList,
        message: "Store is Multi mode",
      });
    } else {
      res.status(200).json({
        status: "success",
        ResponseCode: "200",
        multiy: false,
        storelist: [],
        message: "store is single mode",
      });
    }
  } catch (error) {
    console.error("Multy error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

router.get("/store", async (req, res) => {
  try {
    const store_list = await DataFind(
      "SELECT id,name FROM tbl_store WHERE status = 1"
    );

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      store_list: store_list,
    });
  } catch (error) {
    console.error("Store list error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

router.post("/customer", async (req, res) => {
  try {
    const { store_id } = req.body;
    const customer_list = await DataQuery(
      "SELECT id,name FROM tbl_customer WHERE store_id = ?",
      [store_id]
    );

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      customer_list: customer_list,
    });
  } catch (error) {
    console.error("Customer list error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

router.post("/services", async (req, res) => {
  try {
    const { store_id } = req.body;
    const services = await DataQuery(
      "SELECT * FROM tbl_services WHERE store_id = ?",
      [store_id]
    );

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      services: services,
    });
  } catch (error) {
    console.error("Services error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

router.post("/services_type", async (req, res) => {
  try {
    const { services_type_id } = req.body;

    // Validate input is a comma-separated list of numbers
    if (!services_type_id || !/^[\d,]+$/.test(services_type_id)) {
      return res.status(200).json({
        status: "error",
        ResponseCode: "400",
        message: "Invalid service type IDs.",
      });
    }

    const ids = services_type_id.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    const placeholders = ids.map(() => '?').join(',');

    const services_type = await DataQuery(
      `SELECT * FROM tbl_services_type WHERE id IN (${placeholders})`,
      ids
    );

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      services_type: services_type,
    });
  } catch (error) {
    console.error("Services type error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

router.post("/addons", async (req, res) => {
  try {
    const { store_id } = req.body;
    const services = await DataQuery(
      "SELECT * FROM tbl_addons WHERE store_id = ?",
      [store_id]
    );

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      services: services,
    });
  } catch (error) {
    console.error("Addons error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

router.post("/coupon", async (req, res) => {
  try {
    const { store_id } = req.body;
    const services = await DataQuery(
      "SELECT * FROM tbl_coupon WHERE start_date <= DATE(NOW()) AND end_date >= DATE(NOW()) AND status=0 AND FIND_IN_SET(?, store_list_id)",
      [store_id]
    );

    res.status(200).json({
      status: "success",
      ResponseCode: "200",
      services: services,
    });
  } catch (error) {
    console.error("Coupon error:", error.message);
    return res.status(200).json({
      status: "error",
      ResponseCode: "400",
      message: "An error occurred.",
    });
  }
});

module.exports = router;
