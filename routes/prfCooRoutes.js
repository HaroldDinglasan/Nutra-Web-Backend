const express = require("express")
const router = express.Router()
const { fetchPendingCooPrfs } = require("../controller/prfCooController")
   
// Get Pending PRFs for COO 
router.get("/pending-coo", fetchPendingCooPrfs);

module.exports = router;