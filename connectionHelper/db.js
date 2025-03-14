const sql = require("mssql");
require("dotenv").config();  // Loads environment variables from .env file

// Database connection configuration
const config = {
  user: process.env.DB_USER,          
  password: process.env.DB_PASSWORD,  
  server: process.env.DB_SERVER,      
  database: process.env.DB_NAME,     
  options: {
    encrypt: false,                   // Set to true if using Azure
    trustServerCertificate: true,      // Required for self-signed certificates
  },
};

// Create a connection pool
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed!", err);
  });

module.exports = { sql, poolPromise };
