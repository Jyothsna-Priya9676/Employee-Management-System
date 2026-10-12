
import mongoose from "mongoose";

const atlasConnection = mongoose.createConnection(
  process.env.ATLAS_MONGO_URL,
  {
    serverSelectionTimeoutMS: 10000,
  }
);

atlasConnection.on("connected", () => {
  console.log("MongoDB Atlas connected successfully");
});

atlasConnection.on("error", (error) => {
  console.error("MongoDB Atlas connection error:", error.message);
});

export default atlasConnection;
