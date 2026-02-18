const jwt = require("jsonwebtoken");
const { de } = require("zod/locales");

/** auth middleware */
const authenticated = (req, res, next) => {
    try {        

        const token = req.headers.authorization.split(" ")[1];

        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
       // console.log('auth middleware token ',decoded)

        req.userId = decoded.userId;

        next()

    } catch (error) {
      console.log('auth middle error ',error.message)
        return res.status(400).json({ error })
    }
}


module.exports = authenticated;