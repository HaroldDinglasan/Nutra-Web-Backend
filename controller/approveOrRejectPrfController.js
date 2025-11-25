const { approvePrfByHeads, rejectPrfByHeads } = require("../model/approveOrRejectPrfService")

const approvePrfController = async (req, res) => {
    try {
        const { prfId } = req.params
        const { actionType, userFullName } = req.body

        if (!prfId || !actionType) {
        return res.status(400).json({
            success: false,
            message: "PRF ID and action type are required",
        })
        }

        const result = await approvePrfByHeads(prfId, actionType, userFullName)

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data,
            })
        } else {
            res.status(500).json({
                success: false,
                message: result.error,
            })
        }
    } catch (error) {
        console.error("Error in approval endpoint", error)
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}

const rejectPrfController = async (req, res) => {
  try {
    const { prfId } = req.params
    const { userFullName } = req.body

    if (!prfId) {
      return res.status(400).json({
        success: false,
        message: "PRF ID is required",
      })
    }

    const result = await rejectPrfByHeads(prfId, userFullName)

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      })
    } else {
      res.status(500).json({
        success: false,
        message: result.error,
      })
    }
  } catch (error) {
    console.error("Error in rejection endpoint", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

module.exports = { approvePrfController, rejectPrfController }