const sql = require("mssql");
require("dotenv").config();  // Loads environment variables from .env file


// Database conifguration for PurchaseRequestDB (Registration)
const purchaseRequestConfig = {
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  server:process.env.DB_SERVER,
  database:process.env.DB_NAME_PURCHASE,
  options: {
    encrypt: false, // Set to true if using Azure
    trustServerCertificate: true,
  },
};

// Database configuration for AVLI (Employee Names)
const avliConfig = {
  user: process.env.DB_USER,          
  password: process.env.DB_PASSWORD,  
  server: process.env.DB_SERVER,      
  database: process.env.DB_NAME_AVLI,   
  options: {
    encrypt: false,                  
    trustServerCertificate: true, 
  },
};


const poolPurchaseRequest = new sql.ConnectionPool(purchaseRequestConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to PurchaseRequestDB");
    return pool;
  })
  .catch((err) => {
    console.error("❌ PurchaseRequestDB Connection Failed!", err);
  });




  const poolAVLI = new sql.ConnectionPool(avliConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to AVLI");
    return pool;
  })
  .catch((err) => {
    console.error("❌ AVLI Connection Failed!", err);
  });


module.exports = { sql, poolPurchaseRequest, poolAVLI };
