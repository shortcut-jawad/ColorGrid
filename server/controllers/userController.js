import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

async function updateProfile(req, res) {
  try {
    const { username, profile_picture_url, current_password, new_password } =
      req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    if (profile_picture_url !== undefined) {
      user.profile_picture_url = profile_picture_url;
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: "Current password required" });
      }
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password incorrect" });
      }
      user.password = await bcrypt.hash(new_password, 10);
    }

    await user.save();
    return res.json(sanitizeUser(user));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
}

export { updateProfile };
