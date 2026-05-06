const getDbPool = require("../utils/getDbPool")

// Get Stocks (Id, Stock Code, BaseUOM, and Stock Name)
const getStocks = async (company) => {
  try {
    
    const pool = await getDbPool(company);

    const result = await pool
    .request()
    .query(
      `Select 
        Stocks.Id, 
        StockName, 
        StockCode, 
        BaseUOM 
        FROM Stocks
        WHERE IsActive = 1
      `);

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
