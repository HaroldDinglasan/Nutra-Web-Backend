const { createApproval, getApprovalById, getApprovalsByUserId, updateApproval } = require("../model/approvalModel")

// Controller to handle creating a new approval assignment
const saveApproval = async (req, res) => {
  try {
    const approvalData = req.body
    console.log("Received approval data:", approvalData)

    // Validate required fields
    if (!approvalData.UserID) {
      return res.status(400).json({
        success: false,
        message: "UserID is required",
      })
    }

    // Set default ApplicType if not provided
    if (!approvalData.ApplicType) {
      approvalData.ApplicType = "PRF"
    }

    // Check if this request is from ApprovalModal (should skip notifications)
    if (approvalData.skipNotifications) {
      console.log("Skipping notifications as requested by ApprovalModal")
      // Remove the flag before saving to database
      delete approvalData.skipNotifications
    }

    const result = await createApproval(approvalData)

    res.status(201).json({
      success: true,
      data: result,
      message: "Approval assignment created successfully",
    })
  } catch (error) {
    console.error("Error creating approval:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create approval assignment",
    })
  }
}

// Get approval by ID
const getApproval = async (req, res) => {
  try {
    const { id } = req.params
    const approval = await getApprovalById(id)

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval assignment not found",
      })
    }

    res.status(200).json({
      success: true,
      data: approval,
    })
  } catch (error) {
    console.error("Error fetching approval:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch approval assignment",
    })
  }
}

// Get approvals by user ID
const getUserApprovals = async (req, res) => {
  try {
    const { userId } = req.params
    const approvals = await getApprovalsByUserId(userId)

    res.status(200).json({
      success: true,
      data: approvals,
    })
  } catch (error) {
    console.error("Error fetching approvals:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch approval assignments",
    })
  }
}

// Update an approval
const updateApprovalById = async (req, res) => {
  try {
    const { id } = req.params
    const approvalData = req.body

    // Check if approval exists
    const existingApproval = await getApprovalById(id)
    if (!existingApproval) {
      return res.status(404).json({
        success: false,
        message: "Approval assignment not found",
      })
    }

    // Check if this request is from ApprovalModal (should skip notifications)
    if (approvalData.skipNotifications) {
      console.log("Skipping notifications as requested by ApprovalModal")
      // Remove the flag before saving to database
      delete approvalData.skipNotifications
    }

    const updatedApproval = await updateApproval(id, approvalData)

    res.status(200).json({
      success: true,
      data: updatedApproval,
      message: "Approval assignment updated successfully",
    })
  } catch (error) {
    console.error("Error updating approval:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update approval assignment",
    })
  }
}

module.exports = {
  saveApproval,
  getApproval,
  getUserApprovals,
  updateApprovalById,
}
