const express = require("express")
const { approvePrfController, rejectPrfController } = require("../controller/approveOrRejectPrfController")

const router = express.Router()

router.post("/prf/approve/:prfId", approvePrfController)
router.post("/prf/reject/:prfId", rejectPrfController)

module.exports = router

