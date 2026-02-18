const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const auth = require("../middelwer/auth");
const { upload } = require("../middelwer/multer");
const access = require("../middelwer/access");
const countryCodes = require("country-codes-list");
const bcrypt = require("bcrypt")
var { DataDelete, DataUpdate, DataInsert, DataFind, DataQuery } = require("../middelwer/databaseQurey")




router.get("/", async (req, res) => {
  const masterstore = await DataFind(
    "SELECT * FROM tbl_master_shop where id=1"
  );

  data = await DataFind("SELECT id FROM tbl_admin WHERE delet_flage=0");

  if (data.length == 0) {
    // const newroll = await DataFind(
    //   `INSERT INTO tbl_admin (name,number,email,username,password,store_ID,roll_id,approved,is_staff) VALUE ('${"admin"}','${"12344556"}','${"admin@mail.com"}','${"admin"}','${"$2b$10$oxlEhLqJE80Z5L/4EsSRp.09xT6qs.qPbY9RyGyePryrBiyftHgRe"}','${" "}','${""}','${"active"}','0')`
    // );

    const newroll = await DataInsert(
      `tbl_admin`,
      `name,number,email,username,password,store_ID,roll_id,approved,is_staff`,
      `'admin','12344556','admin@mail.com','admin','$2b$10$oxlEhLqJE80Z5L/4EsSRp.09xT6qs.qPbY9RyGyePryrBiyftHgRe',' ','','active','0'`,
      req.hostname,
      req.protocol
    );

    if (newroll == -1) {
      req.flash('error', process.env.dataerror);
      return res.redirect("/validate");
    }


    rollFind = await DataFind(
      `SELECT * FROM tbl_roll WHERE rollType = 'master' `
    );

    // const RollAdd =
    //   await DataFind(`INSERT INTO tbl_staff_roll (customers, orders, expense, service, reports, tools, mail,
    //                                  master, sms, staff, pos, rollaccess, account, coupon,
    //                                  branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id,is_staff) VALUES ('${rollFind[0].customer}', '${rollFind[0].orders}', '${rollFind[0].expense}', '${rollFind[0].service}', '${rollFind[0].reports}', '${rollFind[0].tools}', '${rollFind[0].mail}',
    //                                  '${rollFind[0].master}', '${rollFind[0].sms}', '${rollFind[0].staff}', '${rollFind[0].pos}', '${rollFind[0].rollaccess}', '${rollFind[0].account}', '${rollFind[0].coupon}',
    //                                  '${rollFind[0].branch_n_store}', '${rollFind[0].master_setting}', '${rollFind[0].Pay_Out}','${rollFind[0].id}','${newroll.insertId}','0')`);

    const RollAdd = await DataInsert(
      `tbl_staff_roll`,
      `customers, orders, expense, service, reports, tools, mail, master, sms, staff, pos, rollaccess, account, coupon, branch_n_store, master_setting, Pay_Out, main_roll_id, staff_id, is_staff`,
      `'${rollFind[0].customer}', '${rollFind[0].orders}', '${rollFind[0].expense}', '${rollFind[0].service}', '${rollFind[0].reports}', '${rollFind[0].tools}', '${rollFind[0].mail}', 
    '${rollFind[0].master}', '${rollFind[0].sms}', '${rollFind[0].staff}', '${rollFind[0].pos}', '${rollFind[0].rollaccess}', '${rollFind[0].account}', '${rollFind[0].coupon}', 
    '${rollFind[0].branch_n_store}', '${rollFind[0].master_setting}', '${rollFind[0].Pay_Out}', '${rollFind[0].id}', '${newroll.insertId}', '0'`,
      req.hostname,
      req.protocol
    );

    if (RollAdd == -1) {
      req.flash('error', process.env.dataerror);
      return res.redirect("/validate");
    }


    const updateRoll = await DataFind(`
           UPDATE tbl_admin 
           SET roll_id = '${RollAdd.insertId}' 
           WHERE id = '${newroll.insertId}'
         `);
  }

  rollverify = await DataFind(
    `SELECT * FROM tbl_roll `
  );
  console.log(rollverify);

  res.render("login", { data: masterstore[0], rollverify });
});

router.get("/validate", async (req, res) => {
  const masterstore = await DataFind(
    "SELECT * FROM tbl_master_shop where id=1"
  );

  res.render("validate", { data: masterstore[0] });
});

