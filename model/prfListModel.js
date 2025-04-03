const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

// Fetch PRF List with StockName from PRFTABLE_DETAILS
const getPrfList = async () => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .query(`
        SELECT 
          p.prfId, 
          p.prfNo, 
          p.preparedBy, 
          p.prfDate, 
          d.StockName
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId -- Ensuring the join is based on prfId
        GROUP BY p.prfId, p.prfNo, p.preparedBy, p.prfDate, d.StockName
        ORDER BY p.prfDate DESC
      `);

    return result.recordset;
  } catch (error) {
    console.error("❌ Error fetching PRF List:", error);
    throw error;
  }
};

module.exports = { getPrfList };
