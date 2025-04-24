const express = require("express")
const router = express.Router()
const { fetchUomCodesByStockId } = require("../controller/UomController")

router.get("/uomcodes/:stockId", fetchUomCodesByStockId)

module.exports = router
