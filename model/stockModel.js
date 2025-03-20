const { sql, poolAVLI } = require("../connectionHelper/db");


// Get Stocks (Stock Code, BaseUOM, and Stock Name)
const getStocks = async () => {
  try {
    const pool = await poolAVLI;
    const result = await pool
      .request()
      .query("SELECT StockCode, BaseUOM, StockName FROM Stocks"); // Fetch StockCode, BaseUOM, & StockName
    return result.recordset;
  } catch (error) {
    console.error("❌ Error fetching stocks:", error);
    throw error;
  }
};

module.exports = { getStocks };
