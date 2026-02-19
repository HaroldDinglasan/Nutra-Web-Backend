const { pool } = require("mssql");
const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

//  Fetch the 3 fixed stock checkers from Users_Info table
// Names: Ryeanna Lois Campos, Regienel S. Regalado, Jazzlyn Villaruel
const getStockCheckersFromDB = async () => {
  try {
    const pool = await poolPurchaseRequest;

    // Fixed names of the 3 stock checkers
    const checkerNames = [
      "Ryeanna Lois Campos",
      "Regienel S. Regalado",
      "Jazzlyn Villaruel",
    ];

    // Query to fetch from Users_Info table
    const placeholders = checkerNames.map((_, i) => `@name${i}`).join(", ");
    let query = `
      SELECT fullName, outlookEmail 
      FROM Users_Info 
      WHERE fullName IN (${placeholders})
    `;

    const request = pool.request();
    checkerNames.forEach((name, i) => {
      request.input(`name${i}`, sql.NVarChar(255), name);
    });

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      console.warn("[v0] Stock checkers not found in Users_Info table");
      return [];
    }

    // Map results to recipient format
    const stockCheckers = result.recordset.map((user) => ({
      email: user.outlookEmail,
      name: user.fullName,
    }));

    console.log(`[v0] Fetched ${stockCheckers.length} stock checkers from database`);
    console.log("[v0] Stock checkers:", stockCheckers);

    return stockCheckers;
  } catch (error) {
    console.error("[v0] Error fetching stock checkers from database:", error);
    throw error;
  }
};

// GET PRF + STOCK DETAILS
const getPrfAndStockDetails = async (prfId, stockCode) => {
  const pool = await poolPurchaseRequest;

  const result = await pool.request()
    .input("prfId", sql.UniqueIdentifier, prfId)
    .input("stockCode", sql.NVarChar(50), stockCode)
    .query(`
      SELECT 
        p.prfNo,
        d.stockName
      FROM PRFTABLE p
      LEFT JOIN PRFTABLE_DETAILS d
        ON p.prfId = d.prfId
       AND d.stockCode = @stockCode
      WHERE p.prfId = @prfId
    `);

  return result.recordset[0];
};


// GET REQUESTOR EMAIL BY PRF
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

// CHECK IF ALREADY VERIFIED
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
const approveStock = async ({
  prfId,
  stockCode,
  stockName,
  notedBy,
  verifiedBy,
}) => {
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
  getPrfAndStockDetails 
};
