const { sql, poolAVLI } = require("../connectionHelper/db")

// Fetch UOMCodes by StockId
const getUomCodesByStockId = async (stockId) => {
  try {
    console.log(`Attempting to fetch UOMCodes for StockId: ${stockId}`)

    const pool = await poolAVLI
    const result = await pool
      .request()
      .input("stockId", sql.UniqueIdentifier, stockId)
      .query(`
        SELECT 
          Id,
          StockId,
          UOMCode
        FROM [AVLI].[dbo].[UOMs]
        WHERE StockId = @stockId
      `)

    console.log(`Query executed. Found ${result.recordset.length} UOMCodes for StockId: ${stockId}`)

    if (result.recordset.length > 0) {
      console.log("UOMCodes found:", result.recordset)
    } else {
      console.log("No UOMCodes found for this StockId")

      // direct query to see what's in the UOMs table
      const checkResult = await pool.request().query(`
          SELECT TOP 5 Id, StockId, UOMCode
          FROM [AVLI].[dbo].[UOMs]
        `)

      console.log("Sample UOMs records:", checkResult.recordset)
    }

    return result.recordset
  } catch (error) {
    console.error(`❌ Error fetching UOMCodes for StockId ${stockId}:`, error)
    throw error
  }
}

module.exports = { getUomCodesByStockId }
