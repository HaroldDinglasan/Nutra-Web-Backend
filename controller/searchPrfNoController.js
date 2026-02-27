const { searchPrfByNumber } = require("../model/searchPrfNoService")

const searchPrf = async (req, res) => {
  try {
    const { prfNo } = req.query

    if (!prfNo) {
      return res.status(400).json({ message: "PRF number is required" })
    }

    const result = await searchPrfByNumber(prfNo)

    if (result.found) {
      // If PRF is found, send back the result including all cancellation status information
      const cancelCount = result.cancelCount || 0
      const isFullyCancelled = result.isFullyCancelled || result.isCancel === 1 || cancelCount >= 3

      // Determine the appropriate button label
      let cancelButtonLabel = "Cancel"
      if (isFullyCancelled) {
        cancelButtonLabel = "Cancel Limit Reached"
      } else if (cancelCount > 0) {
        cancelButtonLabel = `Cancel (${cancelCount}/3)`
      }

      res.json({
        ...result,
        cancelCount,
        isFullyCancelled,
        cancelButtonLabel,
      })
    } else {
      res.json(result)
    }
  } catch (error) {
    console.error("Error searching PRF:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

module.exports = { searchPrf }
