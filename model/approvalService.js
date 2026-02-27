// Import database connection and sql helper
const { sql, poolPurchaseRequest, poolAVLI } = require("../connectionHelper/db")

// CREATE NEW APPROVAL RECORD
const createApproval = async (approvalData) => {
  try {
    // Connect to PurchaseRequest database
    const pool = await poolPurchaseRequest

    // Make sure UserID is provided (required)
    if (!approvalData.UserID) {
      throw new Error("UserID is required")
    }

    // If ApplicType is not provided, default is PRF
    if (!approvalData.ApplicType) {
      approvalData.ApplicType = "PRF"
    }

    console.log("Creating approval with data:", approvalData)

    // Get the next ApproverAssignID (auto increment manually)
    const idResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(ApproverAssignID), 0) + 1 AS NextID FROM AssignedApprovals")

    const nextId = idResult.recordset[0].NextID

    // If OID is not provided, set to null
    const checkedById = approvalData.CheckedById || null
    const secondCheckedById = approvalData.SecondCheckedById || null
    const approvedById = approvalData.ApprovedById || null
    const receivedById = approvalData.ReceivedById || null

    // Insert new record into AssignedApprovals table
    await pool
      .request()
      .input("ApproverAssignID", sql.Int, nextId)
      .input("UserID", sql.Int, approvalData.UserID)
      .input("ApplicType", sql.VarChar(50), approvalData.ApplicType)
      .input("ApproverAssignDate", sql.Date, new Date())
      .input("CheckedById", sql.UniqueIdentifier, checkedById)
      .input("CheckedByEmail", sql.VarChar(100), approvalData.CheckedByEmail)
      .input("WloSecondCheckedByEmail", sql.VarChar(100), approvalData.WloSecondCheckedByEmail)
      .input("SecondCheckedById", sql.UniqueIdentifier, secondCheckedById)
      .input("ApprovedById", sql.UniqueIdentifier, approvedById)
      .input("ApprovedByEmail", sql.VarChar(100), approvalData.ApprovedByEmail)
      .input("ReceivedById", sql.UniqueIdentifier, receivedById)
      .input("ReceivedByEmail", sql.VarChar(100), approvalData.ReceivedByEmail)
      .query(`
        INSERT INTO AssignedApprovals (
          ApproverAssignID, UserID, ApplicType, ApproverAssignDate,
          CheckedById, CheckedByEmail, 
          ApprovedById, ApprovedByEmail, 
          ReceivedById, ReceivedByEmail,
          WloSecondCheckedByEmail, 
          SecondCheckedById
        ) 
        VALUES (
          @ApproverAssignID, @UserID, @ApplicType, @ApproverAssignDate,
          @CheckedById, @CheckedByEmail, 
          @ApprovedById, @ApprovedByEmail, 
          @ReceivedById, @ReceivedByEmail,
          @WloSecondCheckedByEmail, 
          @SecondCheckedById
        )
      `)

    // Return inserted data
    return { id: nextId, ...approvalData }
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to create approval assignment: " + error.message)
  }
}

// Get one approval record using ApproverAssignID
const getApprovalById = async (id) => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("ApproverAssignID", sql.Int, id)
      .query("SELECT * FROM AssignedApprovals WHERE ApproverAssignID = @ApproverAssignID")

    return result.recordset[0]
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to get approval assignment: " + error.message)
  }
}

// Get all approvals of a specific user
const getApprovalsByUserId = async (userId) => {
  try {
    const pool = await poolPurchaseRequest
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .query("SELECT * FROM AssignedApprovals WHERE UserID = @UserID")

    return result.recordset
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to get approval assignments: " + error.message)
  }
}

// Update existing approval record
const updateApproval = async (id, approvalData) => {
  try {
    const pool = await poolPurchaseRequest

    // If no OID provided, set to null
    const checkedById = approvalData.CheckedById || null
    const approvedById = approvalData.ApprovedById || null
    const receivedById = approvalData.ReceivedById || null

    await pool
      .request()
      .input("ApproverAssignID", sql.Int, id)
      .input("CheckedById", sql.UniqueIdentifier, checkedById)
      .input("CheckedByEmail", sql.VarChar(100), approvalData.CheckedByEmail)
      .input("WloSecondCheckedByEmail", sql.VarChar(100), approvalData.WloSecondCheckedByEmail)
      .input("SecondCheckedById", sql.UniqueIdentifier, approvalData.SecondCheckedById)
      .input("ApprovedById", sql.UniqueIdentifier, approvedById)
      .input("ApprovedByEmail", sql.VarChar(100), approvalData.ApprovedByEmail)
      .input("ReceivedById", sql.UniqueIdentifier, receivedById)
      .input("ReceivedByEmail", sql.VarChar(100), approvalData.ReceivedByEmail)
      .query(`
        UPDATE AssignedApprovals 
        SET 
          CheckedById = @CheckedById,
          CheckedByEmail = @CheckedByEmail,
          ApprovedById = @ApprovedById,
          ApprovedByEmail = @ApprovedByEmail,
          ReceivedById = @ReceivedById,
          ReceivedByEmail = @ReceivedByEmail,
          SecondCheckedById = @SecondCheckedById
        WHERE ApproverAssignID = @ApproverAssignID
      `)

    return { id, ...approvalData }
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to update approval assignment: " + error.message)
  }
}

