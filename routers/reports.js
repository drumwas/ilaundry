const express = require("express");
const router = express.Router();
const auth = require("../middelwer/auth");
const access = require("../middelwer/access");
var Excel = require("exceljs");
var {
  DataDelete,
  DataUpdate,
  DataInsert,
  DataFind
} = require("../middelwer/databaseQurey");
//>>>>>>>>>>Daily Reports<<<<<<<<<<<<<
router.get("/daily", auth, async (req, res) => {
  try {
    const { id, roll, store } = req.user;
    const accessdata = await access(req.user);

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

console.log(rolldetail[0]);


    if (rolldetail[0].rollType == 'master' && rolldetail[0].reports.includes("read")) {
      var storeList = await DataFind("SELECT * FROM tbl_store WHERE status=1");
      var orders = await DataFind(
        "SELECT COUNT(*) as status_count FROM `tbl_order` WHERE DATE(order_date) = CURDATE() "
      );
      var ordersdeliver = await DataFind(
        "SELECT COUNT(*) as status_count FROM `tbl_order` WHERE order_status=4 AND DATE(stutus_change_date) = CURDATE()"
      );
      var orderstotalseal = await DataFind(
        "SELECT SUM(`gross_total`) as totalsale FROM `tbl_order` WHERE  DATE(order_date) = CURDATE() "
      );
      var orderspayment = await DataFind(
        "SELECT SUM(`debit_amount`) as expence, SUM(`credit_amount`) as payment FROM `tbl_transections` WHERE  DATE(date) = CURDATE()"
      );

      console.log("orders", orders);
    } else if (rolldetail[0].rollType == 'store' && rolldetail[0].reports.includes("read")) {
      var storeList = await DataFind("SELECT * FROM tbl_store WHERE status=1");
      var orders = await DataFind(
        "SELECT COUNT(*) as status_count FROM `tbl_order` WHERE store_id=" +
          store +
          " AND DATE(order_date) = CURDATE() "
      );
      var ordersdeliver = await DataFind(
        "SELECT COUNT(*) as status_count FROM `tbl_order` WHERE store_id=" +
          store +
          " AND order_status=4 AND DATE(stutus_change_date) = CURDATE()"
      );
      var orderstotalseal = await DataFind(
        "SELECT SUM(`gross_total`) as totalsale FROM `tbl_order` WHERE store_id=" +
          store +
          " AND DATE(order_date) = CURDATE() "
      );
      var orderspayment = await DataFind(
        "SELECT SUM(`debit_amount`) as expence, SUM(`credit_amount`) as payment FROM `tbl_transections` WHERE store_id=" +
          store +
          " AND DATE(date) = CURDATE()"
      );
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    orders.length > 0 ? (orders = orders[0].status_count) : (orders = 0);
    ordersdeliver.length > 0
      ? (ordersdeliver = ordersdeliver[0].status_count)
      : (ordersdeliver = 0);

    orderstotalseal.length > 0
      ? orderstotalseal[0].totalsale === null
        ? (orderstotalseal = 0)
        : (orderstotalseal = orderstotalseal[0].totalsale)
      : (orderstotalseal = 0);
    orderspayment.length > 0
      ? orderspayment[0].payment === null
        ? (totalpay = 0)
        : (totalpay = orderspayment[0].payment)
      : (totalpay = 0);
    orderspayment.length > 0
      ? orderspayment[0].expence === null
        ? (expence = 0)
        : (expence = orderspayment[0].expence)
      : (expence = 0);

    res.render("daily_report", {
      accessdata,
      date: new Date(),
      storeList,
      store,
      orders,
      ordersdeliver,
      orderstotalseal,
      totalpay,
      expence,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

// store and date change
router.post("/report", auth, async (req, res) => {
  try {
    const { date, store } = req.body;

    // var orders = await DataFind(`SELECT COUNT(*) as status_count FROM tbl_order WHERE store_id=${store} AND DATE(order_date) = DATE(${date})`)
    var orders = await DataFind(
      `SELECT COUNT(*) as status_count FROM tbl_order WHERE store_id='${store}' AND DATE(order_date) = '${date}' `
    );
    // var ordersdeliver = await DataFind("SELECT COUNT(*) as status_count FROM tbl_order WHERE store_id="+store+" AND order_status=4 AND DATE(stutus_change_date) = "+date+" ")
    var ordersdeliver = await DataFind(
      `SELECT COUNT(*) as status_count FROM tbl_order WHERE store_id='${store}' AND order_status=4 AND DATE(stutus_change_date) = '${date}' `
    );

    var orderstotalseal = await DataFind(
      `SELECT SUM(gross_total) as totalsale FROM tbl_order WHERE store_id='${store}' AND DATE(order_date) = '${date}' `
    );
    // var orderspayment = await DataFind("SELECT SUM(`debit_amount`) as expence, SUM(`credit_amount`) as payment FROM `tbl_transections` WHERE store_id="+store+" AND DATE(date) = "+date+" ")
    var orderspayment = await DataFind(
      `SELECT SUM(debit_amount) as expence, SUM(credit_amount) as payment FROM tbl_transections WHERE store_id='${store}' AND DATE(date) = '${date}' `
    );

    orderstotalseal[0].totalsale === null
      ? (orderstotalseal = 0)
      : (orderstotalseal = orderstotalseal[0].totalsale);
    orderspayment[0].payment === null
      ? (totalpay = 0)
      : (totalpay = orderspayment[0].payment);
    orderspayment[0].expence === null
      ? (expence = 0)
      : (expence = orderspayment[0].expence);

    res.status(200).json({
      date,
      store,
      orders: orders[0].status_count,
      ordersdeliver: ordersdeliver[0].status_count,
      orderstotalseal,
      totalpay,
      expence,
    });
  } catch (error) {
    console.log(error);
  }
});

//>>>>>>>>>>Orders Reports<<<<<<<<<<<<<
router.get("/order", auth, async (req, res) => {
  try {
    const { id, roll, store } = req.user;
    const accessdata = await access(req.user);

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].rollType == 'master' &&  rolldetail[0].reports.includes("read")) {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        var storeList = await DataFind(
          "SELECT * FROM tbl_store WHERE status=1"
        );
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                 tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id  `;
      } else {
         var storeID = await DataFind(`SELECT * FROM tbl_admin WHERE  id= ${id}`)

        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
               tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id=${storeID[0].store_ID}`;
      }
    } else if (rolldetail[0].rollType == 'store' &&  rolldetail[0].reports.includes("read")) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
            tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
            tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id=${store}`;
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    var storeList = await DataFind("SELECT * FROM tbl_store WHERE status=1");
    const orderdata = await DataFind(qury);

    const Ordersatus = await DataFind("SELECT * FROM tbl_orderstatus");

    res.render("order_report", {
      accessdata,
      storeList,
      store,
      Ordersatus,
      orderdata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/export-order/:id", auth, async (req, res) => {
  try {
    const startdate = req.params.id.split("+")[0];
    const store = req.params.id.split("+")[1];
    const enddate = req.params.id.split("+")[2];

    if (startdate && enddate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
        tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
        tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id=${store} AND order_date >= '${startdate}' AND order_date <=  '${enddate}'`;
    } else if (enddate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
        tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
        tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id=${store} AND order_date <=  '${enddate}'`;
    } else if (startdate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
        tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
        tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id=${store} AND order_date >= '${startdate}'`;
    } else {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
        tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
        tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id=${store}`;
    }

    const data = await DataFind(qury);

    console.log(222222222);

    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet("orderreport");

    worksheet.columns = [
      { header: "Order Date", key: "order_date", width: 35 },
      { header: "Order ID", key: "order_id", width: 35 },
      { header: "Customer Name", key: "custoname", width: 40 },
      { header: "Order Amount", key: "gross_total", width: 35 },
      { header: "Status", key: "status", width: 30 },
    ];

    data.forEach(function (row) {
      worksheet.addRow(row);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "orderreport.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end;
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/orderreports", auth, async (req, res) => {
  try {
    const { startdate, store, enddate, status } = req.body;

    const status_qury = `SELECT * FROM tbl_orderstatus where tbl_orderstatus.status='${status}'`;
    const status_id = await DataFind(status_qury);
    // console.log("status_id" , status_id[0].id);

    if (status == "0") {
      if (startdate && enddate) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_date >= '${startdate}' AND order_date <=  '${enddate}'`;
      } else if (enddate) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_date <=  '${enddate}'`;
      } else if (startdate) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_date >= '${startdate}' `;
      } else if (status) {
        // AND order_status = '${status_id[0].id}'
        // var qury = `SELECT * FROM tbl_order where order_status = '${status_id[0].id}'`
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}'`;
      } else {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}'`;
      }
    } else {
      if (startdate && enddate) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_date >= '${startdate}' AND order_date <=  '${enddate}' AND order_status = '${status_id[0].id}'`;
      } else if (enddate) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_date <=  '${enddate}' AND order_status = '${status_id[0].id}'`;
      } else if (startdate) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_date >= '${startdate}' AND order_status = '${status_id[0].id}'`;
      } else if (status) {
        // AND order_status = '${status_id[0].id}'
        // var qury = `SELECT * FROM tbl_order where order_status = '${status_id[0].id}'`
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_status = '${status_id[0].id}' AND order_status = '${status_id[0].id}'`;
      } else {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_order.gross_total,tbl_customer.name as custoname,
                tbl_orderstatus.status FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join tbl_orderstatus on
                tbl_order.order_status=tbl_orderstatus.id where tbl_order.store_id='${store}' AND order_status = '${status_id[0].id}'`;
      }
    }

    const orderdata = await DataFind(qury);

    res.status(200).json({ startdate, store, enddate, orderdata });
  } catch (error) {
    console.log(error);
  }
});

// >>>>>>> Sales Reports <<<<<<<
router.get("/sales", auth, async (req, res) => {
  try {
    const { id, roll, store } = req.user;
    const accessdata = await access(req.user);

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].rollType == 'master' && rolldetail[0].reports.includes("read")) {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
                FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id`;
      } else {
         var storeID = await DataFind(`SELECT * FROM tbl_admin WHERE  id= ${id}`)

        var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
                FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${storeID[0].store_ID}`;
      }
    } else if (rolldetail[0].rollType == 'store' && rolldetail[0].reports.includes("read")) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
            FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store}`;
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    var storeList = await DataFind("SELECT * FROM tbl_store WHERE status=1");
    const salesdata = await DataFind(qury);
     
    const Ordersatus = await DataFind("SELECT * FROM tbl_orderstatus ");

    res.render("Sales_report", {
      accessdata,
      storeList,
      store,
      Ordersatus,
      salesdata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/salesreports", auth, async (req, res) => {
  try {
    const { startdate, store, enddate } = req.body;
    if (startdate && enddate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
            FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store} AND order_date >= '${startdate}' AND order_date <=  '${enddate}'`;
    } else if (enddate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
            FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store} AND order_date <=  '${enddate}'`;
    } else if (startdate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
            FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store} AND order_date >= '${startdate}'`;
    } else {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
            FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store}`;
    }

    const salesdata = await DataFind(qury);

    res.status(200).json({ startdate, store, enddate, salesdata });
  } catch (error) {
    console.log(error);
  }
});

