
import atlasConnection from "../db/atlasDb.js";
import { generateEmbedding } from "./embeddingService.js";

const INDEX_NAME = "hr_policy_vector_index";
const COLLECTION_NAME = "hrpolicychunks";

// Initial threshold only. Validate it against your actual search results.
const MIN_RELEVANCE_SCORE = 0.70;

export async function retrieveRelevantPolicies(question, limit = 5) {
    if (typeof question !== "string" || !question.trim()) {
        return [];
    }

    // Wait until the separate Atlas connection is ready.
    await atlasConnection.asPromise();

    // Convert the user's question into a vector.
    const queryVector = await generateEmbedding(question);

    if (
        !Array.isArray(queryVector) ||
        queryVector.length !== 3072 ||
        !queryVector.every(Number.isFinite)
    ) {
        throw new Error("The question embedding is invalid.");
    }

    const collection = atlasConnection.collection(COLLECTION_NAME);

    const results = await collection.aggregate([
        {
            $vectorSearch: {
                index: INDEX_NAME,
                path: "embedding",
                queryVector,
                numCandidates: 50,
                limit: Math.min(Math.max(Number(limit) || 5, 1), 10)
            }
        },
        {
            $project: {
                _id: 0,
                documentName: 1,
                content: 1,
                documentId: 1,
                score: { $meta: "vectorSearchScore" }
            }
        }
    ]).toArray();

    // Keep only sufficiently relevant policy chunks.
    return results.filter(
        (result) =>
            Number.isFinite(result.score) &&
            result.score >= MIN_RELEVANCE_SCORE &&
            typeof result.content === "string" &&
            result.content.trim().length > 0
    );
}
