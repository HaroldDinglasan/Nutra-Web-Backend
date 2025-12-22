const { savePrfHeader, updatePrfApprovalNames } = require("../model/prfTableModel")

// Controller to handle saving PRF header data
const savePrf = async (req, res) => {
  try {
    const prfHeader = req.body

    console.log("[v0] Saving PRF with departmentCharge:", prfHeader.departmentCharge)

    // Save PRF header
    const prfId = await savePrfHeader(prfHeader)
    res.status(200).json({
      success: true,
      message: "PRF header saved successfully",
      prfId,
    })
  } catch (error) {
    console.error("Error saving PRF header:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save PRF header data",
    })
  }
}

// Controller to update PRFTABLE with approval names
const updatePrfApprovals = async (req, res) => {
  try {
    const { prfId } = req.params
    const { checkedByUser, approvedByUser, receivedByUser } = req.body
    // Validate required fields
    if (!prfId) {
      return res.status(400).json({
        success: false,
        message: "PRF ID is required",
      })
    }
    if (!checkedByUser || !approvedByUser || !receivedByUser) {
      return res.status(400).json({
        success: false,
        message: "All approval names (checkedByUser, approvedByUser, receivedByUser) are required",
      })
    }
    const result = await updatePrfApprovalNames(prfId, {
      checkedByUser,
      approvedByUser,
      receivedByUser,
    })
    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: "PRF not found",
      })
    }
    res.status(200).json({
      success: true,
      message: "PRF approval names updated successfully",
      data: { checkedByUser, approvedByUser, receivedByUser },
    })
  } catch (error) {
    console.error("Error updating PRF approval names:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update PRF approval names",
    })
  }
}

module.exports = { savePrf, updatePrfApprovals }
