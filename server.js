require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

/*
 * Upload directory
 */
const uploadDirectory = path.join(
    __dirname,
    "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

/*
 * Multer configuration
 *
 * Files are temporarily stored on the server.
 */
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            uploadDirectory
        );
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(
                file.originalname
            );

        const uniqueName =
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10) +
            extension;

        cb(
            null,
            uniqueName
        );
    }
});

const upload = multer({

    storage: storage,

    limits: {
        fileSize:
            100 * 1024 * 1024
    },

    fileFilter: function (
        req,
        file,
        cb
    ) {

        if (
            file.fieldname === "photo"
        ) {

            if (
                file.mimetype.startsWith(
                    "image/"
                )
            ) {

                cb(null, true);

            } else {

                cb(
                    new Error(
                        "Photo must be an image file."
                    )
                );
            }

            return;
        }

        if (
            file.fieldname === "voice"
        ) {

            if (
                file.mimetype.startsWith(
                    "audio/"
                )
            ) {

                cb(null, true);

            } else {

                cb(
                    new Error(
                        "Voice must be an audio file."
                    )
                );
            }

            return;
        }

        cb(
            new Error(
                "Unexpected file field."
            )
        );
    }
});

/*
 * Security
 */
app.use(helmet());

app.use(
    cors({
        origin: "*",
        methods: [
            "GET",
            "POST"
        ],
        allowedHeaders: [
            "Content-Type"
        ]
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

    windowMs:
        60 * 1000,

    max: 30,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        success: false,
        error:
            "Too many requests. Please try again later."
    }
});

app.use(
    "/api/",
    apiLimiter
);

/*
 * Home
 */
app.get(
    "/",
    function (req, res) {

        res.status(200).json({

            success: true,

            app:
                "Ali Auto Viral Backend",

            status:
                "online"
        });
    }
);

/*
 * Health check
 */
app.get(
    "/api/health",
    function (req, res) {

        res.status(200).json({

            success: true,

            status:
                "healthy",

            timestamp:
                new Date().toISOString()
        });
    }
);

/*
 * Create video request
 *
 * Receives:
 *
 * photo
 * voice
 * quality
 * style
 * instruction
 *
 * The actual AI generation is NOT
 * connected yet.
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

            const photoFiles =
                files.photo || [];

            const voiceFiles =
                files.voice || [];

            /*
             * Check photo
             */
            if (
                photoFiles.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Photo file is required."
                });
            }

            /*
             * Check voice
             */
            if (
                voiceFiles.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Voice recording file is required."
                });
            }

            /*
             * Read text fields
             */
            const quality =
                body.quality;

            const style =
                body.style;

            const instruction =
                body.instruction || "";

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
             * Uploaded files
             */
            const photo =
                photoFiles[0];

            const voice =
                voiceFiles[0];

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
                photo.originalname
            );

            console.log(
                "Photo size:",
                photo.size,
                "bytes"
            );

            console.log(
                "Voice:",
                voice.originalname
            );

            console.log(
                "Voice size:",
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
             * IMPORTANT
             *
             * At this stage we only confirm
             * that the files reached the backend.
             *
             * AI generation will be connected
             * in the next stage.
             */
            return res.status(202).json({

                success: true,

                message:
                    "Photo and voice uploaded successfully.",

                job_id:
                    jobId,

                status:
                    "queued",

                requested_quality:
                    quality,

                requested_style:
                    style,

                uploaded_files: {

                    photo: {
                        original_name:
                            photo.originalname,

                        size:
                            photo.size
                    },

                    voice: {
                        original_name:
                            voice.originalname,

                        size:
                            voice.size
                    }
                },

                features: {

                    face_preservation:
                        true,

                    photo_enhancement:
                        true,

                    voice_enhancement:
                        true,

                    natural_voice:
                        true
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
app.use(
    function (req, res) {

        res.status(404).json({

            success: false,

            error:
                "Endpoint not found."
        });
    }
);

/*
 * Global error handler
 */
app.use(
    function (
        error,
        req,
        res,
        next
    ) {

        console.error(
            "Server error:",
            error
        );

        res.status(400).json({

            success: false,

            error:
                error.message ||
                "Server error."
        });
    }
);

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
