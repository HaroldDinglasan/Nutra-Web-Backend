const express = require("express")
const { markAsReceived, getDeliveredList, getRemarksById, updateRemarks } = require("../controller/markAsReceivedController")

const router = express.Router()

router.put("/markAsReceived/:Id", markAsReceived) // route to update mark as received per stock item
router.get("/getDeliveredList", getDeliveredList) // route to get list of delivered stock items
router.put("/updateRemarks/:Id", updateRemarks)   // route to update remarks
router.get("/getRemarks/:Id", getRemarksById ) // route para mag display ang remarks
module.exports = router
