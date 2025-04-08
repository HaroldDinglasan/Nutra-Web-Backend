const express = require("express");
const router = express.Router();
const { cancelPrfController } = require("../controller/cancelPrfController");

router.post("/cancel-prf", cancelPrfController);

module.exports = router;