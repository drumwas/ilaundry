
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });



console.log("DEBUG: DB_HOST is:", process.env.DB_HOST);
console.log("DEBUG: config.env path resolve:", path.join(__dirname, '../config.env'));

var conn = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 100,
  charset: 'utf8mb4',
});

const mySqlQury = (qry) => {
  return new Promise((resolve, reject) => {
    conn.query(qry, (err, row) => {
      if (err) return reject(err);
      resolve(row)
    })
  })
}


module.exports = { conn, mySqlQury }