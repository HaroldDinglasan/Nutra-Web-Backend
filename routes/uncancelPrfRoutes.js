const express = require("express");
const router = express.Router();
const { uncancelPrfController } = require("../controller/uncancelPrfController");

router.post("/uncancel-prf", uncancelPrfController);

module.exports = router;