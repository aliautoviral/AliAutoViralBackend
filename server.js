require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

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

/*
 * JSON support
 */
app.use(
    express.json({
        limit: "2mb"
    })
);

/*
 * Multipart upload support
 *
 * Files are kept in memory temporarily.
 * We do not expose them publicly.
 */
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

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
 * Receives:
 * photo
 * voice
 * quality
 * style
 * instruction
 */
app.post(
    "/api/video/create",

    upload.fields([
        {
            name: "photo",
            maxCount: 1
        },
        {
            name: "voice",
            maxCount: 1
        }
    ]),

    function (req, res) {

        try {

            const body =
                req.body || {};

            const files =
                req.files || {};

            const photo =
                files.photo &&
                files.photo[0];

            const voice =
                files.voice &&
                files.voice[0];

            const quality =
                body.quality;

            const style =
                body.style;

            const instruction =
                body.instruction || "";

            /*
             * Check photo
             */
            if (!photo) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Photo is required."
                });
            }

            /*
             * Check voice
             */
            if (!voice) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Voice recording is required."
                });
            }

            /*
             * Allowed qualities
             */
            const allowedQualities = [
                "360p",
                "1080p",
                "1440p",
                "4K",
                "8K"
            ];

            if (
                !allowedQualities.includes(
                    quality
                )
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid video quality."
                });
            }

            /*
             * Allowed styles
             */
            const allowedStyles = [
                "Natural",
                "Cinematic"
            ];

            if (
                !allowedStyles.includes(
                    style
                )
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid video style."
                });
            }

            /*
             * Instruction validation
             */
            if (
                typeof instruction !==
                "string"
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Instruction must be text."
                });
            }

            /*
             * Generate job ID
             */
            const jobId =
                "job_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .substring(2, 10);

            /*
             * Log basic information.
             *
             * Do NOT log the actual
             * photo/voice contents.
             */
            console.log("");
            console.log(
                "================================"
            );

            console.log(
                "New video request"
            );

            console.log(
                "Job ID:",
                jobId
            );

            console.log(
                "Photo:",
                photo.originalname,
                photo.size,
                "bytes"
            );

            console.log(
                "Voice:",
                voice.originalname,
                voice.size,
                "bytes"
            );

            console.log(
                "Quality:",
                quality
            );

            console.log(
                "Style:",
                style
            );

            console.log(
                "Instruction:",
                instruction
            );

            console.log(
                "================================"
            );

            console.log("");

            /*
             * At this stage the request is
             * successfully received.
             *
             * Actual AI generation will be
             * connected in the next stage.
             */
            return res.status(202).json({

                success: true,

                message:
                    "Photo and voice received successfully.",

                job_id:
                    jobId,

                status:
                    "queued",

                photo: {
                    received: true,
                    filename:
                        photo.originalname,
                    size:
                        photo.size
                },

                voice: {
                    received: true,
                    filename:
                        voice.originalname,
                    size:
                        voice.size
                },

                requested_quality:
                    quality,

                requested_style:
                    style,

                features: {

                    face_preservation:
                        body.face_preservation ===
                        "true",

                    photo_enhancement:
                        body.photo_enhancement ===
                        "true",

                    voice_enhancement:
                        body.voice_enhancement ===
                        "true",

                    natural_voice:
                        body.natural_voice ===
                        "true"
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
    }
);

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
