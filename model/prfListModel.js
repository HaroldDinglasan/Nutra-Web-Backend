const { sql, poolPurchaseRequest } = require("../connectionHelper/db");

// Fetch PRF List from PRFTABLE
const getPrfList = async () => {
  try {
    const pool = await poolPurchaseRequest;
    const result = await pool
      .request()
      .query("SELECT prfNo, preparedBy, prfDate FROM PRFTABLE ORDER BY prfDate DESC");

    return result.recordset;
  } catch (error) {
    console.error("❌ Error fetching PRF List:", error);
    throw error;
  }
};

module.exports = { getPrfList };
