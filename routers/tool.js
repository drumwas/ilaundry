const express = require("express");

const router = express.Router();
const auth = require("../middelwer/auth");
const { upload } = require("../middelwer/multer");
var timezones = require("timezones-list");
const access = require("../middelwer/access");
const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
var {
  DataDelete,
  DataUpdate,
  DataInsert,
  DataFind,
} = require("../middelwer/databaseQurey");

// <<<<<<<<<<roll >>>>>>>>>>>>>>>>>

router.get("/roll", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;

    const accessdata = await access(req.user);
    console.log("accessdata", accessdata);
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const multiy = await DataFind("SELECT type FROM tbl_master_shop");

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (
      rolldetail[0].rollType === "master" &&
      rolldetail[0].rollaccess.includes("read")
    ) {
      if (multiy[0].type == 1) {
        var ismulty = true;
        const storeList = await DataFind(
          "SELECT id,name FROM tbl_store WHERE status=1 AND delete_flage=0"
        );

        // const data = await DataFind(
        //   "SELECT tbl_roll.id, tbl_roll.roll, tbl_roll.delet_flage,tbl_roll.roll_status,tbl_store.name as store FROM tbl_roll join tbl_store on tbl_roll.store_ID=tbl_store.id WHERE tbl_roll.delet_flage=0"
        // );

        const data = await DataFind(`SELECT 
                                      tbl_roll.id, 
                                      tbl_roll.roll, 
                                      tbl_roll.delet_flage,
                                      tbl_roll.rollType,
                                      tbl_roll.roll_status
                                      FROM tbl_roll 
                                      WHERE tbl_roll.delet_flage = 0`);

        console.log("data", data);

        res.render("roll", {
          rollList: data,
          ismulty,
          storeList,
          accessdata,
          language: req.language_data,
          language_name: req.language_name,
        });
      } else {
        var ismulty = false;
        var storeID = await DataFind(
          `SELECT * FROM tbl_admin WHERE  id= ${id}`
        );

        const data = await DataFind(
          `SELECT tbl_roll.id, tbl_roll.roll, tbl_roll.roll_status, tbl_roll.delet_flage FROM tbl_roll  WHERE tbl_roll.delet_flage=0`
        );

        res.render("roll", {
          rollList: data,
          ismulty: false,
          storeList: [],
          accessdata,
          language: req.language_data,
          language_name: req.language_name,
        });
      }
    } else if (
      rolldetail[0].rollType === "store" &&
      rolldetail[0].rollaccess.includes("read")
    ) {
      var ismulty = false;
      var qury =
        "SELECT id, roll,rollType, delet_flage,roll_status FROM tbl_roll";
      const rollList = await DataFind(qury);
      res.render("roll", {
        rollList: rollList,
        ismulty,
        storeList: [],
        accessdata,
        language: req.language_data,
        language_name: req.language_name,
      });
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.post("/addroll", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].rollaccess.includes("write")) {
      var {
        name,
        orders,
        expense,
        service,
        reports,
        tools,
        mail,
        master,
        sms,
        staff,
        Pay_Out,
        customers,
        branch_n_store,
        pos,
        rollname,
        master_setting,
        couponname,
        accountname,
      } = req.body;
      var storeid = req.body.storeid;
      storeid ? storeid : (storeid = store);

      orders
        ? Array.isArray(orders)
          ? (orders = orders.join(","))
          : orders
        : (orders = "");
      branch_n_store
        ? Array.isArray(branch_n_store)
          ? (branch_n_store = branch_n_store.join(","))
          : branch_n_store
        : (branch_n_store = "");
      Pay_Out
        ? Array.isArray(Pay_Out)
          ? (Pay_Out = Pay_Out.join(","))
          : Pay_Out
        : (Pay_Out = "");
      master_setting
        ? Array.isArray(master_setting)
          ? (master_setting = master_setting.join(","))
          : master_setting
        : (master_setting = "");
      expense
        ? Array.isArray(expense)
          ? (expense = expense.join(","))
          : expense
        : (expense = "");
      service
        ? Array.isArray(service)
          ? (service = service.join(","))
          : service
        : (service = "");
      customers
        ? Array.isArray(customers)
          ? (customers = customers.join(","))
          : customers
        : (customers = "");
      reports
        ? Array.isArray(reports)
          ? (reports = reports.join(","))
          : reports
        : (reports = "");
      tools
        ? Array.isArray(tools)
          ? (tools = tools.join(","))
          : tools
        : (tools = "");
      mail
        ? Array.isArray(mail)
          ? (mail = mail.join(","))
          : mail
        : (mail = "");
      master
        ? Array.isArray(master)
          ? (master = master.join(","))
          : master
        : (master = "");
      sms ? (Array.isArray(sms) ? (sms = sms.join(",")) : sms) : (sms = "");
      staff
        ? Array.isArray(staff)
          ? (staff = staff.join(","))
          : staff
        : (staff = "");
      pos ? (Array.isArray(pos) ? (pos = pos.join(",")) : pos) : (pos = "");
      rollname
        ? Array.isArray(rollname)
          ? (rollname = rollname.join(","))
          : rollname
        : (rollname = "");
      couponname
        ? Array.isArray(couponname)
          ? (couponname = couponname.join(","))
          : couponname
        : (couponname = "");
      accountname
        ? Array.isArray(accountname)
          ? (accountname = accountname.join(","))
          : accountname
        : (accountname = "");

      //       var qury = `
      // INSERT INTO tbl_roll (
      //     roll,
      //     rollType,
      //     customers,
      //     orders,
      //     expense,
      //     service,
      //     reports,
      //     tools,
      //     mail,
      //     master,
      //     sms,
      //     staff,
      //     pos,
      //     rollaccess,
      //     account,
      //     coupon,
      //     branch_n_store,
      //     master_setting,
      //     Pay_Out,
      //     roll_status,
      //     delet_flage
      // ) VALUES (
      //     '${name}',
      //     '${name}',
      //     '${customers}',
      //     '${orders}',
      //     '${expense}',
      //     '${service}',
      //     '${reports}',
      //     '${tools}',
      //     '${mail}',
      //     '${master}',
      //     '${sms}',
      //     '${staff}',
      //     '${pos}',
      //     '${rollname}',
      //     '${accountname}',
      //     '${couponname}',
      //     '${branch_n_store}',
      //     '${master_setting}',
      //     '${Pay_Out}',
      //     '${"active"}',
      //     0
      // )`;

      // const newroll = await DataFind(qury);

      const newroll = await DataInsert(
        `tbl_roll`,
        `roll, rollType, customers,orders,  expense, service, reports, tools,  mail, master, sms, staff, pos, rollaccess, account, coupon, branch_n_store, master_setting, Pay_Out,roll_status,delet_flage`,
        `'${name}','${name}','${customers}','${orders}','${expense}','${service}','${reports}','${tools}','${mail}','${master}','${sms}','${staff}','${pos}','${rollname}','${accountname}','${couponname}','${branch_n_store}','${master_setting}','${Pay_Out}','${"active"}',0`,
        req.hostname,
        req.protocol
      );

      if (newroll == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "New Roll Added !");
      res.redirect("back");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/deletroll/:id", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

    if (rolldetail[0].rollaccess.includes("delete")) {
      var rollid = req.params.id;

      // const newroll = await DataFind(
      //   "DELETE FROM tbl_roll  WHERE id=" + rollid + " "
      // );

      if (
        (await DataDelete(
          `tbl_roll`,
          `id = '${rollid}'`,
          req.hostname,
          req.protocol
        )) == -1
      ) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "Roll Deleted  !!!");
      res.redirect("back");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/rolldetails/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const newroll = await DataFind(
      "SELECT * FROM tbl_roll WHERE id=" + id + " "
    );
    res.status(200).json({ rolldata: newroll[0] });
  } catch (error) {
    console.log(error);
  }
});

