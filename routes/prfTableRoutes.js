const express = require("express")
const { savePrf, updatePrfApprovals } = require("../controller/prfTableController")

const router = express.Router()

// Route to save PRF header data
router.post("/save-table-header", savePrf)

// Route to update PRF approval names
router.put("/prf-approvals/:prfId", updatePrfApprovals)

module.exports = router
