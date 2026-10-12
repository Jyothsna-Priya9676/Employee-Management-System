
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import HRPolicyChunk from "../models/HRPolicyChunk.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB maximum
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const isPdf =
            file.mimetype === "application/pdf" &&
            file.originalname.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            return callback(new Error("Only PDF files are allowed."));
        }

        callback(null, true);
    }
});

export const uploadHRPolicyMiddleware = upload.single("file");

export const uploadHRPolicy = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a PDF file."
            });
        }

        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found."
            });
        }

        const parser = new PDFParse({
    data: req.file.buffer
});

let parsed;

try {
    parsed = await parser.getText();
} finally {
    await parser.destroy();
}

const extractedText = parsed.text
    .replace(/\s+/g, " ")
    .trim();

        if (extractedText.length < 30) {
            return res.status(400).json({
                success: false,
                message: "The PDF has too little extractable text. Scanned PDFs need OCR."
            });
        }

        // Split text into chunks of about 1,000 characters.
        const chunkSize = 1000;
        const overlap = 150;
        const chunks = [];

        for (
            let start = 0;
            start < extractedText.length;
            start += chunkSize - overlap
        ) {
            const content = extractedText
                .slice(start, start + chunkSize)
                .trim();

            if (content) {
                chunks.push(content);
            }
        }

        const documentId = randomUUID();
        const documentName = req.file.originalname;

        const records = chunks.map((content, chunkIndex) => ({
            documentId,
            documentName,
            chunkIndex,
            content,
            uploadedBy: new mongoose.Types.ObjectId(req.user._id)
        }));

        await HRPolicyChunk.insertMany(records);

        return res.status(201).json({
            success: true,
            message: "HR policy uploaded and text extracted successfully.",
            document: {
                documentId,
                documentName,
                chunkCount: records.length,
                extractedCharacters: extractedText.length
            }
        });
    } catch (error) {
        console.error("HR policy upload error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process the HR policy PDF."
        });
    }
};