// This function gets OID from SecuritySystemUser or HeadUsers
// Then updates AssignedApprovals with correct OIDs
const populateAssignedApprovals = async (userId, checkedByName, approvedByName, receivedByName, secondCheckedByName) => {
  try {
    const avliPool = await poolAVLI
    const purchasePool = await poolPurchaseRequest

    // Get OID using FullName
    const getEmployeeOid = async (fullName) => {
      if (!fullName) return null
      
      // Check in SecuritySystemUser table (TEST_AVLI)
      const result = await avliPool
        .request()
        .input("fullName", sql.VarChar, fullName)
        .query(`SELECT Oid FROM SecuritySystemUser WHERE FullName = @fullName`)

        if (result.recordset.length > 0) {
          return result.recordset[0].Oid
        }

      // If not found, check in HeadUsers table
      const resultHeadUser = await purchasePool
        .request()
        .input("fullName", sql.NVarChar, fullName)
        .query(`SELECT headOid AS Oid FROM HeadUsers WHERE fullName = @fullName`)

      return resultHeadUser.recordset.length > 0 ? resultHeadUser.recordset[0].Oid : null
    }

    // Get all approvers' OIDs
    const checkedById = await getEmployeeOid(checkedByName)
    const approvedById = await getEmployeeOid(approvedByName)
    const receivedById = await getEmployeeOid(receivedByName)
    const secondCheckedById = await getEmployeeOid(secondCheckedByName)

    // Check if record already exists
    const existing = await purchasePool
      .request()
      .input("userId", sql.Int, userId)
      .query(`SELECT ApproverAssignID FROM AssignedApprovals WHERE UserID = @userId AND ApplicType = 'PRF'`)

    if (existing.recordset.length > 0) {
      await purchasePool
        .request()
        .input("userId", sql.Int, userId)
        .input("checkedById", sql.UniqueIdentifier, checkedById)
        .input("approvedById", sql.UniqueIdentifier, approvedById)
        .input("receivedById", sql.UniqueIdentifier, receivedById)
        .input("secondCheckedById", sql.UniqueIdentifier, secondCheckedById)
        // Inuupdate ang checked, approved, received by id na maging OID ng approvers sa table ng SecuritySystemUser Database ng TEST_AVLI
        .query(`
          UPDATE AssignedApprovals
          SET CheckedById = @checkedById,
              ApprovedById = @approvedById,
              ReceivedById = @receivedById,
              SecondCheckedById = @secondCheckedById
          WHERE UserID = @userId AND ApplicType = 'PRF'
        `)
    } else {
      // If not exists → INSERT
      await purchasePool
        .request()
        .input("userId", sql.Int, userId)
        .input("checkedById", sql.UniqueIdentifier, checkedById)
        .input("approvedById", sql.UniqueIdentifier, approvedById)
        .input("receivedById", sql.UniqueIdentifier, receivedById)
        .input("secondCheckedById", sql.UniqueIdentifier, secondCheckedById)
        .query(`
          INSERT INTO AssignedApprovals (
            UserID, 
            ApplicType, 
            CheckedById, 
            ApprovedById, 
            ReceivedById,
            SecondCheckedById
          )
          VALUES (
            @userId, 
            'PRF',
            @checkedById, 
            @approvedById, 
            @receivedById,
            @secondCheckedById
          )
        `)
    }
    console.log("✅ AssignedApprovals updated successfully.")
    return { checkedById, approvedById, receivedById }
  } catch (error) {
    console.error("❌ Error populating AssignedApprovals:", error)
    throw new Error("Failed to populate AssignedApprovals: " + error.message)
  }
}

// Get approvers' emails for sending notification
const getAssignedEmails = async (userId) => {
  const pool = await poolPurchaseRequest;
  const result = await pool
  .request()
  .input("UserID", sql.Int, userId)
  .query(`
    SELECT CheckedByEmail, ApprovedByEmail, ReceivedByEmail FROM AssignedApprovals 
    WHERE UserID = @UserID AND ApplicType = 'PRF'
    `);

  return result.recordset[0] || null;
}

module.exports = {
  createApproval,
  getApprovalById,
  getApprovalsByUserId,
  updateApproval,
  populateAssignedApprovals,
  getAssignedEmails
}
