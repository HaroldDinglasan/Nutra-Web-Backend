
const { poolPurchaseRequest, poolAVLI, sql } = require("../connectionHelper/db")

// Save PRF header
const savePrfHeader = async (prfData) => {
  try {
    const pool = await poolPurchaseRequest
    const avliPool = await poolAVLI

    let departmentId = prfData.departmentId

    // If deparmentId is missing, get it from Users_Info table
    if (!departmentId) {
      const departmentResult = await pool
        .request()
        .input("preparedBy", prfData.preparedBy)
        .query(`
          SELECT departmentId 
          FROM Users_Info 
          WHERE fullName = @preparedBy
        `)

      if (departmentResult.recordset.length === 0) {
        throw new Error("Department ID not found.")
      }

      // Get the departmentId from the query result
      departmentId = departmentResult.recordset[0].departmentId

    }

    // Step 2: if PRF number already exists (avoid duplicate)
    const checkResult = await pool
      .request()
      .input("prfNo", prfData.prfNo)
      .query(`SELECT prfId FROM PRFTABLE WHERE prfNo = @prfNo`)

    if (checkResult.recordset.length > 0) {
      console.log("PRF already exists, returning existing ID")
      return checkResult.recordset[0].prfId
    }

    // Step 3: Generate GUID for prfId if not provided
    const prfId = prfData.prfId || require("crypto").randomUUID()

    // Step 4: Get userID of preparedBy from Users_Info
    const userResult = await pool
      .request()
      .input("preparedBy", prfData.preparedBy)
      .query(`
        SELECT userID 
        FROM Users_Info 
        WHERE fullName = @preparedBy
      `)

    let userId = null
    let checkedByName = ""
    let secondCheckedByName = ""
    let approvedByName = ""
    let receivedByName = ""

    if (userResult.recordset.length > 0) {
      userId = userResult.recordset[0].userID
      console.log("Found user ID:", userId)

      // Step 5: Get the user's approval settings
      const approvalResult = await pool
        .request()
        .input("userId", userId)
        .query(`
          SELECT 
          CheckedById, SecondCheckedById, ApprovedById, ReceivedById 
          FROM AssignedApprovals 
          WHERE UserID = @userId AND ApplicType = 'PRF'
        `)

      if (approvalResult.recordset.length > 0) {
        const approval = approvalResult.recordset[0]
        console.log("Found approval settings:", approval)

        // Help function to get employee full name
        const getEmployeeName = async (employeeOid) => {
          if (!employeeOid) return ""

          try {
            //  Check AVLI database first
            const empResult = await avliPool
              .request()
              .input("employeeOid", employeeOid)
              .query(`
                SELECT FullName 
                FROM SecuritySystemUser 
                WHERE Oid = @employeeOid
              `)

            if (empResult.recordset.length > 0) {
              return empResult.recordset[0].FullName
            }

            //  If not found, check in HeadUsers (PurchaseRequestDB)
            const headResult = await pool
              .request()
              .input("employeeOid", employeeOid)
              .query(`
                SELECT fullName FROM HeadUsers WHERE headOid = @employeeOid`)
            return headResult.recordset.length > 0 ? headResult.recordset[0].fullName : ""
          } catch (error) {
            console.error("Error fetching employee name:", error)
            return ""
          }
        }

        // Step 6: Get actual names of approvers
        checkedByName = await getEmployeeName(approval.CheckedById)
        secondCheckedByName = await getEmployeeName(approval.SecondCheckedById)        
        approvedByName = await getEmployeeName(approval.ApprovedById)
        receivedByName = await getEmployeeName(approval.ReceivedById)

        console.log("Retrieved approval names:", { checkedByName, approvedByName, receivedByName })
      } else {
        console.log("No approval settings found for user:", userId)
      }
    } else {
      console.log("User not found in Users_Info table:", prfData.preparedBy)
    }

    console.log("[v0] Inserting PRF with departmentCharge:", prfData.departmentCharge)

    // Step 7: Insert ng prf header details
    await pool
      .request()
      .input("prfId", prfId)
      .input("prfNo", prfData.prfNo)
      .input("prfDate", prfData.prfDate)
      .input("preparedBy", prfData.preparedBy)
      .input("userId", sql.Int, userId || null) 
      .input("departmentId", departmentId)
      .input("checkedBy", checkedByName)
      .input("secondCheckedBy", secondCheckedByName)
      .input("approvedBy", approvedByName)
      .input("receivedBy", receivedByName)
      .input("departmentCharge", sql.VarChar(100), prfData.departmentCharge || null) 
      .query(`
        INSERT INTO PRFTABLE 
        (prfId, prfNo, prfDate, preparedBy, UserID, departmentId, 
        checkedBy, secondCheckedBy, approvedBy, receivedBy, departmentCharge)
        VALUES
        (@prfId, @prfNo, @prfDate, @preparedBy, @userId, @departmentId, 
        @checkedBy, @secondCheckedBy, @approvedBy, @receivedBy, @departmentCharge)
      `)

    console.log("✅ PRF header saved with approval names and department charge:", {
      checkedByName,
      approvedByName,
      receivedByName,
      departmentCharge: prfData.departmentCharge,
    })
    return prfId
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to save PRF header data: " + error.message)
  }
}

// Update only the approval names in PRFTABLE
const updatePrfApprovalNames = async (prfId, approvalNames) => {
  try {
    const pool = await poolPurchaseRequest

    const result = await pool
      .request()
      .input("prfId", prfId)
      .input("checkedBy", approvalNames.checkedByUser)
      .input("secondCheckedBy", approvalNames.secondCheckedByUser)      
      .input("approvedBy", approvalNames.approvedByUser)
      .input("receivedBy", approvalNames.receivedByUser)
      .query(`
        UPDATE PRFTABLE 
        SET 
        checkedBy = @checkedBy, 
        secondCheckedBy = @secondCheckedBy,
        approvedBy = @approvedBy, 
        receivedBy = @receivedBy
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
