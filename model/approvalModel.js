const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

const createApproval = async (approvalData) => {
  try {
    const pool = await poolPurchaseRequest

    // Validate required fields
    if (!approvalData.UserID) {
      throw new Error("UserID is required")
    }

    if (!approvalData.ApplicType) {
      approvalData.ApplicType = "PRF"
    }

    console.log("Creating approval with data:", approvalData)

    // Get the next ApproverAssignID
    const idResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(ApproverAssignID), 0) + 1 AS NextID FROM AssignedApprovals")

    const nextId = idResult.recordset[0].NextID

    // Use the provided Oids for approval IDs (these are the selected employees' Oids)
    const checkedById = approvalData.CheckedById || null
    const approvedById = approvalData.ApprovedById || null
    const receivedById = approvalData.ReceivedById || null

    // Create a new approval record with the selected employees' Oids
    await pool
      .request()
      .input("ApproverAssignID", sql.Int, nextId)
      .input("UserID", sql.Int, approvalData.UserID)
      .input("ApplicType", sql.VarChar(50), approvalData.ApplicType)
      .input("ApproverAssignDate", sql.Date, new Date())
      .input("CheckedById", sql.UniqueIdentifier, checkedById)
      .input("CheckedByEmail", sql.VarChar(100), approvalData.CheckedByEmail)
      .input("ApprovedById", sql.UniqueIdentifier, approvedById)
      .input("ApprovedByEmail", sql.VarChar(100), approvalData.ApprovedByEmail)
      .input("ReceivedById", sql.UniqueIdentifier, receivedById)
      .input("ReceivedByEmail", sql.VarChar(100), approvalData.ReceivedByEmail)
      .query(`
        INSERT INTO AssignedApprovals (
          ApproverAssignID, UserID, ApplicType, ApproverAssignDate,
          CheckedById, CheckedByEmail, 
          ApprovedById, ApprovedByEmail, 
          ReceivedById, ReceivedByEmail
        ) 
        VALUES (
          @ApproverAssignID, @UserID, @ApplicType, @ApproverAssignDate,
          @CheckedById, @CheckedByEmail, 
          @ApprovedById, @ApprovedByEmail, 
          @ReceivedById, @ReceivedByEmail
        )
      `)

    return { id: nextId, ...approvalData }
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to create approval assignment: " + error.message)
  }
}

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

const updateApproval = async (id, approvalData) => {
  try {
    const pool = await poolPurchaseRequest

    // Use the provided Oids for approval IDs (these are the selected employees' Oids)
    const checkedById = approvalData.CheckedById || null
    const approvedById = approvalData.ApprovedById || null
    const receivedById = approvalData.ReceivedById || null

    await pool
      .request()
      .input("ApproverAssignID", sql.Int, id)
      .input("CheckedById", sql.UniqueIdentifier, checkedById)
      .input("CheckedByEmail", sql.VarChar(100), approvalData.CheckedByEmail)
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
          ReceivedByEmail = @ReceivedByEmail
        WHERE ApproverAssignID = @ApproverAssignID
      `)

    return { id, ...approvalData }
  } catch (error) {
    console.error("Database error:", error)
    throw new Error("Failed to update approval assignment: " + error.message)
  }
}

module.exports = {
  createApproval,
  getApprovalById,
  getApprovalsByUserId,
  updateApproval,
}
