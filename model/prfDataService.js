const { poolPurchaseRequest } = require("../connectionHelper/db")

// Get PRF details using prfId
const getPrfById = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest

    // Query PRFTALBE where prfId matches
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

    // Return first result or null if not found
    return result.recordset[0] || null
  } catch (error) {
    console.error("Error getting PRF data by ID:", error)
    throw new Error("Failed to retrieve PRF data: " + error.message)
  }
}

// Get PRF details using PRF number
const getPrfByNumber = async (prfNo) => {
  try {
    const pool = await poolPurchaseRequest

    // Query PRFTABLE where prfNo matches
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

    // Return first result or null if not found
    return result.recordset[0] || null
  } catch (error) {
    console.error("Error getting PRF data by number:", error)
    throw new Error("Failed to retrieve PRF data: " + error.message)
  }
}

// Get the latest PRF created by a specific user
const getLatestPrfByUser = async (preparedBy) => {
  try {
    const pool = await poolPurchaseRequest

    // Get the most recent PRF (Top 1 ordered by latest date)
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

// Get deparment name using deparmentId
const getDepartmentName = async (departmentId) => {
  try {
    const pool = await poolPurchaseRequest
    
    // Query Department table to get departmentName
    const result = await pool
      .request()
      .input("departmentId", departmentId)
      .query(`
        SELECT departmentName
        FROM Department
        WHERE departmentId = @departmentId
      `)

    // Return department name if exists, else null
    return result.recordset.length > 0 ? result.recordset[0].departmentName : null
  } catch (error) {
    console.error("Error getting department name:", error)
    return null
  }
}

// Get PRF details together with department type of the user
const getPrfWithDepartment = async (prfId) => {
  try {
    const pool = await poolPurchaseRequest;

    // Join PRFTABLE with Users_Info
    // This gets the departmentType of the person who prepared the PRF
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
          p.departmentCharge,
          p.checkedBy,
          p.secondCheckedBy,
          p.approvedBy,
          p.receivedBy,
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
