// Import Express framework
const express = require("express");

// Create a router object to define API routes
const router = express.Router();

// Import controller functions
const { cancelPrfController, uncancelPrfController  } = require("../controller/cancelPrfController");

router.post("/cancel-prf", cancelPrfController);
router.post("/uncancel-prf", uncancelPrfController);

module.exports = router;