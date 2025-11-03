const express = require("express");
const router = express.Router();
const { registerUser, login } = require("../controller/userController");

router.post("/save-register", registerUser);
router.post("/save-login", login);

module.exports = router;
