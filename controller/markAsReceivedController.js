const { markAsReceivedService, getIsDeliveredListService  } = require("../model/markAsReceivedService")

const markAsReceived = async (req, res) => {
  const { Id } = req.params

  try {
    console.log("[v0] Marking item as received - Id:", Id)
    const result = await markAsReceivedService(Id)

    res.status(200).json({
      message: "Stock item marked as received successfully",
      data: result,
    })
  } catch (error) {
    console.error("Error marking item as received:", error)
    res.status(500).json({
      error: "Failed to mark item as received",
      details: error.message,
    })
  }
}

const getDeliveredList = async (req, res) => {
  try {
    const list = await getIsDeliveredListService()
    res.status(200).json({
      message: "Delivered list fetched successfully",
      data: list,
    })
  } catch (error) {
    console.error("Error fetching delivered list:", error)
    res.status(500).json({
      error: "Failed to fetch delivered list",
      details: error.message,
    })
  }
}

module.exports = { markAsReceived, getDeliveredList }
