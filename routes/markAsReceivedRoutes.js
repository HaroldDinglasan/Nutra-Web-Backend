const express = require("express")
const { markAsReceived, getDeliveredList } = require("../controller/markAsReceivedController")

const router = express.Router()

router.put("/markAsReceived/:Id", markAsReceived) // route to update mark as received per stock item
router.get("/getDeliveredList", getDeliveredList) // route to get list of delivered stock items

module.exports = router
