const { sql, poolAVLI } = require("../connectionHelper/db")

// Get UOM (Unit of Measure) list based on stockId or stockCode
const getUomCodesByStockId = async (stockId) => {
  try {
    console.log(`Attempting to fetch UOMCodes for StockId: ${stockId}`)

    const pool = await poolAVLI

    // Step 1: If stockId is 'all'
    // Return all UOM records from UOMs table
    if (stockId === "all") {
      const result = await pool.request().query(`
        SELECT DISTINCT
          u.Id,
          u.StockId,
          u.UOMCode,
          u.Description,
          u.Rate
        FROM [UOMs] u
        LEFT JOIN [Stocks] s ON u.StockId = s.Id
        ORDER BY u.UOMCode
      `)

      return result.recordset
    }

    // Step 2: If stockId looks like a StockCode (shorter than UIID length 36)
    // Search using StockCode from Stocks table
    if (stockId && stockId.length < 36) {
      const result = await pool
        .request()
        .input("stockCode", stockId)
        .query(`
          SELECT 
            u.Id,
            u.StockId,
            u.UOMCode,
            u.Description,
            u.Rate
          FROM [UOMs] u
          LEFT JOIN [Stocks] s ON u.StockId = s.Id
          WHERE s.StockCode = @stockCode
        `)

      if (result.recordset.length > 0) {
        return result.recordset
      }
    }

    // Step 3: Otherwise, treat stockId as UUID
    // Search using StockId directly
    const result = await pool
      .request()
      .input("stockId", sql.UniqueIdentifier, stockId)
      .query(`
        SELECT 
          u.Id,
          u.StockId,
          u.UOMCode,
          u.Description,
          u.Rate
        FROM [UOMs] u
        LEFT JOIN [Stocks] s ON u.StockId = s.Id
        WHERE u.StockId = @stockId
      `)

    if (result.recordset.length > 0) {
      console.log("UOMCodes found:", result.recordset)
    } else {
      console.log("No UOMCodes found for this StockId")

      // Step 4: Debugging: Show sample records from UOMs table
      const checkResult = await pool.request().query(`
          SELECT TOP 5 
            u.Id, 
            u.StockId, 
            u.UOMCode, 
            u.Description,
            u.Rate
          FROM [UOMs] u
          LEFT JOIN [Stocks] s ON u.StockId = s.Id
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
