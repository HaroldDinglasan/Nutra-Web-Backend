// Import service functions that handle database logic
const { cancelPrf, uncancelPrf} = require("../model/cancelPrfService")

// CANCEL PRF CONTROLLER
const cancelPrfController = async (req, res) => {
  try {

    // Get prfId from request body (sent from front end)
    const { prfId } = req.body

    // If prfId is missing, return error response
    if (!prfId) {
      return res.status(400).json({ message: "PRF ID is required" })
    }

    // Call service function to cancel PRF
    const result = await cancelPrf(prfId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json({ message: result.message })
    }
  } catch (error) {
    console.error("Error in cancelPrfController:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// UN-CANCEL PRF CONTROLLER
const uncancelPrfController = async (req, res) => {
  try {
    // Get prfId from request body
    const { prfId } = req.body

    // Validate prfId
    if (!prfId) {
      return res.status(400).json({ message: "PRF ID is required" })
    }

    // Call service function to uncancel PRF
    const result = await uncancelPrf(prfId)

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json({ message: result.message })
    }
  } catch (error) {
    console.error("Error in uncancelPrfController:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Export controllers so routes can use them
module.exports = { cancelPrfController, uncancelPrfController }
