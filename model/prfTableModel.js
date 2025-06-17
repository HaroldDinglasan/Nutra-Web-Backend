
const { poolPurchaseRequest, poolAVLI } = require("../connectionHelper/db")

const savePrfHeader = async (prfData) => {
  try {
    const pool = await poolPurchaseRequest
    const avliPool = await poolAVLI

    let departmentId = prfData.departmentId

    // If departmentId is not provided in prfData, fetch it from Users_Info
    if (!departmentId) {

      const departmentResult = await pool
        .request()
        .input("preparedBy", prfData.preparedBy)
        .query(`
          SELECT departmentId FROM Users_Info WHERE fullName = @preparedBy
        `)

      if (departmentResult.recordset.length === 0) {
        throw new Error("Department ID not found.")
      }

      // Get the departmentId from the query result
      departmentId = departmentResult.recordset[0].departmentId
    }

    // Check if PRF already exists
    const checkResult = await pool
      .request()
      .input("prfNo", prfData.prfNo)
      .query(`SELECT prfId FROM PRFTABLE WHERE prfNo = @prfNo`)

    if (checkResult.recordset.length > 0) {
      console.log("PRF already exists, returning existing ID")
      return checkResult.recordset[0].prfId
    }

    // Generate GUID for prfId if not provided
    const prfId = prfData.prfId || require("crypto").randomUUID()

    // Get the user ID from Users_Info table first
    const userResult = await pool
      .request()
      .input("preparedBy", prfData.preparedBy)
      .query(`
        SELECT userID FROM Users_Info WHERE fullName = @preparedBy
      `)

    let checkedByName = ""
    let approvedByName = ""
    let receivedByName = ""

    if (userResult.recordset.length > 0) {
      const userId = userResult.recordset[0].userID
      console.log("Found user ID:", userId)

      // Get the user's approval settings
      const approvalResult = await pool
        .request()
        .input("userId", userId)
        .query(`
          SELECT CheckedById, ApprovedById, ReceivedById 
          FROM AssignedApprovals 
          WHERE UserID = @userId AND ApplicType = 'PRF'
        `)

      if (approvalResult.recordset.length > 0) {
        const approval = approvalResult.recordset[0]
        console.log("Found approval settings:", approval)

        // Get employee names for the approval IDs from SecuritySystemUser table in AVLI database
        const getEmployeeName = async (employeeOid) => {
          if (!employeeOid) return ""

          try {
            const empResult = await avliPool
              .request()
              .input("employeeOid", employeeOid)
              .query(`SELECT FullName FROM SecuritySystemUser WHERE Oid = @employeeOid`)

            return empResult.recordset.length > 0 ? empResult.recordset[0].FullName : ""
          } catch (error) {
            console.error("Error fetching employee name:", error)
            return ""
          }
        }

        checkedByName = await getEmployeeName(approval.CheckedById)
        approvedByName = await getEmployeeName(approval.ApprovedById)
        receivedByName = await getEmployeeName(approval.ReceivedById)

        console.log("Retrieved approval names:", { checkedByName, approvedByName, receivedByName })
      } else {
        console.log("No approval settings found for user:", userId)
      }
    } else {
      console.log("User not found in Users_Info table:", prfData.preparedBy)
    }

    // Insert the PRF header with approval names
    await pool
      .request()
      .input("prfId", prfId)
      .input("prfNo", prfData.prfNo)
      .input("prfDate", prfData.prfDate)
      .input("preparedBy", prfData.preparedBy)
      .input("departmentId", departmentId)
      .input("checkedBy", checkedByName || null)
      .input("approvedBy", approvedByName || null)
      .input("receivedBy", receivedByName || null)
      .query(`
        INSERT INTO PRFTABLE (prfId, prfNo, prfDate, preparedBy, departmentId, checkedBy, approvedBy, receivedBy)
        VALUES (@prfId, @prfNo, @prfDate, @preparedBy, @departmentId, @checkedBy, @approvedBy, @receivedBy);
      `)

    console.log("PRF header saved with approval names:", { checkedByName, approvedByName, receivedByName })

    return prfId
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to save PRF header data: " + error.message)
  }
}

// Update PRFTABLE with approval names only
const updatePrfApprovalNames = async (prfId, approvalNames) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("prfId", prfId)
      .input("checkedBy", approvalNames.checkedByUser)
      .input("approvedBy", approvalNames.approvedByUser)
      .input("receivedBy", approvalNames.receivedByUser)
      .query(`
        UPDATE PRFTABLE 
        SET checkedBy = @checkedBy, approvedBy = @approvedBy, receivedBy = @receivedBy
        WHERE prfId = @prfId
      `)

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      data: approvalNames,
    }
  } catch (error) {
    console.error("Database error updating PRF approval names:", error)
    throw new Error("Failed to update PRF approval names: " + error.message)
  }
}

module.exports = { savePrfHeader, updatePrfApprovalNames }
