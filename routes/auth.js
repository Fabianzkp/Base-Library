const express = require("express");
const router = express.Router();
const path = require("path");

// The route will be accessible via /auth/sign-in (depending on index.js)
router.get("/sign-in", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/login/login.html"));
});

module.exports = router;