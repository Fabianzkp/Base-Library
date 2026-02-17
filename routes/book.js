const express = require("express");
const router = express.Router();
const path = require("path");

const { vote } = require('../controllers/rating');
 const authenticated  =require('../middleware/auth');


router.get("/:id", (req, res) => {

    res.sendFile(path.join(__dirname, "../pages/book/book.html"));
});

router.post('/rating/:id',authenticated, vote);

module.exports = router;