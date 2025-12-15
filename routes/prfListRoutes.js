const express = require("express")
const router = express.Router()
const { fetchPrfList, fetchPrfListByUser, fetchPrfByNumber, getPrfCurrentStatus } = require("../controller/prfListController")

router.get("/prf-list", fetchPrfList)
router.get("/prf-list/user/:username", fetchPrfListByUser)
router.get("/prf/:prfId", fetchPrfByNumber);
router.get("/prf/status/:prfId", getPrfCurrentStatus);

module.exports = router
