import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

async function signup(req, res) {
  try {
    const { username, password, profile_picture_url } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      profile_picture_url: profile_picture_url || "",
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create account" });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Login failed" });
  }
}

async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(sanitizeUser(user));
}

export { signup, login, me };
