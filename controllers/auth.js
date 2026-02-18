const { PrismaClient } = require("../generated/prisma");//require("@prisma/client");
const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

// 1. Define your Zod schema
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3).max(25),
  username: z.string().min(3).max(25),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3).max(25), // Just check it exists; length check was for registration
});

const register = async (req, res) => {
  try {
    const data = req.body;

    //console.log("Received registration data:", data); // Debugging log

    // 2. Validate the input
    const validation = RegisterSchema.safeParse(data);

    if (!validation.success) {
      console.error("Validation errors:", validation.error);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validation.error.errors 
      });
    }

    const { email, password, username } = validation.data;

    // 3. Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // 4. Hash the password before saving (Security Best Practice)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create the user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id
    });

  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  
  try {
    const data = req.body;

    // 2. Validate Input
    const validation = LoginSchema.safeParse(data);
    if (!validation.success) {
      return res.status(400).json({ message: "Invalid input", errors: validation.error.errors });
    }

    const { email, password } = validation.data;

    // 3. Find User in Database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Use a generic message for security (don't reveal if the email exists)
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4. Compare Passwords
    // bcrypt.compare(plainText, hashedValue)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 5. Generate a Token (Optional but standard)
    // You'll need an environment variable: JWT_SECRET
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your_fallback_secret",
      { expiresIn: "1h" }
    );

    // 6. Return Success
    return res.status(200).json({
      message: "User logged in successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Use module.exports for CommonJS
module.exports = {
  login,
  register
};