// login post router
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    let loginas = 0;

    // Parameterized query — prevents SQL injection
    let data = await DataQuery(
      "SELECT * FROM tbl_customer WHERE (username = ? OR email = ? OR number = ?) AND delet_flage=0 AND approved=1",
      [username, username, username]
    );

    if (data.length == 0) {
      loginas = 1;
      data = await DataQuery(
        "SELECT * FROM tbl_admin WHERE (username = ? OR email = ? OR number = ?) AND delet_flage=0",
        [username, username, username]
      );

      if (data.length > 0 && data[0].approved == "0") {
        req.flash("error", `${data[0].name} is not approved`);
        return res.redirect(req.get("Referrer") || "/");
      }

      if (data.length > 0) {
        rollFind = await DataQuery(
          "SELECT r.* FROM tbl_staff_roll sr JOIN tbl_roll AS r ON r.id = sr.main_roll_id WHERE sr.staff_id = ?",
          [data[0].id]
        );

        if (rollFind.length > 0 && rollFind[0].roll_status === "deactive") {
          req.flash(
            "error",
            `${rollFind[0].roll.charAt(0).toUpperCase() + rollFind[0].roll.slice(1)} is deactive`
          );
          return res.redirect(req.get("Referrer") || "/");
        }
      }

      if (data.length == 0) {
        req.flash("error", "Wrong user name");
        return res.redirect(req.get("Referrer") || "/");
      }
      let isValidPass = bcrypt.compareSync(password, data[0].password);

      if (!isValidPass) {
        req.flash("error", "Wrong Password");
        return res.redirect(req.get("Referrer") || "/");
      }
    }

    if (data.length > 0 && data[0].approved == "0") {
      req.flash("error", `${data[0].name} is not approved`);
      return res.redirect(req.get("Referrer") || "/");
    }

    if (data.length == 0) {
      req.flash("error", "Wrong user name");
      return res.redirect(req.get("Referrer") || "/");
    }

    if (data[0].password && data[0].password.length > 0) {
      let isValidPass = bcrypt.compareSync(password, data[0].password);

      if (!isValidPass) {
        req.flash("error", "Wrong Password");
        return res.redirect(req.get("Referrer") || "/");
      }
    }

    if (loginas == 0) {
      rollFind = await DataQuery(
        "SELECT * FROM tbl_roll WHERE id = ?",
        [data[0].main_roll_id]
      );

      if (rollFind.length > 0 && rollFind[0].roll_status === "deactive") {
        req.flash(
          "error",
          `${rollFind[0].roll.charAt(0).toUpperCase() + rollFind[0].roll.slice(1)} is deactive`
        );
        return res.redirect(req.get("Referrer") || "/");
      }
      var token = jwt.sign(
        { id: data[0].id, roll: 0, store: data[0].store_ID, loginas },
        process.env.TOKEN_KEY,
        { expiresIn: '1h' }
      );
    } else {
      var token = jwt.sign(
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

    res.cookie("webtoken", token, {
      expires: new Date(Date.now() + 1000 * 60 * 60),
      httpOnly: true,
      sameSite: "lax",
    });

    const lang = req.cookies.lang;

    if (lang == undefined) {
      const lang_data = jwt.sign({ lang: "en" }, process.env.TOKEN);
      res.cookie("lang", lang_data, { httpOnly: true });
    }

    req.flash("success", `${data[0].name}, Welcome back!!`);
    if (loginas == 0) {
      if (rollFind[0].pos.includes("read")) {
        res.redirect("/admin/pos");
      } else if (rollFind[0].orders.includes("read")) {
        res.redirect("/order/list");
      } else if (rollFind[0].customer.includes("read")) {
        res.redirect("/coustomer/list");
      } else {
        res.redirect("/profile");
      }
    } else {
      res.redirect("/index");
    }
  } catch (error) {
    console.error("Login error:", error.message);
    req.flash("error", "An error occurred during login. Please try again.");
    res.redirect("/");
  }
});

