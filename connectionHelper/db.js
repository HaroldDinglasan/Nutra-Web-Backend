const sql = require("mssql");
require("dotenv").config();  // Loads environment variables from .env file

// Database configuration for PurchaseRequestDB (Registration)
const purchaseRequestConfig = {
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  server:process.env.DB_SERVER,
  database:process.env.DB_NAME_PURCHASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};


// Database configuration for (NTBI2 LIVE DATABASE CONFIG)
const ntbi2Config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME_NTBI2,
  options: {
    encrypt: false,
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

// Database configuration for APHI (Employee Names)
const aphiConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME_APHI,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};


// Existing Pools
const poolPurchaseRequest = new sql.ConnectionPool(purchaseRequestConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to PurchaseRequestDB");
    return pool;
  })
  .catch((err) => {
    console.error("❌ PurchaseRequestDB Connection Failed!", err);
  });

// (NTBI2 CONNECTION POOL)
const poolNTBI2 = new sql.ConnectionPool(ntbi2Config)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to NTBI2 (LIVE)");
    return pool;
  })
  .catch((err) => {
    console.error("❌ NTBI2 Connection Failed!", err);
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

const poolAPHI = new sql.ConnectionPool(aphiConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to APHI");
    return pool;
  })
  .catch((err) => {
    console.error("❌ APHI Connection Failed!", err);
  });


// ✅ EXPORT UPDATED
module.exports = {
  sql,
  poolPurchaseRequest,
  poolAVLI,
  poolNTBI2,
  poolAPHI
};