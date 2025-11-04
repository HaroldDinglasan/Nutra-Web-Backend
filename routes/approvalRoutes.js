const express = require("express")
const { populateApprovals, saveApproval, getApproval, getUserApprovals, updateApprovalById } = require("../controller/approvalController")

const router = express.Router()

// Create a new approval assignment
router.post("/approvals", saveApproval)

// Get approval by ID
router.get("/approvals/:id", getApproval)

// Get approvals by user ID
router.get("/approvals/user/:userId", getUserApprovals)

// Update an approval
router.put("/approvals/:id", updateApprovalById)

// POST route to populate AssignedApprovals OIDs
router.post("/populate-approvals", populateApprovals)

module.exports = router
