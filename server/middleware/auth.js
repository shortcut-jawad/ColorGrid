import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.userId;
    } catch {
      return null;
    }
  }
  return null;
}

function requireAuth(req, res, next) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.userId = userId;
  return next();
}

export { getUserIdFromRequest, requireAuth };
