const express = require("express");
const router = express.Router();
const path = require("path");

const { login,register } = require('../controllers/auth');

// The route will be accessible via /auth/sign-in (depending on index.js)
router.get("/sign-in", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/login/login.html"));
});

router.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/register/register.html"));
});

router.post('/login', login);
router.post('/register', register);

module.exports = router;