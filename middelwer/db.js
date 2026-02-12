
const express = require('express');
const mysql = require('mysql2');
require('dotenv').config({path:'config.env'});



var conn = mysql.createPool({
    host:process.env.DB_HOST,
     user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
      database:process.env.DB_NAME,
    connectionLimit : 100,
     charset: 'utf8mb4',
  });

  const mySqlQury =(qry)=>{
    return new Promise((resolve, reject)=>{
        conn.query(qry, (err, row)=>{
            if (err) return reject(err);
            resolve(row)
        })
    }) 
  } 


module.exports = {conn, mySqlQury}