const { PrismaClient } = require("../generated/prisma");//require("@prisma/client");
const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();


const VoteSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
  bookId: z.string()
});

const vote = async (req, res) => {
  try {
    const data = req.body;

    console.log("Received registration data:", data); // Debugging log

    // 2. Validate the input
    const validation = VoteSchema.safeParse(data);

    if (!validation.success) {
      console.error("Validation errors:", validation.error);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validation.error.errors 
      });
    }

    const { rating, comment, bookId } = validation.data;
 
    // 3. Check for existing user
    const existingRating = await prisma.rating.findFirst({
      where: { bookId,userId: req.userId },
    });

    console.log("Existing rating found:", existingRating); // Debugging log
    console.log("User ID from token:", req.userId); // Debugging log

    if (existingRating) {
      await prisma.rating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          comment
        },
      });
    } else {
      await prisma.rating.create({
        data: {
          score:rating,
          comment,
          bookId,
          userId: req.userId
        },
      });
    }



    return res.status(201).json({
      message: "Rating registered successfully",
      
    });

  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// Use module.exports for CommonJS
module.exports = {
  vote,
};