router.post("/updateroll/:id", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].rollaccess.includes("edit")) {
      const rollid = req.params.id;
      var {
        name_update,
        orders,
        expense,
        service,
        reports,
        tools,
        rollType,
        mail,
        master,
        customers,
        master_setting,
        sms,
        Pay_Out,
        branch_n_store,
        staff,
        pos,
        rollname,
        active,
        couponname,
        accountname,
      } = req.body;

      orders
        ? Array.isArray(orders)
          ? (orders = orders.join(","))
          : orders
        : (orders = "");
      Pay_Out
        ? Array.isArray(Pay_Out)
          ? (Pay_Out = Pay_Out.join(","))
          : Pay_Out
        : (Pay_Out = "");
      branch_n_store
        ? Array.isArray(branch_n_store)
          ? (branch_n_store = branch_n_store.join(","))
          : branch_n_store
        : (branch_n_store = "");
      master_setting
        ? Array.isArray(master_setting)
          ? (master_setting = master_setting.join(","))
          : master_setting
        : (master_setting = "");
      customers
        ? Array.isArray(customers)
          ? (customers = customers.join(","))
          : customers
        : (customers = "");
      expense
        ? Array.isArray(expense)
          ? (expense = expense.join(","))
          : expense
        : (expense = "");
      service
        ? Array.isArray(service)
          ? (service = service.join(","))
          : service
        : (service = "");
      reports
        ? Array.isArray(reports)
          ? (reports = reports.join(","))
          : reports
        : (reports = "");
      tools
        ? Array.isArray(tools)
          ? (tools = tools.join(","))
          : tools
        : (tools = "");
      mail
        ? Array.isArray(mail)
          ? (mail = mail.join(","))
          : mail
        : (mail = "");
      master
        ? Array.isArray(master)
          ? (master = master.join(","))
          : master
        : (master = "");
      sms ? (Array.isArray(sms) ? (sms = sms.join(",")) : sms) : (sms = "");
      staff
        ? Array.isArray(staff)
          ? (staff = staff.join(","))
          : staff
        : (staff = "");
      pos ? (Array.isArray(pos) ? (pos = pos.join(",")) : pos) : (pos = "");
      rollname
        ? Array.isArray(rollname)
          ? (rollname = rollname.join(","))
          : rollname
        : (rollname = "");
      couponname
        ? Array.isArray(couponname)
          ? (couponname = couponname.join(","))
          : couponname
        : (couponname = "");
      accountname
        ? Array.isArray(accountname)
          ? (accountname = accountname.join(","))
          : accountname
        : (accountname = "");

      // var qury = `UPDATE tbl_roll SET roll='${name_update}',orders='${orders}',expense='${expense}',customers='${customers}',service='${service}',master_setting='${master_setting}',reports='${reports}',
      //           tools='${tools}',mail='${mail}',master='${master}',sms='${sms}',staff='${staff}',pos='${pos}',Pay_Out='${Pay_Out}',rollType='${rollType}',rollaccess='${rollname}',
      //           account='${accountname}',coupon='${couponname}',branch_n_store='${branch_n_store}' WHERE id=${rollid}`;
      // const newroll = await DataFind(qury);

      const newroll = await DataUpdate(
        "tbl_roll",
        `roll='${name_update}', 
   orders='${orders}', 
   expense='${expense}', 
   customers='${customers}', 
   service='${service}', 
   master_setting='${master_setting}', 
   reports='${reports}', 
   tools='${tools}', 
   mail='${mail}', 
   master='${master}', 
   sms='${sms}', 
   staff='${staff}', 
   pos='${pos}', 
   Pay_Out='${Pay_Out}', 
   rollType='${rollType}', 
   rollaccess='${rollname}', 
   account='${accountname}', 
   coupon='${couponname}', 
   branch_n_store='${branch_n_store}'`,
        `id=${rollid}`,
        req.hostname,
        req.protocol
      );

      if (newroll === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "Roll Updated!");
      res.redirect("back");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/storesetting", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

    if (rolldetail[0].rollType === "master") {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        req.flash("error", "You Can Access This Data From Store List");
        return res.redirect(req.get("Referrer") || "/");
      } else {
        var storeID = await DataFind(
          `SELECT * FROM tbl_admin WHERE  id= ${id}`
        );

        storedata = await DataFind(
          "SELECT * FROM tbl_store WHERE id=" + storeID[0].store_ID + " "
        );
        update = true;
        console.log("storedata1", storedata);
      }
    } else if (
      rolldetail[0].rollType === "store" &&
      rolldetail[0].master.includes("read")
    ) {
      //   storedata = await DataFind(
      //     "SELECT * FROM tbl_store WHERE id=" + store + " AND status=1 "
      //   );
      console.log("store", store);

      storedata = await DataFind(`
                               SELECT 
                               tbl_store.*, 
                               tbl_customer.name AS customer_name
                               FROM tbl_store
                               LEFT JOIN tbl_customer ON tbl_customer.store_id = tbl_store.id
                               WHERE tbl_store.id = ${store} AND tbl_store.status = 1 LIMIT 1
                            `);
      console.log("storedata2", storedata);

      update = rolldetail[0].master.includes("edit");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    res.render("storeSetting", {
      storedata,
      update,
      accessdata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) { }
});

// branch update by store admin
router.post(
  "/updatesetting/:id",
  auth,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (process.env.DISABLE_DB_WRITE === 'true') {
        req.flash('error', 'For demo purpose we disabled crud operations!!');
        return res.redirect(req.get("Referrer") || "/");
      }
      const { id, roll, store, loginas } = req.user;
      if (loginas == 0) {
        req.flash("error", "Your Are Not Authorized For this");
        return res.redirect(req.get("Referrer") || "/");
      }
      const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
      if (rolldetail[0].master.includes("edit")) {
        const dataid = req.params.id;
        if (req.file) {
          const logo = req.file.filename;
          // const logoupdate = await DataFind(
          //   `UPDATE tbl_store SET logo='${logo}' WHERE id=${dataid}`
          // );

          const logoUpdate = await DataUpdate(
            "tbl_store",
            `logo='${logo}'`,
            `id=${dataid}`,
            req.hostname,
            req.protocol
          );

          if (logoUpdate === -1) {
            req.flash("errors", process.env.dataerror);
            return res.redirect("/validate");
          }
        }

        const {
          name,
          adminid,
          number,
          store_email,
          state,
          city,
          tax_number,
          username,
          password,
          commission,
          taxpercent,
          country,
          district,
          zip_code,
          address,
          walkincustome,
        } = req.body;

        const OldDadta = await DataFind(
          `SELECT * FROM tbl_store WHERE id=${dataid}`
        );
        let haspass = "";

        if (password.length > 0) {
          const salt = bcrypt.genSaltSync(10);
          haspass = bcrypt.hashSync(password, salt);
        } else {
          haspass = OldDadta[0].password;
        }

        // const dataupdate =
        //   await DataFind(`UPDATE tbl_store SET name='${name}', mobile_number='${number}', username='${username}', password='${haspass}', shop_commission=${commission},tax_percent=${taxpercent},country='${country}',state='${state}',
        //      city='${city}',district='${district}',zipcode='${zip_code}',store_email='${store_email}',store_tax_number='${tax_number}',address='${address}'
        //     WHERE id=${dataid}`);

        const storeUpdate = await DataUpdate(
          "tbl_store",
          `name='${name}', mobile_number='${number}', username='${username}', password='${haspass}', shop_commission=${commission}, tax_percent=${taxpercent}, country='${country}', state='${state}', city='${city}', district='${district}', zipcode='${zip_code}', store_email='${store_email}', store_tax_number='${tax_number}', address='${address}'`,
          `id=${dataid}`,
          req.hostname,
          req.protocol
        );

        if (storeUpdate === -1) {
          req.flash("errors", process.env.dataerror);
          return res.redirect("/validate");
        }

        if (walkincustome.length > 0) {
          //       const dataupdate = await DataFind(
          //         `UPDATE tbl_customer
          //  SET name = '${walkincustome}'
          //  WHERE store_ID = '${dataid}'`
          //       );

          const customerUpdate = await DataUpdate(
            "tbl_customer",
            `name='${walkincustome}'`,
            `store_ID='${dataid}'`,
            req.hostname,
            req.protocol
          );

          if (customerUpdate === -1) {
            req.flash("errors", process.env.dataerror);
            return res.redirect("/validate");
          }
        }

        // const adminupdate =
        //   await DataFind(`UPDATE tbl_admin SET name='${name}',number='${number}',
        //     username='${username}',password='${haspass}',email='${store_email}' WHERE id=${adminid}`);

        const adminUpdate = await DataUpdate(
          "tbl_admin",
          `name='${name}', number='${number}', username='${username}', password='${haspass}', email='${store_email}'`,
          `id=${adminid}`,
          req.hostname,
          req.protocol
        );

        if (adminUpdate === -1) {
          req.flash("errors", process.env.dataerror);
          return res.redirect("/validate");
        }

        req.flash("success", "Store Details Updated!");
        res.redirect("back");
      } else {
        req.flash("error", "Your Are Not Authorized For this");
        return res.redirect(req.get("Referrer") || "/");
      }
    } catch (error) {
      console.log(error);
    }
  }
);

