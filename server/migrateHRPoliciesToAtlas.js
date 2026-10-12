
import "dotenv/config";
import connectToDatabase from "./db/db.js";
import atlasConnection from "./db/atlasDb.js";
import LocalHRPolicyChunk from "./models/HRPolicyChunk.js";
import AtlasHRPolicyChunk from "./models/AtlasHRPolicyChunk.js";

async function migratePolicies() {
  try {
    // Connect to the existing local HRMS database.
    await connectToDatabase();

    // Wait until the separate Atlas connection is ready.
    await atlasConnection.asPromise();

    const documents = await LocalHRPolicyChunk.find({}).lean();

    if (documents.length === 0) {
      console.log("No local HR policy chunks were found.");
      return;
    }

    const operations = documents.map((document) => {
      const { _id, __v, ...fields } = document;

      return {
        updateOne: {
          filter: {
            documentId: document.documentId,
            chunkIndex: document.chunkIndex,
          },
          update: {
            $set: fields,
          },
          upsert: true,
        },
      };
    });

    const result = await AtlasHRPolicyChunk.bulkWrite(operations);

    console.log("HR policy migration completed.");
    console.log("Local chunks found:", documents.length);
    console.log("Atlas inserted:", result.upsertedCount);
    console.log("Atlas updated:", result.modifiedCount);

    const atlasDocuments = await AtlasHRPolicyChunk.find({})
      .select("documentName content embedding")
      .lean();

    console.log(
      "Atlas chunks with embeddings:",
      atlasDocuments.filter(
        (document) =>
          Array.isArray(document.embedding) &&
          document.embedding.length === 3072
      ).length
    );
  } catch (error) {
    console.error("HR policy migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await atlasConnection.close();
    await (await import("mongoose")).default.disconnect();
  }
}

await migratePolicies();
