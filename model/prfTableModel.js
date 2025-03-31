const { poolPurchaseRequest } = require("../connectionHelper/db");

const getNextId = async (pool) => {
  try {
    const result = await pool
      .request()
      .query(`SELECT MAX(id) AS maxId FROM PRFTABLE`);

    const maxId = result.recordset[0].maxId || 0;
    return maxId + 1;
  } catch (error) {
    console.error("Error generating next ID:", error);
    throw new Error("Failed to generate next ID");
  }
};

const savePrfHeader = async (prfData) => {
  try {
    const pool = await poolPurchaseRequest;

    const checkResult = await pool
      .request()
      .input("prfNo", prfData.prfNo)
      .query(`SELECT id FROM PRFTABLE WHERE prfNo = @prfNo`);

    if (checkResult.recordset.length > 0) {
      console.log("PRF already exists, returning existing ID");
      return checkResult.recordset[0].id;
    }

    const newId = await getNextId(pool); // ✅ Now it's defined

    const result = await pool
      .request()
      .input("id", newId)
      .input("prfNo", prfData.prfNo)
      .input("prfDate", prfData.prfDate)
      .input("preparedBy", prfData.preparedBy)
      .query(`
        INSERT INTO PRFTABLE (id, prfNo, prfDate, preparedBy)
        VALUES (@id, @prfNo, @prfDate, @preparedBy);
      `);

    return newId;
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to save PRF header data: " + error.message);
  }
};

module.exports = { savePrfHeader, getNextId };
