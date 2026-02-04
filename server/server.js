import dotenv from "dotenv";
import { server } from "./app.js";
import connectToDB from "./config/database.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectToDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