// <<<< Branch shope list master only>>>>>>>
router.get("/storelist", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

    if (rolldetail[0].rollType === "master") {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        var storeList = await DataFind("SELECT * FROM tbl_store");
        res.render("storelist", {
          storeList,
          accessdata,
          language: req.language_data,
          language_name: req.language_name,
        });
      } else {
        req.flash("error", "Branch Store Note Availabal");
        return res.redirect(req.get("Referrer") || "/");
      }
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) { }
});

//  branch store data render page master only
router.get("/approvedshop/:id", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);

    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
                                      SELECT 
                                      sr.*, 
                                      r.roll_status, 
                                      r.rollType 
                                      FROM tbl_staff_roll sr
                                      JOIN tbl_roll r ON sr.main_roll_id = r.id
                                      WHERE sr.id = ${roll}
                                      `);
    if (rolldetail[0].rollType === "master") {
      var storedata = await DataFind(
        `SELECT * FROM tbl_store WHERE id = ${req.params.id}`
      );

      console.log("storedata", storedata);

      const rolldata = await DataFind(
        "select * from tbl_roll where delet_flage = 0 "
      );
      console.log("rolldata", rolldata);

      res.render("store_settings_bymaster", {
        rolldata,
        storedata,
        accessdata,
        language: req.language_data,
        language_name: req.language_name,
      });
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

// branch store setting data master only
router.post(
  "/branchdata/:id",
  auth,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (process.env.DISABLE_DB_WRITE === 'true') {
        req.flash('error', 'For demo purpose we disabled crud operations!!');
        return res.redirect(req.get("Referrer") || "/");
      }
      const { id, roll, store, loginas } = req.user;
      if (loginas == 0) {
        req.flash("error", "Your Are Not Authorized For this");
        return res.redirect(req.get("Referrer") || "/");
      }
      const rolldetail = await DataFind(`
                                          SELECT 
                                            sr.*, 
                                            r.roll_status, 
                                            r.rollType 
                                          FROM tbl_staff_roll sr
                                          JOIN tbl_roll r ON sr.main_roll_id = r.id
                                          WHERE sr.id = ${roll}
                                        `);
      if (rolldetail[0].rollType === "master") {
        var dataid = req.params.id;

        const {
          name,
          number,
          store_email,
          state,
          city,
          tax_number,
          username,
          password,
          commission,
          taxpercent,
          country,
          district,
          zip_code,
          address,
          status,
          roll,
        } = req.body;

        console.log("req.body", req.body);

        console.log(req.file);
        let storefind = await DataFind(
          `SELECT * FROM tbl_store WHERE id=${dataid}`
        );
        let imgFiled = storefind[0].logo;
        if (req.file) {
          imgFiled = req.file.filename;
        }

        let OldData = await DataFind(
          `SELECT * FROM tbl_store   WHERE id=${dataid}`
        );
        let haspass = "";
        if (password.length > 0) {
          const salt = bcrypt.genSaltSync(10);
          haspass = bcrypt.hashSync(password, salt);
        } else {
          haspass = OldData[0].password;
        }
        // const dataupdate =
        //   await DataFind(`UPDATE tbl_store SET name='${name}',mobile_number='${number}',username='${username}',
        //    password='${haspass}',shop_commission=${commission},tax_percent=${taxpercent},country='${country}',state='${state}',
        //    city='${city}',district='${district}',zipcode='${zip_code}',store_email='${store_email}',store_tax_number='${tax_number}',
        //    address='${address}', status=${status}, roll_ID=${roll},logo='${imgFiled}' WHERE id=${dataid}`);

        const storeUpdate = await DataUpdate(
          "tbl_store",
          `name='${name}', mobile_number='${number}', username='${username}', password='${haspass}', shop_commission=${commission}, tax_percent=${taxpercent}, country='${country}', state='${state}', city='${city}', district='${district}', zipcode='${zip_code}', store_email='${store_email}', store_tax_number='${tax_number}', address='${address}', status=${status}, roll_ID=${roll}, logo='${imgFiled}'`,
          `id=${dataid}`,
          req.hostname,
          req.protocol
        );
        if (storeUpdate === -1) {
          req.flash("errors", process.env.dataerror);
          return res.redirect("/validate");
        }

        const adminid = await DataFind(
          "SELECT admin_id FROM tbl_store WHERE id=" + dataid + ""
        );

        // const adminupdate =
        //   await DataFind(`UPDATE tbl_admin SET name='${name}',number='${number}',
        //    username='${username}',password='${haspass}',email='${store_email}' WHERE id=${adminid[0].admin_id}`);

        const adminUpdate = await DataUpdate(
          "tbl_admin",
          `name='${name}', number='${number}', username='${username}', password='${haspass}', email='${store_email}'`,
          `id=${adminid[0].admin_id}`,
          req.hostname,
          req.protocol
        );

        if (adminUpdate === -1) {
          req.flash("errors", process.env.dataerror);
          return res.redirect("/validate");
        }

        if (status == 1) {
          // const admndata = await DataFind(
          //   "UPDATE tbl_admin SET store_ID=" +
          //     dataid +
          //     " ,roll_id=" +
          //     roll +
          //     ",approved= 1 WHERE id=" +
          //     adminid[0].admin_id +
          //     ""
          // );

          const adminDataUpdate1 = await DataUpdate(
            "tbl_admin",
            `store_ID=${dataid}, roll_id=${roll}, approved=1`,
            `id=${adminid[0].admin_id}`,
            req.hostname,
            req.protocol
          );

          if (adminDataUpdate1 === -1) {
            req.flash("errors", process.env.dataerror);
            return res.redirect("/validate");
          }
        } else if (status == 2) {
          // const admndata = await DataFind(
          //   "UPDATE tbl_admin SET store_ID=" +
          //     dataid +
          //     " , approved= 2 WHERE id=" +
          //     adminid[0].admin_id +
          //     " OR store_ID=" +
          //     dataid +
          //     " "
          // );

          const adminDataUpdate2 = await DataUpdate(
            "tbl_admin",
            `store_ID=${dataid}, approved=2`,
            `id=${adminid[0].admin_id} OR store_ID=${dataid}`,
            req.hostname,
            req.protocol
          );

          if (adminDataUpdate2 === -1) {
            req.flash("errors", process.env.dataerror);
            return res.redirect("/validate");
          }
        }

        req.flash("success", "Store Details Updated!");
        res.redirect("/tool/storelist");
      } else {
        req.flash("error", "Your Are Not Authorized For this");
        return res.redirect(req.get("Referrer") || "/");
      }
    } catch (error) {
      console.log(error);
    }
  }
);

