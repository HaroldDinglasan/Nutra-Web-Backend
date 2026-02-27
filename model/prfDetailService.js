const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Save multiple PRF details (bulk insert)
const savePRFDetails = async (prfDetailsArray) => {
  try {
    const pool = await poolPurchaseRequest

    // A table object for bulk insert to PRFTABLE_DETAILS
    const table = new sql.Table("PRFTABLE_DETAILS")

    // Set table structure (columns must match database)
    table.create = false
    table.columns.add("PrfId", sql.UniqueIdentifier, { nullable: false })
    table.columns.add("StockId", sql.UniqueIdentifier, { nullable: false })
    table.columns.add("StockCode", sql.VarChar(250), { nullable: false })
    table.columns.add("StockName", sql.VarChar(sql.MAX), { nullable: false })
    table.columns.add("UOM", sql.VarChar(100), { nullable: false })
    table.columns.add("QTY", sql.Decimal(10, 4), { nullable: false })
    table.columns.add("DateNeeded", sql.VarChar(250), { nullable: false })
    table.columns.add("Purpose", sql.VarChar(250), { nullable: false })
    table.columns.add("Description", sql.VarChar(250), { nullable: true })

    // Loop all PRF details and add them as rows
    prfDetailsArray.forEach((detail) => {
      console.log("Saving PRF details with PrfId:", detail.prfId)

      table.rows.add(
        detail.prfId,
        detail.stockId,
        detail.stockCode,
        detail.stockName,
        detail.uom,
        Number.parseFloat(detail.qty) || 0,
        detail.dateNeeded,
        detail.purpose,
        detail.description,
      )
    })

    // Execute bulk insert
    const request = pool.request()
    await request.bulk(table)

    return { message: "Data saved successfully!" }
  } catch (error) {
    throw error
  }
}

// Update PRF details (only allowed on the same day it was created)
const updatePrfDetails = async (prfId, updatedDetails) => {
  try {
    const pool = await poolPurchaseRequest
    
    // Step 1: Get PRF creatin date
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
    
    // Format PRF creation date (YYYY-MM-DD only)
    const prfDate = new Date(prfDateResult.recordset[0].prfDate)
    const prfDateFormatted = prfDate.toISOString().split('T')[0]
    
    // Get current date (YYYY-MM-DD)
    const currentDate = new Date().toISOString().split('T')[0]
    
    // ❌ If not same day, do not allow update
    if (currentDate !== prfDateFormatted) {
      return { 
        success: false, 
        message: "PRF can only update on the same day it was created" 
      }
    }

    // If same day, proceed to update each detail
    for (const detail of updatedDetails) {

      // Check if the detail already exists (based on prfId + stockCode)
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
        // If record exists -> UPDATE
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
        // If record does not exist -> INSERT new detail
        await pool
          .request()
          .input("prfId", prfId)
          .input("stockId", detail.stockId)
          .input("stockCode", detail.stockCode)
          .input("stockName", detail.stockName)
          .input("qty", detail.qty)
          .input("uom", detail.uom)
          .input("dateNeeded", detail.dateNeeded)
          .input("purpose", detail.purpose)
          .input("description", detail.description)
          .query(`
            INSERT INTO PRFTABLE_DETAILS 
            (PrfId, StockId, StockCode, StockName, QTY, UOM, DateNeeded, Purpose, Description)
            VALUES
            (@prfId, @stockId, @stockCode, @stockName, @qty, @uom, @dateNeeded, @purpose, @description)
          `)
      }
    }

    return { success: true, message: "PRF details updated successfully" }
  } catch (error) {
    console.error("Database error in updatePrfDetails:", error)
    throw new Error("Failed to update PRF details: " + error.message)
  }
}

module.exports = { savePRFDetails, updatePrfDetails }
