import dotenv from "dotenv";
import { server } from "./app.js";
import connectToDB from "./config/database.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("CRITICAL CONFIGURATION ERROR: MONGO_URI environment variable is missing.");
  process.exit(1);
}

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectToDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
