const express = require("express");
const router = express.Router();
const authRoutes = require("./auth");
const bookRoutes = require("./book");
//const ratingRoutes = require("./rating");

// Prefix all authentication routes with /auth
router.use("/auth", authRoutes);
router.use("/book", bookRoutes);
// add book and rating routes with appropriate prefixes

//router.use("/ratings", ratingRoutes);

module.exports = router;