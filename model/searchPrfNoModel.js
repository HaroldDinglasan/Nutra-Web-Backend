const { poolPurchaseRequest } = require("../connectionHelper/db");

const searchPrfByNumber = async (prfNo) => {
  try {
    const pool = await poolPurchaseRequest;

    // Remove "No. " prefix if it exists
    let searchPrfNo = prfNo;
    if (prfNo.startsWith("No. ")) {
      searchPrfNo = prfNo.substring(4); // Remove the first 4 characters ("No. ")
    }

    console.log(`Searching for PRF with number: ${searchPrfNo}`);

    // First, get the PRF header information and prfId
    const headerResult = await pool
      .request()
      .input("prfNo", searchPrfNo)
      .query(`
        SELECT prfId, prfNo, prfDate, preparedBy, departmentId
        FROM PRFTABLE 
        WHERE prfNo = @prfNo
      `);

    console.log(`Header query result count: ${headerResult.recordset.length}`);

    if (headerResult.recordset.length === 0) {
      return { found: false, message: "PRF not found" };
    }

    const prfHeader = headerResult.recordset[0];
    const prfId = prfHeader.prfId;

    console.log(`Found PRF with ID: ${prfId}`);

    // Next, get the PRF details using the prfId
    const detailsResult = await pool
      .request()
      .input("prfId", prfId)
      .query(`
        SELECT 
          StockCode, 
          StockName, 
          QTY as quantity, 
          UOM as unit, 
          DateNeeded as dateNeeded, 
          Purpose as purpose,
          Description as description
        FROM PRFTABLE_DETAILS 
        WHERE PrfId = @prfId
      `);

    console.log(`Details query result count: ${detailsResult.recordset.length}`);

    // Return both the header and details information
    return {
      found: true,
      header: prfHeader,
      details: detailsResult.recordset
    };
  } catch (error) {
    console.error("Database error in searchPrfByNumber:", error);
    throw new Error("Failed to search PRF: " + error.message);
  }
};

module.exports = { searchPrfByNumber };