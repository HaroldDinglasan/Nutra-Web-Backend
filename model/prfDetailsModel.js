const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

const savePRFDetails = async (prfDetailsArray) => {
  try {
    const pool = await poolPurchaseRequest
    const table = new sql.Table("PRFTABLE_DETAILS")

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

    const request = pool.request()
    await request.bulk(table)

    return { message: "Data saved successfully!" }
  } catch (error) {
    throw error
  }
}

const updatePrfDetails = async (prfId, updatedDetails) => {
  try {
    const pool = await poolPurchaseRequest
    
    // Chinecheck kung yung prf mauupdate based sa pag create ng date
    // Dahil mauupdate mo lang yung prf within the day
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

    // Kapag same day ginawa ang prf, proceed sa update
    // Update bawat details
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
