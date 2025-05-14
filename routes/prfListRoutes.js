const express = require("express")
const router = express.Router()
const { fetchPrfList, fetchPrfListByUser } = require("../controller/prfListController")

router.get("/prf-list", fetchPrfList)
router.get("/prf-list/user/:username", fetchPrfListByUser)

module.exports = router
