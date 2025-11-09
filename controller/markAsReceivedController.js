const { markAsReceivedService, getIsDeliveredListService, getRemarksByIdService, updateRemarksService  } = require("../model/markAsReceivedService")

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

const updateRemarks = async (req, res) => {
  try {
    const { Id } = req.params;
    const { remarks, dateDelivered} = req.body;

    if (!remarks || !dateDelivered || !Id) {
      return res.status(400).json({ message: "Missing remarks or ID" });
    }

    const affected = await updateRemarksService(Id, remarks, dateDelivered);

    if (affected === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.status(200).json({ message: "Remarks updated successfully!" });
  } catch (error) {
    console.error("Error updating remarks:", error);
    res.status(500).json({ message: "Error updating remarks", error: error.message });
  }
};

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

const getRemarksById = async (req, res) => {
  try {
    const remarks = await getRemarksByIdService(req.params.Id)
    if (remarks) res.json(remarks);
    else res.status(404).json({ message: "No remarks found" });
  } catch (error) {
    console.error("Error fetching remarks:", error);
    res.status(500).json({ error: "Failed to fetch remarks" });
  }
}

module.exports = { markAsReceived, getDeliveredList, getRemarksById, updateRemarks}
