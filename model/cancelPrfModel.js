const { poolPurchaseRequest } = require("../connectionHelper/db");
const sql = require("mssql");

const cancelPrf = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest;

    // Cancel PRFTABLE
    await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        UPDATE PRFTABLE 
        SET isCancel = 1 
        WHERE prfId = @prfId
      `);

    // Cancel PRFTABLE_DETAILS
    await pool
      .request()
      .input("prfId", sql.UniqueIdentifier, prfId)
      .query(`
        UPDATE PRFTABLE_DETAILS 
        SET isCancel = 1 
        WHERE PrfId = @prfId
      `);

    return { success: true, message: "PRF canceled successfully" };
  } catch (error) {
    console.error("Database error in cancelPrf:", error);
    throw new Error("Failed to cancel PRF: " + error.message);
  }
};

module.exports = { cancelPrf };
