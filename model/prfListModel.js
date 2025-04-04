const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

// Fetch PRF List with StockName, QTY, and UOM from PRFTABLE_DETAILS
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
          d.StockName,
          d.QTY as quantity,
          d.UOM as unit
        FROM PRFTABLE p
        LEFT OUTER JOIN PRFTABLE_DETAILS d ON p.prfId = d.PrfId -- Ensuring the join is based on prfId
        GROUP BY p.prfId, p.prfNo, p.preparedBy, p.prfDate, d.StockName, d.QTY, d.UOM
        ORDER BY p.prfDate DESC
      `);

    return result.recordset;
  } catch (error) {
    console.error("❌ Error fetching PRF List:", error);
    throw error;
  }
};

module.exports = { getPrfList };