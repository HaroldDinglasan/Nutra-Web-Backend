const express = require("express")
const router = express.Router()
const { fetchPendingCheckedBy } = require("../controller/prfCheckedByController")
  
router.get("/pending-checkedby", fetchPendingCheckedBy);

module.exports = router;