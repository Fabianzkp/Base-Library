const express = require("express");
const router = express.Router();
const path = require("path");

const { vote } = require('../controllers/rating');

// The route will be accessible via /auth/sign-in (depending on index.js)
router.get("/rating/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/rating/vote.html"));
});

router.post('/rating/:id', vote);
//router.post('/register', register);

module.exports = router;