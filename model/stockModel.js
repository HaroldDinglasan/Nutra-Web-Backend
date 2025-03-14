const { sql, poolPromise } = require("../connectionHelper/db");


// Get Stocks (Stock Code and Stock Name)
const getStocks = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT StockCode, StockName FROM Stocks"); // Fetch StockCode & StockName
    return result.recordset;
  } catch (error) {
    console.error("❌ Error fetching stocks:", error);
    throw error;
  }
};

module.exports = { getStocks };
