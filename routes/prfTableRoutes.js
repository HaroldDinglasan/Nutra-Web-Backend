const express = require("express")
const { savePrf } = require("../controller/prfTableController")

const router = express.Router()

// Route to save PRF header data
router.post("/save-table-header", savePrf)

module.exports = router