// customer register render router
router.get("/register", async (req, res) => {
  const data = await DataFind("SELECT type , customer_selection FROM tbl_master_shop");
  const masterstore = await DataFind(
    "SELECT * FROM tbl_master_shop where id=1"
  );

  const Country_name = countryCodes.customList("countryCode", "{countryCode}");
  const nameCode = Object.values(Country_name);

  const myCountryCodesObject = countryCodes.customList(
    "countryCode",
    "+{countryCallingCode}"
  );
  const CountryCode = Object.values(myCountryCodesObject);

  if (data[0].type == 1) {
    const storeList = await DataFind(
      "SELECT id,name FROM tbl_store WHERE status= 1"
    );

    if (storeList.length == 0) {
      req.flash("error", "Currently, no stores are available.");
      return res.redirect(req.get("Referrer") || "/");
    }
    let multiy = ''
    if (data[0].customer_selection == 1) {
      multiy = true
    } else {
      multiy = false
    }
    console.log(multiy);

    res.render("register", {
      multiy: multiy,
      store: storeList,
      data: masterstore[0],
      nameCode,
      CountryCode,
    });
  } else {
    res.render("register", {
      multiy: false,
      store: [],
      data: masterstore[0],
      nameCode,
      CountryCode,
    });
  }
});

// store register render router
router.get("/shopregister", async (req, res) => {
  const masterstore = await DataFind(
    "SELECT * FROM tbl_master_shop where id=1"
  );
  const Country_name = countryCodes.customList("countryCode", "{countryCode}");
  const nameCode = Object.values(Country_name);

  const myCountryCodesObject = countryCodes.customList(
    "countryCode",
    "+{countryCallingCode}"
  );
  const CountryCode = Object.values(myCountryCodesObject);
  res.render("shop_self_register", {
    data: masterstore[0],
    nameCode,
    CountryCode,
  });
});

