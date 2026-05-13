const { pool } = require("mssql");
const { sql, poolPurchaseRequest } = require("../connectionHelper/db");
const { sendIM07CorplanNotification } = require("../lib/email-service")

//  Fetch the 3 fixed stock checkers from Users_Info table
// Names: Ryeanna Lois Campos, Regienel S. Regalado, Jazzlyn Villaruel
const getStockCheckersFromDB = async (stockCode) => {
  try {

    // ✅ IM-02 MMD STOCK CODE CHECKER
    if (stockCode && stockCode.startsWith("IM-02")) {
      console.log(" IM-02 detected → routing to MMD");
      return [
        {
          name: "Fernan C. Mananguit",
          email: "Fernan.Mananguit@nutratech.com.ph"
        }
      ];
    }
    
    // Connect to PurchaseRequest database
    const pool = await poolPurchaseRequest;

    // Fixed names of the 3 stock checkers
    const checkerNames = [
      "Ryeanna Lois Campos",
      "Regienel S. Regalado",
      "Jazzlyn Villaruel",
    ];

    // Create SQL parameters dynamically
    const placeholders = checkerNames.map((_, i) => `@name${i}`).join(", ");

    // Get fullname and email from Users_Info table
    let query = `
      SELECT fullName, outlookEmail 
      FROM Users_Info 
      WHERE fullName IN (${placeholders})
    `;

    const request = pool.request();

    // Pass each name as SQL parameter (for security)
    checkerNames.forEach((name, i) => {
      request.input(`name${i}`, sql.NVarChar(255), name);
    });

    const result = await request.query(query);

    // If no checker found
    if (result.recordset.length === 0) {
      console.warn("[ Stock checkers not found in Users_Info table");
      return [];
    }

    // Convert result into simple object { email, name }
    const stockCheckers = result.recordset.map((user) => ({
      email: user.outlookEmail,
      name: user.fullName,
    }));

    console.log(` Fetched ${stockCheckers.length} stock checkers from database`);
    console.log(" Stock checkers:", stockCheckers);

    return stockCheckers;
  } catch (error) {
    console.error(" Error fetching stock checkers from database:", error);
    throw error;
  }
};

// GET PRF NUMBER AND STOCK NAME
const getPrfAndStockDetails = async (prfId, stockCode) => {
  const pool = await poolPurchaseRequest;

  const result = await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .input("stockCode", sql.NVarChar(50), stockCode)
    .query(`
      SELECT 
        p.prfNo,
        p.preparedBy,
        p.projectCode,
        d.stockCode,
        d.stockName
      FROM PRFTABLE p
      LEFT JOIN PRFTABLE_DETAILS d
        ON p.prfId = d.prfId
       AND d.stockCode = @stockCode
      WHERE p.prfId = @prfId
    `);

  return result.recordset[0];
};

// ✅ GET ALL STOCK ITEMS FOR A PRF (NEW)
const getAllStockItemsByPrfId = async (prfId) => {
  const pool = await poolPurchaseRequest;

  const result = await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .query(`
      SELECT stockCode, stockName
      FROM PRFTABLE_DETAILS
      WHERE prfId = @prfId
    `);

  return result.recordset;
};


// GET REQUESTOR NAME AND EMAIL BY PRF ID
const getRequestorByPrfId = async (prfId) => {
  const pool = await poolPurchaseRequest;

  const result = await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .query(`
      SELECT 
        p.preparedBy,
        u.outlookEmail
      FROM PRFTABLE p
      LEFT JOIN Users_Info u
        ON p.preparedBy = u.fullName
      WHERE p.prfId = @prfId
    `);

  return result.recordset[0];
};

// CHECK IF STOCK WAS ALREADY CHECKED
const isAlreadyChecked = async (prfId, stockCode) => {
  const pool = await poolPurchaseRequest;

  const result = await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .input("stockCode", sql.NVarChar(50), stockCode)
    .query(`
      SELECT COUNT(*) AS cnt
      FROM CGS_StockCheckLog
      WHERE prfId = @prfId
        AND stockCode = @stockCode
    `);

  return result.recordset[0].cnt > 0;
};

// GET LATEST CHECK RECORD (APPROVE OR REJECT)
const getLatestStockCheckByPrfId = async (prfId, stockCode) => {
  const pool = await poolPurchaseRequest;

  const result = await pool
    .request()
    .input("prfId", prfId)
    .input("stockCode", stockCode)
    .query(`
      SELECT TOP 1 verifiedBy, rejectionReason
      FROM CGS_StockCheckLog
      WHERE prfId = @prfId
        AND stockCode = @stockCode
      ORDER BY Id DESC
    `);

  return result.recordset[0] || null;
};

// APPROVE STOCK
const approveStock = async ({ prfId, stockCode, stockName, notedBy, verifiedBy,}) => {

  const pool = await poolPurchaseRequest;

  await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .input("stockCode", sql.NVarChar(50), stockCode)
    .input("stockName", sql.NVarChar(255), stockName)
    .input("notedBy", sql.NVarChar(100), notedBy)
    .input("verifiedBy", sql.NVarChar(100), verifiedBy)
    .query(`
      INSERT INTO CGS_StockCheckLog (
        prfId,
        stockCode,
        stockName,
        rejectionReason,
        notedBy,
        verifiedBy,
        isApprove
      )
      VALUES (
        @prfId,
        @stockCode,
        @stockName,
        NULL,
        @notedBy,
        @verifiedBy,
        1
      )
    `);

    // Notify Corplan if IM-07 stock code
    if (stockCode && stockCode.startsWith("IM-07")) {

      console.log(" IM-07 detected:", stockCode);

      const prfDetails = await getPrfAndStockDetails(prfId, stockCode);

      if (prfDetails) {

        await sendIM07CorplanNotification({
          prfNo: prfDetails.prfNo,
          preparedBy: prfDetails.preparedBy,
          stockCode: prfDetails.stockCode,
          stockName: prfDetails.stockName,
          projectCode: prfDetails.projectCode,
          company: process.env.COMPANY_NAME || "NutraTech"
        });

        console.log(" IM-07 notification sent to Corplan department");
      } else {
        console.warn(" No PRF details found for IM-07 notification");
      }
    }
};


// REJECT STOCK
const rejectStock = async ({ 
    prfId, 
    stockCode,
    stockName,
    notedBy,
    verifiedBy,  
    rejectionReason 
  }) => {

  const pool = await poolPurchaseRequest;

  await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .input("stockCode", sql.NVarChar(50), stockCode)
    .input("stockName", sql.NVarChar(255), stockName)
    .input("notedBy", sql.NVarChar(100), notedBy)
    .input("verifiedBy", sql.NVarChar(100), verifiedBy)
    .input("rejectionReason", sql.NVarChar(255), rejectionReason)
    .query(`
      INSERT INTO CGS_StockCheckLog (
        prfId, 
        stockCode, 
        stockName, 
        notedBy, 
        verifiedBy, 
        rejectionReason, 
        isReject
      )
      VALUES (
        @prfId, 
        @stockCode, 
        @stockName, 
        @notedBy,
        @verifiedBy, 
        @rejectionReason,  
        1
      )
    `);
};



module.exports = { 
  getStockCheckersFromDB, 
  getRequestorByPrfId, 
  isAlreadyChecked,
  getLatestStockCheckByPrfId, 
  approveStock, 
  rejectStock, 
  getPrfAndStockDetails,
  getAllStockItemsByPrfId
};
