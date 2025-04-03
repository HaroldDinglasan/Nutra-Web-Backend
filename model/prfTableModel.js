
const { poolPurchaseRequest } = require("../connectionHelper/db")

const savePrfHeader = async (prfData) => {
  try {
    const pool = await poolPurchaseRequest;

    // Use the departmentId from prfData if it exists
    let departmentId = prfData.departmentId;

    // If departmentId is not provided in prfData, fetch it from Users_Info
    if (!departmentId) {
      console.log("No departmentId provided in prfData, fetching from database");

      const departmentResult = await pool
        .request()
        .input("preparedBy", prfData.preparedBy)
        .query(`
          SELECT departmentId FROM Users_Info WHERE fullName = @preparedBy
        `);

      if (departmentResult.recordset.length === 0) {
        throw new Error("Department ID not found.");
      }

      // Get the departmentId from the query result
      departmentId = departmentResult.recordset[0].departmentId;
    }

    console.log("Using departmentId:", departmentId);

    // Check if PRF already exists
    const checkResult = await pool
      .request()
      .input("prfNo", prfData.prfNo)
      .query(`SELECT prfId FROM PRFTABLE WHERE prfNo = @prfNo`);

    if (checkResult.recordset.length > 0) {
      console.log("PRF already exists, returning existing ID");
      return checkResult.recordset[0].prfId;
    }

    // Generate GUID for prfId if not provided
    const prfId = prfData.prfId || require("crypto").randomUUID();

    const result = await pool
      .request()
      .input("prfId", prfId)
      .input("prfNo", prfData.prfNo)
      .input("prfDate", prfData.prfDate)
      .input("preparedBy", prfData.preparedBy)
      .input("departmentId", departmentId) // Use the departmentId we determined
      .query(`
        INSERT INTO PRFTABLE (prfId, prfNo, prfDate, preparedBy, departmentId)
        VALUES (@prfId, @prfNo, @prfDate, @preparedBy, @departmentId);
      `);

    return prfId;
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to save PRF header data: " + error.message);
  }
};

module.exports = { savePrfHeader };
