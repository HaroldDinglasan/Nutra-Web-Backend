const { poolPurchaseRequest } = require("../connectionHelper/db")

const updatePrfDetails = async (prfId, updatedDetails) => {
  try {
    const pool = await poolPurchaseRequest
    
    // Check if the PRF can be updated based on creation date
    const prfDateResult = await pool
      .request()
      .input("prfId", prfId)
      .query(`
        SELECT prfDate
        FROM PRFTABLE 
        WHERE prfId = @prfId
      `)
    
    if (prfDateResult.recordset.length === 0) {
      return { success: false, message: "PRF not found" }
    }
    
    // Get PRF creation date and format it to YYYY-MM-DD
    const prfDate = new Date(prfDateResult.recordset[0].prfDate)
    const prfDateFormatted = prfDate.toISOString().split('T')[0]
    
    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0]
    
    // Check if current date is different from PRF creation date
    if (currentDate !== prfDateFormatted) {
      return { 
        success: false, 
        message: "PRF can only update on the same day it was created" 
      }
    }

    // If dates match, proceed with the update
    // Update each detail individually
    for (const detail of updatedDetails) {
      // Check if the record exists
      const checkResult = await pool
        .request()
        .input("prfId", prfId)
        .input("stockCode", detail.stockCode)
        .query(`
          SELECT COUNT(*) as count
          FROM PRFTABLE_DETAILS 
          WHERE PrfId = @prfId AND StockCode = @stockCode
        `)

      const recordExists = checkResult.recordset[0].count > 0

      if (recordExists) {
        // Update existing record
        await pool
          .request()
          .input("prfId", prfId)
          .input("stockCode", detail.stockCode)
          .input("stockName", detail.stockName)
          .input("qty", detail.qty)
          .input("uom", detail.uom)
          .input("dateNeeded", detail.dateNeeded)
          .input("purpose", detail.purpose)
          .input("description", detail.description)
          .query(`
            UPDATE PRFTABLE_DETAILS 
            SET 
              StockName = @stockName,
              QTY = @qty,
              UOM = @uom,
              DateNeeded = @dateNeeded,
              Purpose = @purpose,
              Description = @description
            WHERE PrfId = @prfId AND StockCode = @stockCode
          `)
      } else {
        // Insert new record
        await pool
          .request()
          .input("prfId", prfId)
          .input("stockCode", detail.stockCode)
          .input("stockName", detail.stockName)
          .input("qty", detail.qty)
          .input("uom", detail.uom)
          .input("dateNeeded", detail.dateNeeded)
          .input("purpose", detail.purpose)
          .input("description", detail.description)
          .query(`
            INSERT INTO PRFTABLE_DETAILS 
            (PrfId, StockCode, StockName, QTY, UOM, DateNeeded, Purpose, Description)
            VALUES
            (@prfId, @stockCode, @stockName, @qty, @uom, @dateNeeded, @purpose, @description)
          `)
      }
    }

    return { success: true, message: "PRF details updated successfully" }
  } catch (error) {
    console.error("Database error in updatePrfDetails:", error)
    throw new Error("Failed to update PRF details: " + error.message)
  }
}

module.exports = { updatePrfDetails }
