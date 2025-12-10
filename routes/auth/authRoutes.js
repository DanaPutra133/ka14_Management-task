const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authController");

// ============= AUTH ROUTES USER =============
router.post("/check-npm", authController.checkNpm);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/api/check-session", authController.checkSession);


module.exports = router;
