
import mongoose from "mongoose";

const testAtlasConnection = async () => {
    try {
        const atlasUrl = process.env.ATLAS_MONGO_URL;

        if (!atlasUrl) {
            throw new Error("ATLAS_MONGO_URL is missing from .env");
        }

        console.log("Connecting to MongoDB Atlas...");

        await mongoose.connect(atlasUrl, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("✅ MongoDB Atlas connected successfully!");
        console.log("Database:", mongoose.connection.name);

    } catch (error) {
        console.error("❌ Atlas connection failed:");
        console.error(error.message);

        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

testAtlasConnection();
