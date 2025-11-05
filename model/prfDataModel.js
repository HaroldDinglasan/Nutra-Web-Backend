const { poolPurchaseRequest } = require("../connectionHelper/db")

// Function to get PRF data by ID
const getPrfById = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("prfId", prfId)
      .query(`
        SELECT 
          prfId,
          prfNo,
          prfDate,
          preparedBy,
          departmentId,
          checkedBy,
          approvedBy,
          receivedBy
        FROM PRFTABLE
        WHERE prfId = @prfId
      `)

    return result.recordset[0] || null
  } catch (error) {
    console.error("Error getting PRF data by ID:", error)
    throw new Error("Failed to retrieve PRF data: " + error.message)
  }
}

// Function to get PRF data by PRF number
const getPrfByNumber = async (prfNo) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("prfNo", prfNo)
      .query(`
        SELECT 
          prfId,
          prfNo,
          prfDate,
          preparedBy,
          departmentId,
          checkedBy,
          approvedBy,
          receivedBy
        FROM PRFTABLE
        WHERE prfNo = @prfNo
      `)

    return result.recordset[0] || null
  } catch (error) {
    console.error("Error getting PRF data by number:", error)
    throw new Error("Failed to retrieve PRF data: " + error.message)
  }
}

// Function to get the latest PRF for a user
const getLatestPrfByUser = async (preparedBy) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("preparedBy", preparedBy)
      .query(`
        SELECT TOP 1
          prfId,
          prfNo,
          prfDate,
          preparedBy,
          departmentId,
          checkedBy,
          approvedBy,
          receivedBy
        FROM PRFTABLE
        WHERE preparedBy = @preparedBy
        ORDER BY prfDate DESC
      `)

    return result.recordset[0] || null
  } catch (error) {
    console.error("Error getting latest PRF for user:", error)
    throw new Error("Failed to retrieve PRF data: " + error.message)
  }
}

// Function to get department name by department ID
const getDepartmentName = async (departmentId) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("departmentId", departmentId)
      .query(`
        SELECT departmentName
        FROM Department
        WHERE departmentId = @departmentId
      `)

    return result.recordset.length > 0 ? result.recordset[0].departmentName : null
  } catch (error) {
    console.error("Error getting department name:", error)
    return null
  }
}

// Function para makuha kung anong department type sa table na Users_Info
const getPrfWithDepartment = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest;

    const result = await pool
      .request()
      .input("prfId", prfId)
      .query(`
        SELECT 
          p.prfId,
          p.prfNo,
          p.prfDate,
          p.preparedBy,
          p.departmentId,
          u.departmentType AS departmentType
        FROM PRFTABLE p
        LEFT JOIN Users_Info u
          ON p.preparedBy = u.fullName
        WHERE p.prfId = @prfId
      `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error getting PRF with department:", error);
    throw error;
  }
};

module.exports = {
  getPrfById,
  getPrfByNumber,
  getLatestPrfByUser,
  getDepartmentName,
  getPrfWithDepartment,
}
