require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;

/*
 * Security
 */
app.use(helmet());

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
    })
);

app.use(
    express.json({
        limit: "2mb"
    })
);

/*
 * Rate limiting
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many requests. Please try again later."
    }
});

app.use("/api/", apiLimiter);

/*
 * Home
 */
app.get("/", function (req, res) {

    res.status(200).json({
        success: true,
        app: "Ali Auto Viral Backend",
        status: "online"
    });
});

/*
 * Health check
 */
app.get("/api/health", function (req, res) {

    res.status(200).json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

/*
 * Create video request
 *
 * IMPORTANT:
 * At this stage this endpoint only validates
 * and queues the request.
 *
 * It does NOT pretend that an AI video
 * has already been generated.
 */
app.post("/api/video/create", function (req, res) {

    try {

        const body = req.body || {};

        const photoPath = body.photo_path;
        const voicePath = body.voice_path;
        const quality = body.quality;
        const style = body.style;
        const instruction = body.instruction;

        /*
         * Required fields
         */
        if (!photoPath) {

            return res.status(400).json({
                success: false,
                error: "Photo is required."
            });
        }

        if (!voicePath) {

            return res.status(400).json({
                success: false,
                error: "Voice recording is required."
            });
        }

        /*
         * Allowed video qualities
         */
        const allowedQualities = [
            "360p",
            "1080p",
            "1440p",
            "4K",
            "8K"
        ];

        if (!allowedQualities.includes(quality)) {

            return res.status(400).json({
                success: false,
                error: "Invalid video quality."
            });
        }

        /*
         * Allowed styles
         */
        const allowedStyles = [
            "Natural",
            "Cinematic"
        ];

        if (!allowedStyles.includes(style)) {

            return res.status(400).json({
                success: false,
                error: "Invalid video style."
            });
        }

        /*
         * Basic instruction validation
         */
        if (
            instruction &&
            typeof instruction !== "string"
        ) {

            return res.status(400).json({
                success: false,
                error: "Instruction must be text."
            });
        }

        /*
         * Generate a temporary job ID.
         */
        const jobId =
            "job_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10);

        console.log("");
        console.log("================================");
        console.log("New video request");
        console.log("Job ID:", jobId);
        console.log("Quality:", quality);
        console.log("Style:", style);
        console.log(
            "Instruction:",
            instruction || ""
        );
        console.log("================================");
        console.log("");

        /*
         * Do not expose local Android paths
         * in the response.
         */
        return res.status(202).json({

            success: true,

            message:
                "Video request received successfully.",

            job_id: jobId,

            status: "queued",

            requested_quality: quality,

            requested_style: style,

            features: {
                face_preservation: true,
                photo_enhancement: true,
                voice_enhancement: true,
                natural_voice: true
            }
        });

    } catch (error) {

        console.error(
            "Video request error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Internal backend error."
        });
    }
});

/*
 * 404 handler
 */
app.use(function (req, res) {

    res.status(404).json({

        success: false,

        error:
            "Endpoint not found."
    });
});

/*
 * Global error handler
 */
app.use(function (
    error,
    req,
    res,
    next
) {

    console.error(
        "Server error:",
        error
    );

    res.status(500).json({

        success: false,

        error:
            "Internal server error."
    });
});

/*
 * Start server
 */
app.listen(
    PORT,
    "0.0.0.0",
    function () {

        console.log(
            "Ali Auto Viral backend running on port " +
            PORT
        );
    }
);
