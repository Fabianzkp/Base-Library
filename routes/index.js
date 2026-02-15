const express = require("express");
const router = express.Router();
const authRoutes = require("./auth");

// Prefix all authentication routes with /auth
router.use("/auth", authRoutes);

module.exports = router;