const { sql, poolAVLI } = require("../connectionHelper/db")

// Get Stocks (Id, Stock Code, BaseUOM, and Stock Name)
const getStocks = async () => {
  try {
    const pool = await poolAVLI
    // query to include Id field
    const result = await pool.request().query("SELECT Id, StockCode, BaseUOM, StockName FROM Stocks")

    console.log(`Fetched ${result.recordset.length} stocks with Id field`)

    // sample record to verify Id is included
    if (result.recordset.length > 0) {
      console.log("Sample stock record:", result.recordset[0])
    }

    return result.recordset
  } catch (error) {
    console.error("❌ Error fetching stocks:", error)
    throw error
  }
}

module.exports = { getStocks }