//add new shope by admin get master only
router.get("/addshop", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
  `);
    if (rolldetail[0].branch_n_store.includes("write")) {
      const rolldata = await DataFind(
        "select * from tbl_roll where delet_flage =0 "
      );
      res.render("shop_add_admin", {
        rolldata,
        accessdata,
        language: req.language_data,
        language_name: req.language_name,
      });
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

// add new shop by admin post router master only
router.post("/shopregister", auth, upload.single("logo"), async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].branch_n_store.includes("write")) {
      const {
        name,
        number,
        store_email,
        state,
        city,
        tax_number,
        username,
        password,
        commission,
        taxpercent,
        country,
        district,
        zip_code,
        address,
        roll: rollid,
        status,
        walkincustome,
      } = req.body;

      const checkname = await DataFind(
        "SELECT * FROM tbl_store WHERE name='" + name + "'"
      );
      if (checkname.length > 0) {
        req.flash("error", "This Store Name Alredy Register!!!!");
        return res.redirect(req.get("Referrer") || "/");
      }

      const checknumber = await DataFind(
        "SELECT * FROM tbl_store WHERE mobile_number='" + number + "'"
      );
      if (checknumber.length > 0) {
        req.flash("error", "This Number Alredy Register!!!!");
        return res.redirect(req.get("Referrer") || "/");
      }

      const checkusername = await DataFind(
        "SELECT * FROM tbl_store WHERE username='" + username + "'"
      );
      if (checkusername.length > 0) {
        req.flash("error", "This Username Alredy Register!!!!");
        return res.redirect(req.get("Referrer") || "/");
      }

      const checkstore_email = await DataFind(
        "SELECT * FROM tbl_store WHERE store_email='" + store_email + "'"
      );
      if (checkstore_email.length > 0) {
        req.flash("error", "This Email Alredy Register!!!!");
        return res.redirect(req.get("Referrer") || "/");
      }

      var logo = req.file.filename;
      const salt = bcrypt.genSaltSync(10);
      const hashpass = bcrypt.hashSync(password, salt);
      console.log(hashpass);

      // const admindata = await DataFind(
      //   "INSERT INTO tbl_admin (name,number,email,username,password,img) VALUE ('" +
      //     name +
      //     "','" +
      //     number +
      //     "','" +
      //     store_email +
      //     "','" +
      //     username +
      //     "','" +
      //     hashpass +
      //     "','" +
      //     logo +
      //     "')"
      // );

      const admindata = await DataInsert(
        `tbl_admin`,
        `name,number,email,username,password,img`,
        `'${name}','${number}','${store_email}','${username}','${hashpass}','${logo}'`,
        req.hostname,
        req.protocol
      );

      if (admindata == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      var newid = admindata.insertId;

      // const qury = `INSERT INTO tbl_store (name,logo,mobile_number,username,password,shop_commission,tax_percent,country,state,city,district,zipcode,store_email,store_tax_number,address,admin_id,status,roll_ID)
      //                   VALUE ('${name}','${logo}','${number}','${username}','${hashpass}',${commission},${taxpercent},'${country} ','${state}','${city}',' ${district}','${zip_code}','${store_email}',
      //                   '${tax_number}','${address} ',${newid},${status},${rollid})`;

      // const newstore = await DataFind(qury);

      const newstore = await DataInsert(
        `tbl_store`,
        `name,logo,mobile_number,username,password,shop_commission,tax_percent,country,state,city,district,zipcode,store_email,store_tax_number,address,admin_id,status,roll_ID`,
        `'${name}','${logo}','${number}','${username}','${hashpass}',${commission},${taxpercent},'${country} ','${state}','${city}',' ${district}','${zip_code}','${store_email}',
        '${tax_number}','${address} ',${newid},${status},${rollid}`,
        req.hostname,
        req.protocol
      );

      if (newstore == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      const RollFind = await DataFind(
        `SELECT * FROM tbl_roll WHERE id='${rollid}'`
      );

      //   const RollAdd =
      //     await DataFind(`INSERT INTO tbl_staff_roll (customers, orders, expense, service, reports, tools, mail,
      // master, sms, staff, pos, rollaccess, account, coupon,
      // branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff) VALUES ('${RollFind[0].customer}', '${RollFind[0].orders}', '${RollFind[0].expense}', '${RollFind[0].service}', '${RollFind[0].reports}', '${RollFind[0].tools}', '${RollFind[0].mail}',
      // '${RollFind[0].master}', '${RollFind[0].sms}', '${RollFind[0].staff}', '${RollFind[0].pos}', '${RollFind[0].rollaccess}', '${RollFind[0].account}', '${RollFind[0].coupon}',
      // '${RollFind[0].branch_n_store}', '${RollFind[0].master_setting}', '${RollFind[0].Pay_Out}','${RollFind[0].id}','${newid}','0')`);

      const RollAdd = await DataInsert(
        `tbl_staff_roll`,
        `customers, orders, expense, service, reports, tools, mail,master, sms, staff, pos, rollaccess, account, coupon,
                                         branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff`,
        `'${RollFind[0].customer}', '${RollFind[0].orders}', '${RollFind[0].expense}', '${RollFind[0].service}', '${RollFind[0].reports}', '${RollFind[0].tools}', '${RollFind[0].mail}','${RollFind[0].master}', '${RollFind[0].sms}', '${RollFind[0].staff}', '${RollFind[0].pos}', '${RollFind[0].rollaccess}', '${RollFind[0].account}', '${RollFind[0].coupon}','${RollFind[0].branch_n_store}', '${RollFind[0].master_setting}', '${RollFind[0].Pay_Out}','${RollFind[0].id}','${newid}','0'`,
        req.hostname,
        req.protocol
      );

      if (RollAdd == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      if (status == 1) {
        // const admndata = await DataFind("UPDATE tbl_admin SET store_ID=" +
        //     newstore.insertId +
        //     ",roll_id=" +
        //     RollAdd.insertId +
        //     ",approved= 1 WHERE id=" +
        //     newid +
        //     "");

        const adminUpdate1 = await DataUpdate(
          "tbl_admin",
          `store_ID=${newstore.insertId}, roll_id=${RollAdd.insertId}, approved=1`,
          `id=${newid}`,
          req.hostname,
          req.protocol
        );

        if (adminUpdate1 === -1) {
          req.flash("errors", process.env.dataerror);
          return res.redirect("/validate");
        }
      } else if (status == 2) {
        // const admndata = await DataFind(
        //   "UPDATE tbl_admin SET store_ID=" +
        //     newstore.insertId +
        //     " , approved= 2 WHERE id=" +
        //     newid +
        //     " OR store_ID=" +
        //     newstore.insertId +
        //     " "
        // );

        const adminUpdate2 = await DataUpdate(
          "tbl_admin",
          `store_ID=${newstore.insertId}, approved=2`,
          `id=${newid} OR store_ID=${newstore.insertId}`,
          req.hostname,
          req.protocol
        );

        if (adminUpdate2 === -1) {
          req.flash("errors", process.env.dataerror);
          return res.redirect("/validate");
        }
      }

      // const walkinCustomerInsert = await DataFind(`
      //                                   INSERT INTO tbl_customer (
      //                                     name, number, email, address, taxnumber,
      //                                     username, password, store_ID, reffstore, approved, delet_flage
      //                                   ) VALUES (
      //                                     '${
      //                                       walkincustome.length > 0
      //                                         ? walkincustome
      //                                         : "Walk In Customer"
      //                                     }', NULL, NULL, NULL, NULL,
      //                                     NULL, NULL, ${newstore.insertId}, ${
      //   newstore.insertId
      // }, "1", 0
      //                                   )
      //                                 `
      // );

      const walkinCustomerInsert = await DataInsert(
        `tbl_customer`,
        `name, number, email, address, taxnumber,username, password, store_ID, reffstore, approved, delet_flage`,
        `'${walkincustome.length > 0 ? walkincustome : "Walk In Customer"
        }', NULL, NULL, NULL, NULL, NULL, NULL, ${newstore.insertId}, ${newstore.insertId
        }, "1", 0`,
        req.hostname,
        req.protocol
      );

      if (walkinCustomerInsert == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "New Shop Resiter success fully !!!!");
      res.redirect("/tool/storelist");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

//<<<<<<<<<<<< Staff Router >>>>>>>>>>>>>>>>>
router.get("/staff", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);
    console.log(accessdata);
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    const rolldetail = await DataFind(`
  SELECT 
  sr.*, 
  r.roll_status, 
  r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}`);
    console.log(roll);
    console.log(loginas);

    //  console.log(rolldetail);

    if (
      rolldetail[0].rollType === "master" &&
      rolldetail[0].staff.includes("read")
    ) {
      const multiy = await DataFind("SELECT type FROM tbl_master_shop");
      if (multiy[0].type == 1) {
        var ismulty = true;

        // var staffdata = await DataFind(
        //   "SELECT tbl_admin.*, tbl_roll.roll, tbl_roll.rollType FROM tbl_admin JOIN tbl_roll ON tbl_admin.roll_id = tbl_roll.id WHERE tbl_admin.is_staff = 1 AND tbl_roll.rollType = 'master'"
        // );

        var staffdata =
          await DataFind(`SELECT tbl_admin.*, tbl_staff_roll.*,tbl_roll.rollType , tbl_admin.id
                                         FROM tbl_roll
                                         JOIN tbl_staff_roll ON tbl_staff_roll.main_roll_id = tbl_roll.id AND is_staff = '1' 
                                         JOIN tbl_admin ON tbl_staff_roll.id = tbl_admin.roll_id AND tbl_admin.is_staff = '1'
                                         WHERE tbl_roll.rollType = 'master'`);

        console.log("staffdata1", staffdata);

        var rolldata = await DataFind(
          "SELECT tbl_roll.* FROM tbl_roll  WHERE delet_flage=0 AND roll_status ='active' AND  tbl_roll.rollType ='master' "
        );
      } else {
        var ismulty = false;
        var staffFind = await DataFind(
          `SELECT * FROM tbl_admin WHERE id='${id}' `
        );
        var staffdata = await DataFind(
          "SELECT tbl_admin.*, tbl_store.name as store, tbl_roll.roll, tbl_roll.rollType , tbl_admin.id FROM tbl_admin JOIN tbl_store ON tbl_admin.store_ID=tbl_store.id JOIN tbl_roll ON tbl_admin.roll_id=tbl_roll.id WHERE tbl_admin.store_ID=" +
          staffFind[0].store_ID +
          " AND is_staff=1"
        );
        console.log("staffdata", staffdata);
        var rolldata = await DataFind(
          "SELECT tbl_roll.*  FROM tbl_roll  WHERE delet_flage=0 AND roll_status ='active' AND rollType ='store' "
        );
      }
    } else if (
      rolldetail[0].rollType === "store" &&
      rolldetail[0].staff.includes("read")
    ) {
      var ismulty = false;

      // var staffdata = await DataFind(`SELECT tbl_admin.*, tbl_store.name AS store, tbl_roll.roll , tbl_roll.rollType FROM tbl_admin
      //                                  JOIN tbl_store ON tbl_admin.store_ID = tbl_store.id
      //                                  JOIN tbl_roll ON tbl_admin.roll_id=tbl_roll.id
      //                                  WHERE tbl_admin.store_ID= ${store} AND tbl_admin.delet_flage=0 AND is_staff=1`);

      var staffdata = await DataFind(
        `SELECT tbl_admin.* , sr.* , r.roll , r.rollType , tbl_admin.id  FROM tbl_admin JOIN tbl_staff_roll AS sr ON tbl_admin.id = sr.staff_id JOIN tbl_roll AS r ON sr.main_roll_id = r.id  WHERE tbl_admin.store_ID= '${store}' AND tbl_admin.is_staff != '0' `
      );

      var rolldata = await DataFind(
        "SELECT  *  FROM tbl_roll  WHERE delet_flage=0 AND roll_status ='active' AND rollType ='store' "
      );
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }

    console.log("rolldata", rolldata);
    console.log("staffdata", staffdata);
    console.log("store", store);

    res.render("staff", {
      rolldata,
      staffdata,
      ismulty,
      accessdata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/deletstaff/:id", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

    if (rolldetail[0].staff.includes("delete")) {
      var dataid = req.params.id;

      // const newroll = await DataFind(
      //   "UPDATE tbl_admin SET delet_flage=1, approved=0 WHERE id=" +
      //     dataid +
      //     " "
      // );

      const newroll = await DataUpdate(
        "tbl_admin",
        "delet_flage = 1, approved = 0",
        `id = ${dataid}`,
        req.hostname,
        req.protocol
      );

      if (newroll === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "Staff Deleted  !!!");
      res.redirect("back");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.post("/addstaff", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    let { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

    if (rolldetail[0].staff.includes("write")) {
      var { name, number, email, username, password, roll_list, active } =
        req.body;
      active ? (active = 1) : (active = 0);

      const RollFind = await DataFind(
        `SELECT * FROM tbl_roll WHERE id = ${roll_list}`
      );

      if (RollFind[0].rollType === "master") {
        store = " ";
      }
      const salt = bcrypt.genSaltSync(10);
      const hashpass = bcrypt.hashSync(password, salt);

      // const newroll = await DataFind(
      //   `INSERT INTO tbl_admin (name,number,email,username,password,store_ID,roll_id,approved,is_staff) VALUE ('${name}','${number}','${email}','${username}','${hashpass}','${store}','${""}',${active},'1')`
      // );

      const newroll = await DataInsert(
        `tbl_admin`,
        `name,number,email,username,password,store_ID,roll_id,approved,is_staff`,
        `'${name}','${number}','${email}','${username}','${hashpass}','${store}','${""}',${active},'1'`,
        req.hostname,
        req.protocol
      );

      if (newroll == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      //   const RollAdd =
      //     await DataFind(`INSERT INTO tbl_staff_roll (customers, orders, expense, service, reports, tools, mail,
      //        master, sms, staff, pos, rollaccess, account, coupon,
      // branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff) VALUES ('${RollFind[0].customer}', '${RollFind[0].orders}', '${RollFind[0].expense}', '${RollFind[0].service}', '${RollFind[0].reports}', '${RollFind[0].tools}', '${RollFind[0].mail}',
      // '${RollFind[0].master}', '${RollFind[0].sms}', '${RollFind[0].staff}', '${RollFind[0].pos}', '${RollFind[0].rollaccess}', '${RollFind[0].account}', '${RollFind[0].coupon}',
      // '${RollFind[0].branch_n_store}', '${RollFind[0].master_setting}', '${RollFind[0].Pay_Out}','${RollFind[0].id}','${newroll.insertId}','1')`);

      const RollAdd = await DataInsert(
        `tbl_staff_roll`,
        `customers, orders, expense, service, reports, tools, mail,
           master, sms, staff, pos, rollaccess, account, coupon,
           branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff`,
        `'${RollFind[0].customer}', '${RollFind[0].orders}', '${RollFind[0].expense}', '${RollFind[0].service}', '${RollFind[0].reports}', '${RollFind[0].tools}', '${RollFind[0].mail}',
           '${RollFind[0].master}', '${RollFind[0].sms}', '${RollFind[0].staff}', '${RollFind[0].pos}', '${RollFind[0].rollaccess}', '${RollFind[0].account}', '${RollFind[0].coupon}','${RollFind[0].branch_n_store}', '${RollFind[0].master_setting}', '${RollFind[0].Pay_Out}','${RollFind[0].id}','${newroll.insertId}','1'`,
        req.hostname,
        req.protocol
      );

      if (RollAdd == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      //  const updateRoll = await DataFind(`
      //  UPDATE tbl_admin
      //  SET roll_id = '${RollAdd.insertId}'
      //  WHERE id = '${newroll.insertId}'
      //  `);

      const updateRoll = await DataUpdate(
        "tbl_admin",
        `roll_id = '${RollAdd.insertId}'`,
        `id = '${newroll.insertId}'`,
        req.hostname,
        req.protocol
      );

      if (updateRoll === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "New Staff Added !!!");
      res.redirect("back");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.post("/updatestaff/:id", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

    if (rolldetail[0].staff.includes("edit")) {
      var dataid = req.params.id;
      var {
        name_update,
        number_update,
        email_update,
        username_update,
        password_update,
        roll_list_update,
        active_update,
      } = req.body;

      console.log(req.body);

      active_update ? (active_update = 1) : (active_update = 0);

      let OldData = await DataFind(
        `SELECT * FROM tbl_admin WHERE id=${dataid}`
      );
      let haspass = "";

      if (password_update.length > 0) {
        const salt = bcrypt.genSaltSync(10);
        haspass = bcrypt.hashSync(password_update, salt);
      } else {
        haspass = OldData[0].password;
      }

      // const newroll = await DataFind(`UPDATE tbl_admin SET name='${name_update}',number='${number_update}',email='${email_update}',username='${username_update}',
      //           password='${haspass}',roll_id='${roll_list_update}',approved='${active_update}' WHERE id=${dataid}`);

      const newroll = await DataUpdate(
        "tbl_admin",
        `name='${name_update}', number='${number_update}', email='${email_update}', username='${username_update}',
   password='${haspass}', roll_id='${roll_list_update}', approved='${active_update}'`,
        `id=${dataid}`,
        req.hostname,
        req.protocol
      );

      if (newroll === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "Staff Updated !!!");
      res.redirect("back");
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/rolllist/:id", auth, async (req, res) => {
  try {
    const staffid = req.params.id;
    const storeid = await DataFind(
      "SELECT roll_id FROM tbl_admin WHERE id=" + staffid + ""
    );

    console.log(storeid);

    const rolllist = await DataFind(
      `SELECT tbl_roll.id, tbl_roll.roll ,tbl_roll.rollType FROM tbl_roll  WHERE delet_flage=0 AND roll_status='active' AND roll_id=${storeid[0].roll_id}`
    );

    res.status(200).json({ rolllist, storeid });
  } catch (error) {
    console.log(error);
  }
});

//<<<<<<<<<<<<<< master settings >>>>>>>>>>>>>>>>>>>>>
router.get("/setting", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);
    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (rolldetail[0].rollType === "master") {
      const masterstore = await DataFind(
        "SELECT * FROM tbl_master_shop where id=1"
      );
      const roll = await DataFind(
        "SELECT id, roll,rollType FROM tbl_roll WHERE rollType='master'"
      );

      const storeList = await DataFind(
        "SELECT * FROM tbl_store WHERE delete_flage='0' AND  status='1'"
      );
      console.log(masterstore);

      res.render("master_settings", {
        timezones,
        masterstore: masterstore[0],
        roll,
        storeList,
        accessdata,
        language: req.language_data,
        language_name: req.language_name,
      });
    } else {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
  } catch (error) {
    console.log(error);
  }
});

router.post(
  "/setmasterdata",
  auth,
  upload.fields([
    { name: "logo", axCount: 1 },
    { name: "favicon", axCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (process.env.DISABLE_DB_WRITE === 'true') {
        req.flash('error', 'For demo purpose we disabled crud operations!!');
        return res.redirect(req.get("Referrer") || "/");
      }
      const { id, roll, store, loginas } = req.user;

      if (loginas == 0) {
        req.flash("error", "Your Are Not Authorized For this");
        return res.redirect(req.get("Referrer") || "/");
      }

      const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);




      if (rolldetail[0].rollType === "master") {
        var {
          multy,
          custmor_selection,
          fromStore,
          store_approved,
          customer_approved,
          currency,
          Symbol_Placement,
          thousands_separator,
          timezone,
          storeroll,
          appname,
          onesignal_app_id,
          onesignal_api_key,
          twilio_sid,
          twilio_auth_token,
          twilio_phone_no,
          footer,
        } = req.body;

        console.log("req.body.fromStore", req.body.fromStore);

        multy ? (multy = multy) : (multy = 0);
        custmor_selection
          ? (custmor_selection = custmor_selection)
          : (custmor_selection = 0);
        store_approved
          ? (store_approved = store_approved)
          : (store_approved = 0);
        customer_approved
          ? (customer_approved = customer_approved)
          : (customer_approved = 0);
        Symbol_Placement
          ? (Symbol_Placement = Symbol_Placement)
          : (Symbol_Placement = 0);

        if (req.files.favicon) {
          console.log("favicon", req.files.favicon);

          // await DataFind(
          //   `UPDATE tbl_master_shop SET app_favicon='${req.files.favicon[0].filename}'`
          // );

          await DataQuery(
            "UPDATE tbl_master_shop SET app_favicon=? WHERE id=1",
            [req.files.favicon[0].filename]
          );
        }

        if (req.files.logo) {
          console.log("favicon", req.files.logo);

          // await DataFind(
          //   `UPDATE tbl_master_shop SET app_logo='${req.files.logo[0].filename}'`
          // );

          await DataQuery(
            "UPDATE tbl_master_shop SET app_logo=? WHERE id=1",
            [req.files.logo[0].filename]
          );
        }
        let isvalidmulty = await DataFind(`SELECT * FROM tbl_master_shop `);

        // await DataFind(`UPDATE tbl_master_shop SET type=${multy},customer_selection='${custmor_selection}',fromStore='${fromStore}',currency_symbol='${currency}', currency_placement=${Symbol_Placement},thousands_separator=${thousands_separator},
        // customer_autoapprove=${customer_approved},store_autoapprove=${store_approved},timezone='${timezone}',footer='${footer}',storeroll=${storeroll},app_name='${appname}',
        // onesignal_app_id='${onesignal_app_id}', onesignal_api_key='${onesignal_api_key}',twilio_sid='${twilio_sid}',twilio_auth_token='${twilio_auth_token}',twilio_phone_no='${twilio_phone_no}'`);

        let updateClause = [];
        let updateParams = [];

        updateClause.push('type=?'); updateParams.push(multy);
        updateClause.push('customer_selection=?'); updateParams.push(custmor_selection);
        updateClause.push('fromStore=?'); updateParams.push(fromStore);
        updateClause.push('currency_symbol=?'); updateParams.push(currency);
        updateClause.push('currency_placement=?'); updateParams.push(Symbol_Placement);
        updateClause.push('thousands_separator=?'); updateParams.push(thousands_separator);
        updateClause.push('customer_autoapprove=?'); updateParams.push(customer_approved);
        updateClause.push('store_autoapprove=?'); updateParams.push(store_approved);
        updateClause.push('timezone=?'); updateParams.push(timezone);
        updateClause.push('footer=?'); updateParams.push(footer);
        updateClause.push('storeroll=?'); updateParams.push(storeroll);
        updateClause.push('app_name=?'); updateParams.push(appname);

        if (onesignal_app_id !== '*****') { updateClause.push('onesignal_app_id=?'); updateParams.push(onesignal_app_id); }
        if (onesignal_api_key !== '*****') { updateClause.push('onesignal_api_key=?'); updateParams.push(onesignal_api_key); }
        if (twilio_sid !== '*****') { updateClause.push('twilio_sid=?'); updateParams.push(twilio_sid); }
        if (twilio_auth_token !== '*****') { updateClause.push('twilio_auth_token=?'); updateParams.push(twilio_auth_token); }
        if (twilio_phone_no !== '*****') { updateClause.push('twilio_phone_no=?'); updateParams.push(twilio_phone_no); }

        const sql = `UPDATE tbl_master_shop SET ${updateClause.join(', ')} WHERE id=1`;
        await DataQuery(sql, updateParams);

        console.log("isvalidmulty", isvalidmulty[0].type);
        console.log("isvalidmulty", isvalidmulty[0]);
        console.log("fromStore", fromStore);

        console.log("multy", multy);

        if (isvalidmulty[0].type != multy) {
          if (multy) {
            // var admintable = await DataFind(
            //   "UPDATE tbl_admin SET approved = 1 WHERE store_ID != '' AND approved=8"
            // );
            // var customertable = await DataFind(
            //   "UPDATE tbl_customer SET store_ID=reffstore, reffstore=''"
            // );
            // var admintable = await DataFind(
            //   "UPDATE tbl_admin SET is_staff=1 WHERE id=1"
            // );
            // var admintable = await DataFind(
            //   "UPDATE tbl_admin SET is_staff=0 WHERE id=2"
            // );
            // var admintable = await DataFind(
            //   `UPDATE tbl_admin SET store_ID='' WHERE id='${id}'`
            // );
            //  var admintable = await DataFind(
            //   `UPDATE tbl_admin SET store_ID='${fromStore}' WHERE store_ID=' ' AND is_staff='1'`
            // );

            const updateApprovedAdmins = await DataUpdate(
              "tbl_admin",
              "approved = 1",
              "store_ID != '' AND approved = 8",
              req.hostname,
              req.protocol
            );

            if (updateApprovedAdmins === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const updateApprovedAdminsstaff = await DataUpdate(
              "tbl_admin",
              "approved = 1",
              "store_ID = ' ' AND approved = 8",
              req.hostname,
              req.protocol
            );

            if (updateApprovedAdminsstaff === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const updateCustomerRef = await DataUpdate(
              "tbl_customer",
              "store_ID = reffstore, reffstore = ''",
              "1=1",
              req.hostname,
              req.protocol
            );

            if (updateCustomerRef === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const setAdminStaff1 = await DataUpdate(
              "tbl_admin",
              "is_staff = 1",
              "id = 1",
              req.hostname,
              req.protocol
            );

            if (setAdminStaff1 === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const setAdminStaff0 = await DataUpdate(
              "tbl_admin",
              "is_staff = 0",
              "id = 2",
              req.hostname,
              req.protocol
            );

            if (setAdminStaff0 === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const clearAdminStoreId = await DataUpdate(
              "tbl_admin",
              "store_ID = ''",
              `id = '${id}'`,
              req.hostname,
              req.protocol
            );

            if (clearAdminStoreId === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const assignStoreToAdmin = await DataUpdate(
              "tbl_admin",
              `store_ID = '${fromStore}'`,
              `store_ID = ' ' AND is_staff = '1'`,
              req.hostname,
              req.protocol
            );

            if (assignStoreToAdmin === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }
          } else {
            // var admintable = await DataFind(
            //   "UPDATE tbl_admin SET approved = 8 WHERE store_ID = '' AND approved=1"
            // );
            // var customertable = await DataFind(
            //   `UPDATE tbl_customer SET reffstore=store_ID, store_ID='${fromStore}'`
            // );
            // var admintable = await DataFind(
            //   "UPDATE tbl_admin SET is_staff=0 WHERE id=1"
            // );
            // var admintable = await DataFind(
            //   "UPDATE tbl_admin SET is_staff=1 WHERE id=2"
            // );
            // var admintable = await DataFind(
            //   `UPDATE tbl_admin SET store_ID='${fromStore}' WHERE id='${id}'`
            // );

            const updateApprovedAdmins = await DataUpdate(
              "tbl_admin",
              "approved = 8",
              `store_ID = '' AND approved = 1`,
              req.hostname,
              req.protocol
            );
            if (updateApprovedAdmins === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const updateCustomerStore = await DataUpdate(
              "tbl_customer",
              `reffstore = store_ID, store_ID = '${fromStore}'`,
              "1=1",
              req.hostname,
              req.protocol
            );
            if (updateCustomerStore === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const setAdmin1Staff0 = await DataUpdate(
              "tbl_admin",
              "is_staff = 0",
              "id = 1",
              req.hostname,
              req.protocol
            );
            if (setAdmin1Staff0 === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const setAdmin2Staff1 = await DataUpdate(
              "tbl_admin",
              "is_staff = 1",
              "id = 2",
              req.hostname,
              req.protocol
            );
            if (setAdmin2Staff1 === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }

            const setStoreIdForAdmin = await DataUpdate(
              "tbl_admin",
              `store_ID = '${fromStore}'`,
              `id = '${id}'`,
              req.hostname,
              req.protocol
            );
            if (setStoreIdForAdmin === -1) {
              req.flash("errors", process.env.dataerror);
              return res.redirect("/validate");
            }
          }
        } else if (
          isvalidmulty[0].type == "0" &&
          isvalidmulty[0].fromStore != fromStore
        ) {
          const updateCustomerStore = await DataUpdate(
            "tbl_customer",
            `store_ID = '${fromStore}'`,
            "1=1",
            req.hostname,
            req.protocol
          );
          console.log("updateCustomerStore", updateCustomerStore);

          if (updateCustomerStore === -1) {
            req.flash("errors", process.env.dataerror);
            return res.redirect("/validate");
          }

          const updateadminStore = await DataUpdate(
            "tbl_admin",
            `store_ID = '${fromStore}'`,
            `id = '${id}'`,
            req.hostname,
            req.protocol
          );
          console.log("updateadminStore", updateadminStore);

          if (updateadminStore === -1) {
            req.flash("errors", process.env.dataerror);
            return res.redirect("/validate");
          }
        }

        req.flash("success", "Master Setting Save Success Fully");
        res.redirect("back");
      } else {
        req.flash("error", "Your Are Not Authorized For this");
        return res.redirect(req.get("Referrer") || "/");
      }
    } catch (error) {
      console.log(error);
    }
  }
);

// <<<<<<<<<<<<<<<<<<< Email setting >>>>>>>>>>>>>>>>>>
router.get("/mail", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);
    console.log(accessdata);

    if (loginas == 0) {
      req.flash("error", "Your Are Not Authorized For this");
      return res.redirect(req.get("Referrer") || "/");
    }
    const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);
    if (accessdata.mutibranch == false || rolldetail[0].mail.includes("read")) {
      var data = await DataFind(
        "SELECT * FROM tbl_email WHERE store_id=" + store + ""
      );
      res.render("mailsetting", {
        accessdata,
        data,
        language: req.language_data,
        language_name: req.language_name,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.post("/mailsetting", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    const { host, port, username, password, frommail, status } = req.body;

    var data = await DataFind(
      "SELECT * FROM tbl_email WHERE store_id=" + store + ""
    );

    if (data.length > 0) {
      // await DataFind(
      //   `UPDATE tbl_email SET host='${host}',port='${port}',username='${username}',password='${password}',frommail='${frommail}',status='${status}' WHERE store_id=${store} `
      // );

      const updateEmailSettings = await DataUpdate(
        "tbl_email",
        `host='${host}', port='${port}', username='${username}', password='${password}', frommail='${frommail}', status='${status}'`,
        `store_id=${store}`,
        req.hostname,
        req.protocol
      );

      if (updateEmailSettings === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }
    } else {
      // await DataFind(
      //   `INSERT INTO tbl_email  (host,port,username,password,frommail,status, store_id) VALUE ('${host}','${port}','${username}','${password}','${frommail}','${status}',${store}) `
      // );

      const email = await DataInsert(
        `tbl_email`,
        `host,port,username,password,frommail,status, store_id`,
        `'${host}','${port}','${username}','${password}','${frommail}','${status}',${store}`,
        req.hostname,
        req.protocol
      );

      if (email == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }
    }

    req.flash("success", "Email Setting Save Success Fully");
    res.redirect("back");
  } catch (error) {
    console.log(error);
  }
});

router.post("/rollstatus/:id", auth, async (req, res) => {
  if (process.env.DISABLE_DB_WRITE === 'true') {
    req.flash('error', 'For demo purpose we disabled crud operations!!');
    return res.redirect(req.get("Referrer") || "/");
  }
  console.log("req.body", req.body.status);
  console.log("req.params.id", req.params.id);

  let status = req.body.status;
  console.log("status", status);

  // await DataFind(
  //   `UPDATE tbl_roll SET roll_status='${status}' WHERE id='${req.params.id}'`
  // );

  const updateRollStatus = await DataUpdate(
    "tbl_roll",
    `roll_status='${status}'`,
    `id='${req.params.id}'`,
    req.hostname,
    req.protocol
  );

  if (updateRollStatus === -1) {
    req.flash("errors", process.env.dataerror);
    return res.redirect("/validate");
  }
});

router.post("/storestatus/:id", auth, async (req, res) => {
  if (process.env.DISABLE_DB_WRITE === 'true') {
    req.flash('error', 'For demo purpose we disabled crud operations!!');
    return res.redirect(req.get("Referrer") || "/");
  }
  console.log("req.body", req.body.status);
  console.log("req.params.id", req.params.id);

  let status = req.body.status == "active" ? "1" : "0";

  // await DataFind(
  //   `UPDATE tbl_admin SET approved='${status}' WHERE store_ID = '${req.params.id}'`
  // );

  // await DataFind(
  //   `UPDATE tbl_store SET status='${status}' WHERE id='${req.params.id}'`
  // );

  const updateAdmin = await DataUpdate(
    "tbl_admin",
    `approved='${status}'`,
    `store_ID='${req.params.id}'`,
    req.hostname,
    req.protocol
  );

  if (updateAdmin === -1) {
    req.flash("errors", process.env.dataerror);
    return res.redirect("/validate");
  }

  const updateStore = await DataUpdate(
    "tbl_store",
    `status='${status}'`,
    `id='${req.params.id}'`,
    req.hostname,
    req.protocol
  );

  if (updateStore === -1) {
    req.flash("errors", process.env.dataerror);
    return res.redirect("/validate");
  }
});

router.post("/rollUp/:id", async (req, res) => {
  try {
    console.log("body", req.body);
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    var {
      rollType,
      orders,
      expense,
      service,
      reports,
      tools,
      mail,
      master,
      sms,
      staff,
      Pay_Out,
      customers,
      branch_n_store,
      pos,
      rollaccess,
      master_setting,
      coupon,
      account,
    } = req.body;
    // var storeid = req.body.storeid;
    // storeid ? storeid : (storeid = store);

    orders
      ? Array.isArray(orders)
        ? (orders = orders.join(","))
        : orders
      : (orders = "");
    branch_n_store
      ? Array.isArray(branch_n_store)
        ? (branch_n_store = branch_n_store.join(","))
        : branch_n_store
      : (branch_n_store = "");
    Pay_Out
      ? Array.isArray(Pay_Out)
        ? (Pay_Out = Pay_Out.join(","))
        : Pay_Out
      : (Pay_Out = "");
    master_setting
      ? Array.isArray(master_setting)
        ? (master_setting = master_setting.join(","))
        : master_setting
      : (master_setting = "");
    expense
      ? Array.isArray(expense)
        ? (expense = expense.join(","))
        : expense
      : (expense = "");
    service
      ? Array.isArray(service)
        ? (service = service.join(","))
        : service
      : (service = "");
    customers
      ? Array.isArray(customers)
        ? (customers = customers.join(","))
        : customers
      : (customers = "");
    reports
      ? Array.isArray(reports)
        ? (reports = reports.join(","))
        : reports
      : (reports = "");
    tools
      ? Array.isArray(tools)
        ? (tools = tools.join(","))
        : tools
      : (tools = "");
    mail ? (Array.isArray(mail) ? (mail = mail.join(",")) : mail) : (mail = "");
    master
      ? Array.isArray(master)
        ? (master = master.join(","))
        : master
      : (master = "");
    sms ? (Array.isArray(sms) ? (sms = sms.join(",")) : sms) : (sms = "");
    staff
      ? Array.isArray(staff)
        ? (staff = staff.join(","))
        : staff
      : (staff = "");
    pos ? (Array.isArray(pos) ? (pos = pos.join(",")) : pos) : (pos = "");
    rollaccess
      ? Array.isArray(rollaccess)
        ? (rollaccess = rollaccess.join(","))
        : rollaccess
      : (rollaccess = "");
    coupon
      ? Array.isArray(coupon)
        ? (coupon = coupon.join(","))
        : coupon
      : (coupon = "");
    account
      ? Array.isArray(account)
        ? (account = account.join(","))
        : account
      : (account = "");

    const findroll = await DataFind(
      `SELECT * FROM tbl_staff_roll WHERE id='${req.params.id}'`
    );
    console.log("findroll", findroll);
    console.log("req.body", req.body);

    if (findroll.length > 0) {
      //       var qury = `
      //     UPDATE tbl_staff_roll SET
      //     customers = '${customers}',
      //     orders = '${orders}',
      //     expense = '${expense}',
      //     service = '${service}',
      //     reports = '${reports}',
      //     tools = '${tools}',
      //     mail = '${mail}',
      //     master = '${master}',
      //     sms = '${sms}',
      //     staff = '${staff}',
      //     pos = '${pos}',
      //     rollaccess = '${rollaccess}',
      //     account = '${account}',
      //     coupon = '${coupon}',
      //     branch_n_store = '${branch_n_store}',
      //     master_setting = '${master_setting}',
      //     Pay_Out = '${Pay_Out}'
      //     WHERE id = '${req.params.id}'
      // `;

      //       const newroll = await DataFind(qury);

      const rollUpdateFields = `
  customers = '${customers}',
  orders = '${orders}',
  expense = '${expense}',
  service = '${service}',
  reports = '${reports}',
  tools = '${tools}',
  mail = '${mail}',
  master = '${master}',
  sms = '${sms}',
  staff = '${staff}',
  pos = '${pos}',
  rollaccess = '${rollaccess}',
  account = '${account}',
  coupon = '${coupon}',
  branch_n_store = '${branch_n_store}',
  master_setting = '${master_setting}',
  Pay_Out = '${Pay_Out}'
`;

      const newroll = await DataUpdate(
        "tbl_staff_roll",
        rollUpdateFields,
        `id = '${req.params.id}'`,
        req.hostname,
        req.protocol
      );

      if (newroll === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "Your Roll Updated !");
      res.redirect("back");
    } else {
      const findtype = await DataFind(
        `SELECT * FROM tbl_roll WHERE rollType='${rollType}'`
      );

      //   var qury = `INSERT INTO tbl_staff_roll (customers, orders, expense, service, reports, tools, mail,
      // master, sms, staff, pos, rollaccess, account, coupon,
      // branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff) VALUES ('${customers}', '${orders}', '${expense}', '${service}', '${reports}', '${tools}', '${mail}',
      // '${master}', '${sms}', '${staff}', '${pos}', '${rollaccess}', '${account}', '${coupon}',
      // '${branch_n_store}', '${master_setting}', '${Pay_Out}','${findtype[0].id}','${req.params.id}')`;

      // const newroll = await DataFind(qury);

      const newroll = await DataInsert(
        `tbl_staff_roll`,
        `customers, orders, expense, service, reports, tools, mail,
         master, sms, staff, pos, rollaccess, account, coupon,
         branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff`,
        `'${customers}', '${orders}', '${expense}', '${service}', '${reports}', '${tools}', '${mail}',
         '${master}', '${sms}', '${staff}', '${pos}', '${rollaccess}', '${account}', '${coupon}',
         '${branch_n_store}', '${master_setting}', '${Pay_Out}','${findtype[0].id}','${req.params.id}'`,
        req.hostname,
        req.protocol
      );

      if (newroll == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      // const insertdata = await DataFind(
      //   `UPDATE tbl_admin SET roll_id = '${newroll.insertId}' WHERE id='${req.params.id}' `
      // );

      const updateRollId = await DataUpdate(
        "tbl_admin",
        `roll_id = '${newroll.insertId}'`,
        `id = '${req.params.id}'`,
        req.hostname,
        req.protocol
      );

      if (updateRollId === -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

      req.flash("success", "New Roll Added !");
      res.redirect("back");
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/rolldetailstaff/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log("req.params.id", req.params.id);

    const newroll = await DataFind(
      "SELECT * FROM tbl_staff_roll WHERE id=" + id + " "
    );
    console.log(newroll);

    res.status(200).json({ rolldata: newroll[0] });
  } catch (error) {
    console.log(error);
  }
});

router.get("/staffroll/:id", auth, async (req, res) => {
  try {
    const staffid = req.params.id;
    const storeid = await DataFind(
      "SELECT roll_id FROM tbl_admin WHERE id=" + staffid + ""
    );

    console.log(storeid);

    const rolllist = await DataFind(
      `SELECT tbl_roll.id, tbl_roll.roll ,tbl_roll.rollType FROM tbl_roll  WHERE delet_flage=0 AND roll_status='active' AND roll_id=${storeid[0].roll_id}`
    );

    res.status(200).json({ rolllist, storeid });
  } catch (error) {
    console.log(error);
  }
});

router.post("/staffroll/:id", auth, async (req, res) => {
  try {
    console.log("req.body", req.body.status);
    console.log("req.params.id", req.params.id);

    let status = req.body.status === "active" ? "1" : "0";
    console.log(status);

    // await DataFind(
    //   `UPDATE tbl_admin SET approved='${status}' WHERE id='${req.params.id}'`
    // );

    const updateAdminStatus = await DataUpdate(
      "tbl_admin",
      `approved = '${status}'`,
      `id = '${req.params.id}'`,
      req.hostname,
      req.protocol
    );

    if (updateAdminStatus === -1) {
      req.flash("errors", process.env.dataerror);
      return res.redirect("/validate");
    }
  } catch (error) {
    console.log(error);
  }
});

router.post("/download", auth, async (req, res) => {
  const { transectionList } = req.body;

  const filename = `Transaction_Report-${Date.now()}.xlsx`;
  const sheetname = "Transactions";

  const xlsxdata = [
    ["Date", "Account", "Type", "Description", "Debit", "Credit", "Balance"],
  ];

  transectionList.forEach((pdata) => {
    const formattedDate = pdata.date
      ?.split("T")[0]
      ?.split("-")
      .reverse()
      .join("-");
    xlsxdata.push([
      formattedDate,
      pdata.ac_name,
      pdata.transec_type,
      pdata.transec_detail,
      pdata.debit_amount,
      pdata.credit_amount,
      pdata.balance_amount,
    ]);
  });

  const workbook = XLSX.utils.book_new();
  console.log("workbook", workbook);

  const worksheet = XLSX.utils.aoa_to_sheet(xlsxdata);
  console.log("worksheet", worksheet);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetname);
  // console.log("XLSX.utils.book_append_sheet(workbook, worksheet, sheetname)",XLSX.utils.book_append_sheet(workbook, worksheet, sheetname));

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  console.log("buffer", buffer);
  console.log("filename", filename);

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(buffer);
});

module.exports = router;
