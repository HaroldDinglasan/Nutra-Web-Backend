const express = require("express")
const router = express.Router()
const { fetchPrfList, fetchPrfListByUser, fetchPrfByNumber } = require("../controller/prfListController")

router.get("/prf-list", fetchPrfList)
router.get("/prf-list/user/:username", fetchPrfListByUser)
router.get("/prf/:prfId", fetchPrfByNumber);

module.exports = router
