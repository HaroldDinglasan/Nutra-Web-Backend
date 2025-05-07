// Import the database connection from your existing db.js file
const { sql, poolPurchaseRequest } = require("../connectionHelper/db")

// Create a new approval assignment
const createApproval = async (approvalData) => {
  try {
    const pool = await poolPurchaseRequest

    // Validate required fields
    if (!approvalData.UserID) {
      throw new Error("UserID is required")
    }

    if (!approvalData.ApplicType) {
      // Set default value if not provided
      approvalData.ApplicType = "PRF"
    }

    console.log("Creating approval with data:", approvalData)

    // Get the next ApproverAssignID
    const idResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(ApproverAssignID), 0) + 1 AS NextID FROM AssignedApprovals")

    const nextId = idResult.recordset[0].NextID

    // Insert the new approval record
    await pool
      .request()
      .input("ApproverAssignID", sql.Int, nextId)
      .input("UserID", sql.Int, approvalData.UserID)
      .input("ApplicType", sql.VarChar(50), approvalData.ApplicType)
      .input("CheckedById", sql.UniqueIdentifier, approvalData.CheckedById)
      .input("CheckedByEmail", sql.VarChar(100), approvalData.CheckedByEmail)
      .input("ApprovedById", sql.UniqueIdentifier, approvalData.ApprovedById)
      .input("ApprovedByEmail", sql.VarChar(100), approvalData.ApprovedByEmail)
      .input("ReceivedById", sql.UniqueIdentifier, approvalData.ReceivedById)
      .input("ReceivedByEmail", sql.VarChar(100), approvalData.ReceivedByEmail)
      .query(`
        INSERT INTO AssignedApprovals (
          ApproverAssignID, UserID, ApplicType, 
          CheckedById, CheckedByEmail, 
          ApprovedById, ApprovedByEmail, 
          ReceivedById, ReceivedByEmail
        ) 
        VALUES (
          @ApproverAssignID, @UserID, @ApplicType, 
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

// Get approval by ID
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

// Get approvals by user ID
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

// Update an approval
const updateApproval = async (id, approvalData) => {
  try {
    const pool = await poolPurchaseRequest
    await pool
      .request()
      .input("ApproverAssignID", sql.Int, id)
      .input("CheckedById", sql.UniqueIdentifier, approvalData.CheckedById)
      .input("CheckedByEmail", sql.VarChar(100), approvalData.CheckedByEmail)
      .input("ApprovedById", sql.UniqueIdentifier, approvalData.ApprovedById)
      .input("ApprovedByEmail", sql.VarChar(100), approvalData.ApprovedByEmail)
      .input("ReceivedById", sql.UniqueIdentifier, approvalData.ReceivedById)
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