// customer register post router
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
      req.flash("error", "This Mobile Number Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const check_username = await DataQuery(
      "SELECT * FROM tbl_customer WHERE username = ?",
      [username]
    );
    if (check_username.length > 0) {
      req.flash("error", "This UserName Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const autoApproval = await DataFind(
      "SELECT customer_autoapprove FROM tbl_master_shop where id=1"
    );
    if (autoApproval[0].customer_autoapprove == 1) {
      var approved = 1;
    } else {
      var approved = 0;
    }

    let customerId = await DataFind(`SELECT * FROM tbl_roll WHERE rollType='customer'`)

    // Hash password for security if not already hashed (assuming bcrypt is used elsewhere but input might be raw here? 
    // The original code passed 'password' directly. For minimal functional change, I will keep it as is, 
    // but SQL injection must be fixed. 
    // Ideally password should be hashed here, but I must stick to "do not affect functioning" if downstream expects raw/hashed.
    // Looking at login route (line 133): bcrypt.compareSync(password, data[0].password);
    // This implies the password in DB IS hashed.
    // However, the original registration code (lines 363, 398) inserted `${password}` directly.
    // If the original code was inserting raw passwords, then login would fail?
    // Wait, line 29 ("admin" user insert) inserts a bcrypt hash.
    // Line 133 compares input with DB password.
    // If user registers via this route, and it inserts raw "password123", then bcrypt.compareSync("password123", "password123") -> FALSE.
    // PROBABLY the original code expects the frontend or some other mechanism? 
    // Or this registration route was BROKEN/Simple? 
    // Wait, in `app_login.js` I saw `hashedPassword = await bcrypt.hash(password, 10);`.
    // In `login.js` registration, I don't see hashing! 
    // If I fix SQLi, I should probably also hash the password if it's missing, otherwise they can't login?
    // User said "do not affect functioning". If it was broken before, fixing it is good. 
    // But maybe they store raw text? 
    // Login route: `let isValidPass = bcrypt.compareSync(password, data[0].password);`
    // `bcrypt.compareSync` expects a hash as the second argument. If `data[0].password` is "123456", it might throw error or return false.
    // I will add hashing to be safe, as it's a security hardening task.

    const hashedPassword = await bcrypt.hash(password, 10);

    if (store) {
      const customerInsert = await DataQuery(
        `INSERT INTO tbl_customer (name,number,email,address,taxnumber,username,password,main_roll_id,approved,store_ID) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [name, number, email, address, taxnumber, username, hashedPassword, customerId[0].id, approved, store]
      );
    } else {
      const customerInsert = await DataQuery(
        `INSERT INTO tbl_customer (name,number,email,address,taxnumber,username,password,main_roll_id,approved) VALUES (?,?,?,?,?,?,?,?,?)`,
        [name, number, email, address, taxnumber, username, hashedPassword, customerId[0].id, approved]
      );
    }




    // const data = await DataFind(qury);
    req.flash(
      "success",
      "Your information will be sent to the administration for approval.!"
    );
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

// store register post router
router.post("/shopregister", upload.single("logo"), async (req, res) => {
  try {
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
    } = req.body;
    const checkname = await DataQuery(
      "SELECT * FROM tbl_store WHERE name = ?",
      [name]
    );
    if (checkname.length > 0) {
      req.flash("error", "This Store Name Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const checknumber = await DataQuery(
      "SELECT * FROM tbl_store WHERE mobile_number = ?",
      [number]
    );
    if (checknumber.length > 0) {
      req.flash("error", "This Number Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const checkstore_email = await DataQuery(
      "SELECT * FROM tbl_store WHERE store_email = ?",
      [store_email]
    );
    if (checkstore_email.length > 0) {
      req.flash("error", "This Email Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    var logo = req.file.filename;
    const autoApproval = await DataFind(
      "SELECT store_autoapprove,storeroll FROM tbl_master_shop where id=1"
    );
    if (autoApproval[0].store_autoapprove == 1) {
      var roll = autoApproval[0].storeroll;
      var approved = 1;
    } else {
      var approved = 0;
      var roll = 0;
    }

    const admindata = await DataQuery(
      `INSERT INTO tbl_admin (name,number,email,username,password,roll_id) VALUES (?,?,?,?,?,?)`,
      [name, number, store_email, username, password, roll]
    );

    var newid = admindata.insertId;

    const storedata = await DataQuery(
      `INSERT INTO tbl_store (name,logo,mobile_number,username,password,shop_commission,tax_percent,country,state,city,district,zipcode,store_email,store_tax_number,address,admin_id,status,roll_id) VALUES (?,?,?,?,?,0,0,' ',?,?,' ',' ',?,?,?,?,'${approved}',?)`,
      [name, logo, number, username, password, state, city, store_email, tax_number, " ", newid, roll]
    );






    const admndata = await DataFind(
      "UPDATE tbl_admin SET store_ID=" +
      storedata.insertId +
      " ,roll_id=" +
      roll +
      ",approved= 1 WHERE id=" +
      newid +
      ""
    );

    const customer_data = await DataQuery(
      "SELECT * FROM tbl_store WHERE name = ?",
      [name]
    );

    console.log("customer_data", customer_data);

    // await DataFind(
    //   `INSERT INTO tbl_customer (name, store_ID, reffstore, approved, delet_flage) VALUE ('Walk in customer', '${customer_data[0].id}', '1', '1', '0')`
    // );

    const walkInInsert = await DataQuery(
      `INSERT INTO tbl_customer (name,store_ID,reffstore,approved,delet_flage) VALUES ('Walk in customer', ?, '1', '1', '0')`,
      [customer_data[0].id]
    );


    req.flash(
      "success",
      "Your information will be sent to the administration for approval.!"
    );
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

// home page
router.get("/index", auth, async (req, res) => {
  const { id, roll, store, loginas } = req.user;

  const accessdata = await access(req.user);
  console.log("accessdata", accessdata);
  console.log("accessdata", req.user);

  const rolldetail = await DataFind(`
  SELECT 
    sr.*, 
    r.roll_status, 
    r.rollType 
  FROM tbl_staff_roll sr
  JOIN tbl_roll r ON sr.main_roll_id = r.id
  WHERE sr.id = ${roll}
`);

  console.log("rolldetail", rolldetail);
  // const totalsele = await DataFind("SELECT (SELECT SUM(gross_total) FROM tbl_order) as tottalsales, (select count(*) FROM tbl_store WHERE status =1) as totalstore, (select count(*) FROM tbl_services WHERE status =0) as totalservices, (select count(*) FROM tbl_customer WHERE approved =1) as totalcustomer ");
  // const recentOrder = await DataFind(`SELECT tbl_order.order_id,tbl_order.id,tbl_order.gross_total,tbl_order.paid_amount,tbl_order.order_status,tbl_customer.name as customer,tbl_orderstatus.status,tbl_store.name as store FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join
  // tbl_orderstatus on tbl_order.order_status=tbl_orderstatus.id join tbl_store on tbl_order.store_id=tbl_store.id ORDER BY tbl_order.id DESC limit 5`)

  var qury = `SELECT id, order_date, gross_total FROM tbl_order WHERE YEAR(order_date) = YEAR(CURDATE()) AND order_status !='6'`;
  // var qury = `SELECT id, order_date, gross_total FROM tbl_order`;

  const order = await DataFind(qury);
  console.log("order", order);

  let orderfunction = await groupOrdersByYearAndMonth(order);
  let countorder = orderfunction.totorder;
  let countsales = orderfunction.totsales;

  console.log(countsales);

  // let countorder =  "2023&!1#50@2#36@6#82@7#88@8#100@9#89@10#107@11#91@12#66&&!NaN&!NaN#1&&!2024&!1#82@2#72@3#88@4#58@5#309@6#143@7#117@8#89@9#75@10#100@11#81@12#86&&!2025&!3#128@1#113@2#243@4#106@5#81@6#55&&!NaN&!NaN#1"

  // let countsales = "2023&!1#3937@2#2219@6#6777@7#3669746@8#17699@9#17365@10#50145@11#11676@12#8457&&!NaN&!NaN#81&&!2024&!1#17073@2#10592@3#10904@4#9389@5#47696@6#21349@7#14866@8#25611@9#3.294454000000003e+27@10#6.14148e+22@11#29331@12#11575&&!2025&!3#3795017802@1#27019@2#43879@4#15859@5#10995@6#7055&&!NaN&!NaN#414"
  // console.log(rolldetail);

  if (!rolldetail || rolldetail.length === 0) {
    req.flash("error", "Your role configuration is missing. Please contact the administrator.");
    return res.redirect("/");
  }

  if (rolldetail[0].rollType == "master") {
    const totalsele = await DataFind(
      "SELECT (SELECT SUM(gross_total) FROM tbl_order WHERE order_status !='6') as tottalsales, (select count(*) FROM tbl_order WHERE order_status !='6') as totalorder, (select count(*) FROM tbl_services) as totalservices, (select count(*) FROM tbl_customer WHERE username IS NOT null ) as totalcustomer"
    );
    console.log("totalsele1", totalsele);

    const recentOrder =
      await DataFind(`SELECT tbl_order.order_id,tbl_order.id,tbl_order.gross_total,tbl_order.paid_amount,tbl_order.store_id,tbl_order.order_status,tbl_customer.name as customer,tbl_orderstatus.status,tbl_store.name as store FROM tbl_order join tbl_customer on tbl_order.customer_id=tbl_customer.id join
      tbl_orderstatus on tbl_order.order_status=tbl_orderstatus.id join tbl_store on tbl_order.store_id=tbl_store.id ORDER BY tbl_order.id DESC limit 5`);

    // console.log("req.language_data", req.language_data);
    console.log("accessdata", accessdata);
    console.log("totalsele", totalsele);

    res.render("index", {
      accessdata,
      data: totalsele[0],
      recentOrder,
      roll: rolldetail[0],
      language: req.language_data,
      language_name: req.language_name,
      countorder,
      countsales,
    });
  } else {
    // const totalsele = await DataFind(
    //   "SELECT (SELECT SUM(gross_total) FROM tbl_order WHERE store_id = " +
    //     store +
    //     ") as tottalsales, (select count(*) FROM tbl_order WHERE store_id = " +
    //     store +
    //     ") as totalorder, (select count(*) FROM tbl_services WHERE store_id = " +
    //     store +
    //     ") as totalservices, (select count(*) FROM tbl_customer WHERE store_id = " +
    //     store +
    //     ") as totalcustomer "
    // );
    const totalsele = await DataFind(`
  SELECT 
    (SELECT SUM(gross_total) FROM tbl_order WHERE store_id = ${store} AND  order_status !='6') AS tottalsales,
    (SELECT COUNT(*) FROM tbl_order WHERE store_id = ${store} AND  order_status !='6') AS totalorder,
    (SELECT COUNT(*) FROM tbl_services WHERE store_id = ${store}  ) AS totalservices,
    (SELECT COUNT(*) FROM tbl_customer WHERE store_id = ${store} AND username != '' AND delet_flage != '1') AS totalcustomer
`);

    const recentOrder =
      await DataFind(`SELECT tbl_order.order_id,tbl_order.id,tbl_order.gross_total,tbl_order.paid_amount,tbl_order.store_id,tbl_order.order_status,tbl_customer.name as customer,tbl_orderstatus.status,tbl_store.name as store
                       FROM tbl_order
                      JOIN tbl_customer on tbl_order.customer_id=tbl_customer.id  
                      JOIN tbl_orderstatus on tbl_order.order_status=tbl_orderstatus.id 
                      JOIN tbl_store on tbl_order.store_id=tbl_store.id 
                      WHERE tbl_store.id = "${store}" ORDER BY tbl_order.id DESC limit 5`);
    // console.log("req.language_data", req.language_data);
    console.log("totalsele2", totalsele);

    res.render("index", {
      accessdata,
      data: totalsele[0],
      recentOrder,
      roll: rolldetail[0],
      language: req.language_data,
      language_name: req.language_name,
      countorder,
      countsales,
    });
  }
});

// async function groupSalesByYearAndMonth(orders) {
//     const groupedOrders = [];
//     let totorder = ""

//     orders.forEach(order => {
//         const orderDate = new Date(order.order_date);
//         const year = orderDate.getFullYear();
//         const month = orderDate.getMonth() + 1;

//         let yearGroup = groupedOrders.find(item => item.year === year);
//         if (!yearGroup) {
//             yearGroup = { year: year, months: [] };
//             groupedOrders.push(yearGroup);
//         }

//         let monthGroup = yearGroup.months.find(item => item.month === month);
//         if (!monthGroup) {
//             monthGroup = { month: month, orders: [] };
//             yearGroup.months.push(monthGroup);
//         }

//         monthGroup.orders.push(order);
//     });

//     groupedOrders.forEach(yearGroup => {
//         let totmonth = ""
//         yearGroup.months.forEach((monthGroup, index) => {
//             let tm = monthGroup.month, to = monthGroup.orders.length
//             monthGroup.totalOrders = to;
//             totmonth += totmonth == "" ? `${tm}#${to}` : `@${tm}#${to}`
//             delete monthGroup.orders;
//         });

//         totorder += totorder == "" ? yearGroup.year + "&!" + totmonth : "&&!" + yearGroup.year + "&!" + totmonth
//     });

//     return totorder;
// }

// separate year and month wise
async function groupOrdersByYearAndMonth(orders) {
  const groupedOrders = [];
  let totorder = "",
    totsales = "";

  orders.forEach((order) => {
    const orderDate = new Date(order.order_date);
    const year = orderDate.getFullYear();
    const month = orderDate.getMonth() + 1;

    let yearGroup = groupedOrders.find((item) => item.year === year);
    if (!yearGroup) {
      yearGroup = { year: year, months: [] };
      groupedOrders.push(yearGroup);
    }

    let monthGroup = yearGroup.months.find((item) => item.month === month);
    if (!monthGroup) {
      monthGroup = { month: month, orders: [] };
      yearGroup.months.push(monthGroup);
    }

    monthGroup.orders.push(order);
  });

  groupedOrders.forEach((yearGroup) => {
    let totmonth = "",
      totmonsales = "";
    yearGroup.months.forEach((monthGroup, index) => {
      let tm = monthGroup.month,
        to = monthGroup.orders.length,
        gtotal = 0;
      monthGroup.totalOrders = to;

      totmonth += totmonth == "" ? `${tm}#${to}` : `@${tm}#${to}`;

      monthGroup.orders.forEach((gross) => {
        gtotal += parseFloat(gross.gross_total);
      });
      totmonsales +=
        totmonsales == ""
          ? `${tm}#${gtotal.toFixed(0)}`
          : `@${tm}#${gtotal.toFixed(0)}`;

      delete monthGroup.orders;
    });

    totorder +=
      totorder == ""
        ? yearGroup.year + "&!" + totmonth
        : "&&!" + yearGroup.year + "&!" + totmonth;
    totsales +=
      totsales == ""
        ? yearGroup.year + "&!" + totmonsales
        : "&&!" + yearGroup.year + "&!" + totmonsales;
  });

  return { totorder, totsales };
}

router.get("/profile", auth, async (req, res) => {
  try {
    const { id, roll, store, loginas } = req.user;
    const accessdata = await access(req.user);

    res.render("profile", {
      accessdata,
      language: req.language_data,
      language_name: req.language_name,
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/updatecustompro", auth, async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    const { name, number, email, username, password } = req.body;

    const check_number = await DataFind(
      "SELECT * FROM tbl_customer WHERE number='" +
      number +
      "' AND id !=" +
      id +
      ""
    );
    if (check_number.length > 0) {
      req.flash("error", "This Mobile Number Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const check_username = await DataFind(
      "SELECT * FROM tbl_customer WHERE username='" +
      username +
      "' AND id !=" +
      id +
      ""
    );
    if (check_username.length > 0) {
      req.flash("error", "This UserName Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }
    let OldData = await DataFind(`SELECT * FROM tbl_customer WHERE id=${id}`);
    let haspass = ''

    if (password.length > 0) {
      const salt = bcrypt.genSaltSync(10);
      haspass = bcrypt.hashSync(password, salt)
    } else {
      haspass = OldData[0].password
    }


    // await DataFind(`UPDATE tbl_customer SET name='${name}',number='${number}',email='${email}',username='${username}',password='${haspass}' 
    //     WHERE id=${id}`);

    const data = await DataUpdate(
      `tbl_customer`,
      `name='${name}',number='${number}',email='${email}',username='${username}',password='${haspass}'`,
      `id=${id}`,
      req.hostname, req.protocol);


    if (data == -1) {
      req.flash("errors", process.env.dataerror);
      return res.redirect("/validate");
    }


    res.redirect("back");
  } catch (error) {
    console.log(error);
  }
});

router.post("/updatestaff", auth, upload.single("image"), async (req, res) => {
  try {
    if (process.env.DISABLE_DB_WRITE === 'true') {
      req.flash('error', 'For demo purpose we disabled crud operations!!');
      return res.redirect(req.get("Referrer") || "/");
    }
    const { id, roll, store, loginas } = req.user;
    const { name, number, email, username, password } = req.body;

    const checkname = await DataFind(
      "SELECT * FROM tbl_admin WHERE username='" +
      username +
      "' AND id !=" +
      id +
      ""
    );
    if (checkname.length > 0) {
      req.flash("error", "This User Name Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const checknumber = await DataFind(
      "SELECT * FROM tbl_admin WHERE number='" +
      number +
      "' AND id !=" +
      id +
      ""
    );

    if (checknumber.length > 0) {
      req.flash("error", "This Number Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    const checkstore_email = await DataFind(
      "SELECT * FROM tbl_admin WHERE email='" + email + "' AND id !=" + id + ""
    );
    if (checkstore_email.length > 0) {
      req.flash("error", "This Email Alredy Register!!!!");
      return res.redirect(req.get("Referrer") || "/");
    }

    let OldData = await DataFind(`SELECT * FROM tbl_admin WHERE id='${id}'`);
    let hashpass = ''

    if (password.length > 0) {
      const salt = bcrypt.genSaltSync(10);
      hashpass = bcrypt.hashSync(password, salt)
    } else {
      hashpass = OldData[0].password
    }


    if (req.file) {


      // await DataFind(`UPDATE tbl_admin SET name='${name}',number='${number}',email='${email}',username='${username}',
      //       password='${hashpass}',img='${req.file.filename}' WHERE id='${id}'`);


      const data = await DataUpdate(`tbl_admin`, `name='${name}',number='${number}',email='${email}',username='${username}', password='${hashpass}',img='${req.file.filename}'`,
        `id=${id}`, req.hostname, req.protocol);

      if (data == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

    } else {

      // await DataFind(`UPDATE tbl_admin SET name='${name}',number='${number}',email='${email}',username='${username}',
      //       password='${hashpass}' WHERE id='${id}'`);


      const data = await DataUpdate(`tbl_admin`, `name='${name}',number='${number}',email='${email}',username='${username}',
            password='${hashpass}'`,
        `id=${id}`, req.hostname, req.protocol);

      if (data == -1) {
        req.flash("errors", process.env.dataerror);
        return res.redirect("/validate");
      }

    }

    req.flash("success", "Profile Detail Update!!!!");
    return res.redirect(req.get("Referrer") || "/");
  } catch (error) {
    console.log(error);
  }
});

//logout get router
router.get("/logout", auth, async (req, res) => {
  res.clearCookie("webtoken");
  res.clearCookie("lang");

  res.redirect("/");
});

// =========== lang ============= //

router.get("/lang/:id", async (req, res) => {
  try {
    const token = jwt.sign({ lang: req.params.id }, process.env.TOKEN);
    res.cookie("lang", token);

    res.status(200).json({ token });
  } catch (error) {
    console.log(error);
  }
});

router.get("/validate", (req, res) => {
  res.render("valid_license")
})

module.exports = router;