router.get("/export-sales/:id", auth, async (req, res) => {
  try {
    const startdate = req.params.id.split("+")[0];
    const store = req.params.id.split("+")[1];
    const enddate = req.params.id.split("+")[2];

    if (startdate && enddate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
        FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store} AND order_date >= '${startdate}' AND order_date <=  '${enddate}'`;
    } else if (enddate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
        FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store} AND order_date <=  '${enddate}'`;
    } else if (startdate) {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
        FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store} AND order_date >= '${startdate}'`;
    } else {
      var qury = `SELECT tbl_order.id,tbl_order.order_date,tbl_order.order_id,tbl_customer.name as custoname,sub_total,addon_price,extra_discount,coupon_discount,tax_amount,tbl_order.gross_total
        FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id where tbl_order.store_id=${store}`;
    }

    const data = await DataFind(qury);

    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet("orderreport");

    worksheet.columns = [
      { header: "Order Date", key: "order_date", width: 35 },
      { header: "Order ID", key: "order_id", width: 35 },
      { header: "Customer Name", key: "custoname", width: 40 },
      { header: "Sub Total", key: "sub_total", width: 35 },
      { header: "Addon Total", key: "addon_price", width: 35 },
      { header: "Extra Discount", key: "extra_discount", width: 35 },
      { header: "Coupon Discount", key: "coupon_discount", width: 35 },
      { header: "Tax Amount", key: "tax_amount", width: 35 },
      { header: "Order Amount", key: "gross_total", width: 35 },
    ];

    data.forEach(function (row) {
      worksheet.addRow(row);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "orderreport.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end;
    });
  } catch (error) {
    console.log(error);
  }
});

// >>>>>> Expence report >>>>>>>>>>>>>>
router.get("/expence", auth, async (req, res) => {
  try {
    const { id, roll, store } = req.user;
    const accessdata = await access(req.user);

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if ( rolldetail[0].rollType == 'master' &&  rolldetail[0].reports.includes("read")) {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id`;
      } else {
        
        var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store}`;
      }
    } else if ( rolldetail[0].rollType == 'store' && rolldetail[0].reports.includes("read")) {
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store}`;
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    var storeList = await DataFind("SELECT * FROM tbl_store WHERE status=1");
    const Expencedata = await DataFind(qury);
    const Ordersatus = await DataFind("SELECT * FROM tbl_orderstatus ");

    res.render("Expence_report", {
      accessdata,
      storeList,
      store,
      Ordersatus,
      Expencedata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/expencereport", auth, async (req, res) => {
  try {
    const { startdate, store, enddate } = req.body;
    if (startdate && enddate) {
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}' AND tbl_expense.date <=  '${enddate}'`;
    } else if (enddate) {
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store} AND tbl_expense.date <=  '${enddate}'`;
    } else if (startdate) {
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}'`;
    } else {
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store}`;
    }

    const expencedata = await DataFind(qury);

    res.status(200).json({ startdate, store, enddate, expencedata });
  } catch (error) {
    console.log(error);
  }
});

router.get("/export-expence/:id", auth, async (req, res) => {
  try {
    const startdate = req.params.id.split("+")[0];
    const store = req.params.id.split("+")[1];
    const enddate = req.params.id.split("+")[2];
    if (startdate && enddate) {
      console.log(11111111);
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
        join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}' AND tbl_expense.date <=  '${enddate}'`;
    } else if (enddate) {
      console.log(2222222);
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
        join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store} AND tbl_expense.date <=  '${enddate}'`;
    } else if (startdate) {
      console.log(33333);
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
        join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}'`;
    } else {
      console.log(44444);
      var qury = `SELECT tbl_expense.id,tbl_expense.date,tbl_exp_cat.cat_name,tbl_expense.amount,tbl_expense.taxpercent,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount ,tbl_account.ac_name FROM tbl_expense
        join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id join tbl_account on tbl_expense.payment_mode=tbl_account.id where tbl_expense.store_ID=${store}`;
    }

    const data = await DataFind(qury);

    console.log(data);

    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet("orderreport");

    worksheet.columns = [
      { header: "Expence Date", key: "date", width: 35 },
      { header: "Towards", key: "cat_name", width: 35 },
      { header: "Expence Amount", key: "amount", width: 40 },
      { header: "Tax %", key: "taxpercent", width: 35 },
      { header: "Tax Amount", key: "taxamount", width: 35 },
      { header: "Payment Mode", key: "ac_name", width: 35 },
    ];

    data.forEach(function (row) {
      worksheet.addRow(row);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "orderreport.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end;
    });
  } catch (error) {
    console.log(error);
  }
});

//>>>>>>>>>> tax Reports<<<<<<<<<<<<<
router.get("/tax", auth, async (req, res) => {
  try {
    const { id, roll, store } = req.user;
    const accessdata = await access(req.user);

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].rollType == 'master' && rolldetail[0].reports.includes("read")) {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id`;
      } else {
         var storeID = await DataFind(`SELECT * FROM tbl_admin WHERE  id= ${id}`)

        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${storeID[0].store_ID}`;
      }
    } else if (rolldetail[0].rollType == 'store' && rolldetail[0].reports.includes("read")) {
      var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store}`;
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    var storeList = await DataFind("SELECT * FROM tbl_store WHERE status=1");
    const taxdata = await DataFind(qury);

    res.render("tax_report", {
      accessdata,
      storeList,
      store,
      taxdata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/export-tax/:id", auth, async (req, res) => {
  try {
    const startdate = req.params.id.split("+")[0];
    const store = req.params.id.split("+")[1];
    const enddate = req.params.id.split("+")[2];
    const filter = req.params.id.split("+")[3];

    if (filter == 0) {
      if (startdate && enddate) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}' AND tbl_expense.date <=  '${enddate}'`;
      } else if (enddate) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store} AND tbl_expense.date <=  '${enddate}'`;
      } else if (startdate) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}'`;
      } else {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
            join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store}`;
      }
    } else {
      if (startdate && enddate) {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
            tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
            tbl_order.store_id=${store} AND tbl_order.order_date >= '${startdate}' AND tbl_order.order_date <=  '${enddate}'`;
      } else if (enddate) {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
            tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
            tbl_order.store_id=${store} AND tbl_order.order_date <=  '${enddate}'`;
      } else if (startdate) {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
            tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
            tbl_order.store_id=${store} AND tbl_order.order_date >= '${startdate}'`;
      } else {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
            tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
            tbl_order.store_id=${store}`;
      }
    }

    const data = await DataFind(qury);

    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet("orderreport");

    worksheet.columns = [
      { header: "Date", key: "date", width: 35 },
      { header: "Particulars", key: "particulars", width: 35 },
      { header: "Before Tax", key: "befortax", width: 40 },
      { header: "Tax Amount", key: "taxamount:", width: 35 },
      { header: "Total Amount", key: "amount", width: 30 },
    ];

    data.forEach(function (row) {
      worksheet.addRow(row);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "orderreport.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end;
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/taxreport", auth, async (req, res) => {
  try {
    const { store, startdate, enddate, filter } = req.body;
    if (filter == 0) {
      if (startdate && enddate) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}' AND tbl_expense.date <=  '${enddate}'`;
      } else if (enddate) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store} AND tbl_expense.date <=  '${enddate}'`;
      } else if (startdate) {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store} AND tbl_expense.date >= '${startdate}'`;
      } else {
        var qury = `SELECT tbl_expense.date,tbl_exp_cat.cat_name as particulars,tbl_expense.amount,((tbl_expense.amount * tbl_expense.taxpercent)/100) as taxamount , ((tbl_expense.amount-(tbl_expense.amount * tbl_expense.taxpercent)/100)) as befortax FROM tbl_expense
                join tbl_exp_cat on tbl_expense.category=tbl_exp_cat.id where tbl_expense.store_ID=${store}`;
      }
    } else {
      if (startdate && enddate) {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
                tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
                tbl_order.store_id=${store} AND tbl_order.order_date >= '${startdate}' AND tbl_order.order_date <=  '${enddate}'`;
      } else if (enddate) {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
                tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
                tbl_order.store_id=${store} AND tbl_order.order_date <=  '${enddate}'`;
      } else if (startdate) {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
                tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
                tbl_order.store_id=${store} AND tbl_order.order_date >= '${startdate}'`;
      } else {
        var qury = `SELECT tbl_order.order_date as date,tbl_order.order_id as particulars,tbl_order.gross_total as amount,
                tbl_order.tax_amount as taxamount, (tbl_order.gross_total - tbl_order.tax_amount) as befortax FROM tbl_order  where 
                tbl_order.store_id=${store}`;
      }
    }

    const taxdata = await DataFind(qury);

    res.status(200).json({ store, startdate, enddate, filter, taxdata });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
