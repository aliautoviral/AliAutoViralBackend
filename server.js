require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const app = express();

const PORT = process.env.PORT || 3000;

const DID_API_KEY = process.env.DID_API_KEY;

const DID_BASE_URL = "https://api.d-id.com";

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
 * Multipart uploads
 *
 * Files stay in memory temporarily.
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
 * Check D-ID configuration
 */
function checkDidApiKey() {

    if (!DID_API_KEY) {

        throw new Error(
            "DID_API_KEY environment variable is missing."
        );
    }

    return DID_API_KEY;
}

/*
 * D-ID authentication header
 *
 * D-ID key format:
 *
 * API_USERNAME:API_PASSWORD
 *
 * The complete value is encoded
 * and sent as Basic authentication.
 */
function getDidHeaders() {

    const apiKey =
        checkDidApiKey();

    const encoded =
        Buffer
            .from(apiKey, "utf8")
            .toString("base64");

    return {
        "Authorization":
            "Basic " + encoded,

        "Accept":
            "application/json"
    };
}

/*
 * Read JSON response safely
 */
async function readJsonResponse(response) {

    const text =
        await response.text();

    let data;

    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch (error) {

        data = {
            raw: text
        };
    }

    return data;
}

/*
 * Upload image to D-ID
 */
async function uploadImageToDid(
    file
) {

    const form =
        new FormData();

    const blob =
        new Blob(
            [file.buffer],
            {
                type:
                    file.mimetype ||
                    "image/jpeg"
            }
        );

    form.append(
        "image",
        blob,
        file.originalname ||
            "photo.jpg"
    );

    const response =
        await fetch(
            DID_BASE_URL +
                "/images",
            {
                method:
                    "POST",

                headers:
                    getDidHeaders(),

                body:
                    form
            }
        );

    const data =
        await readJsonResponse(
            response
        );

    if (!response.ok) {

        throw new Error(
            "D-ID image upload failed (" +
            response.status +
            "): " +
            JSON.stringify(data)
        );
    }

    return data;
}

/*
 * Upload audio to D-ID
 */
async function uploadAudioToDid(
    file
) {

    if (
        file.size >
        6 * 1024 * 1024
    ) {

        throw new Error(
            "Voice file is larger than D-ID's 6 MB audio upload limit."
        );
    }

    const form =
        new FormData();

    const blob =
        new Blob(
            [file.buffer],
            {
                type:
                    file.mimetype ||
                    "audio/mpeg"
            }
        );

    form.append(
        "audio",
        blob,
        file.originalname ||
            "voice.mp3"
    );

    const response =
        await fetch(
            DID_BASE_URL +
                "/audios",
            {
                method:
                    "POST",

                headers:
                    getDidHeaders(),

                body:
                    form
            }
        );

    const data =
        await readJsonResponse(
            response
        );

    if (!response.ok) {

        throw new Error(
            "D-ID audio upload failed (" +
            response.status +
            "): " +
            JSON.stringify(data)
        );
    }

    return data;
}

/*
 * Create D-ID talk video
 */
async function createDidTalk(
    imageUrl,
    audioUrl,
    quality,
    style
) {

    const body = {

        source_url:
            imageUrl,

        script: {

            type:
                "audio",

            audio_url:
                audioUrl
        },

        config: {

            result_format:
                "mp4"
        },

        name:
            "Ali Auto Viral Video"
    };

    /*
     * Keep the requested options
     * visible in our own metadata.
     */
    if (quality) {

        body.user_data =
            JSON.stringify({
                quality:
                    quality,

                style:
                    style || "Natural"
            });
    }

    const response =
        await fetch(
            DID_BASE_URL +
                "/talks",
            {
                method:
                    "POST",

                headers: {

                    ...getDidHeaders(),

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        body
                    )
            }
        );

    const data =
        await readJsonResponse(
            response
        );

    if (!response.ok) {

        throw new Error(
            "D-ID video creation failed (" +
            response.status +
            "): " +
            JSON.stringify(data)
        );
    }

    return data;
}

/*
 * Get D-ID talk status
 */
async function getDidTalk(
    talkId
) {

    const response =
        await fetch(
            DID_BASE_URL +
                "/talks/" +
                encodeURIComponent(
                    talkId
                ),
            {
                method:
                    "GET",

                headers:
                    getDidHeaders()
            }
        );

    const data =
        await readJsonResponse(
            response
        );

    if (!response.ok) {

        throw new Error(
            "D-ID status request failed (" +
            response.status +
            "): " +
            JSON.stringify(data)
        );
    }

    return data;
}

/*
 * Home
 */
app.get(
    "/",
    function (
        req,
        res
    ) {

        res.status(200).json({

            success:
                true,

            app:
                "Ali Auto Viral Backend",

            status:
                "online"
        });
    }
);

/*
 * Health
 */
app.get(
    "/api/health",
    function (
        req,
        res
    ) {

        res.status(200).json({

            success:
                true,

            status:
                "healthy",

            did_api_configured:
                Boolean(
                    DID_API_KEY
                ),

            timestamp:
                new Date()
                    .toISOString()
        });
    }
);

/*
 * Create video
 *
 * Receives:
 *
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
            name:
                "photo",

            maxCount:
                1
        },

        {
            name:
                "voice",

            maxCount:
                1
        }

    ]),

    async function (
        req,
        res
    ) {

        try {

            /*
             * Check API key
             */
            checkDidApiKey();

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
             * Validate photo
             */
            if (!photo) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Photo is required."
                });
            }

            /*
             * Validate voice
             */
            if (!voice) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Voice recording is required."
                });
            }

            /*
             * Validate quality
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

                    success:
                        false,

                    error:
                        "Invalid video quality."
                });
            }

            /*
             * Validate style
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

                    success:
                        false,

                    error:
                        "Invalid video style."
                });
            }

            /*
             * Generate our own job ID
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
                "New D-ID video request"
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

            /*
             * Upload photo to D-ID
             */
            console.log(
                "Uploading photo to D-ID..."
            );

            const imageResult =
                await uploadImageToDid(
                    photo
                );

            console.log(
                "D-ID image uploaded."
            );

            /*
             * Find returned image URL
             */
            const imageUrl =
                imageResult.url ||
                imageResult.source_url;

            if (!imageUrl) {

                throw new Error(
                    "D-ID did not return an image URL."
                );
            }

            /*
             * Upload voice to D-ID
             */
            console.log(
                "Uploading voice to D-ID..."
            );

            const audioResult =
                await uploadAudioToDid(
                    voice
                );

            console.log(
                "D-ID audio uploaded."
            );

            /*
             * Find returned audio URL
             */
            const audioUrl =
                audioResult.url ||
                audioResult.source_url;

            if (!audioUrl) {

                throw new Error(
                    "D-ID did not return an audio URL."
                );
            }

            /*
             * Create D-ID video
             */
            console.log(
                "Creating D-ID talk..."
            );

            const talkResult =
                await createDidTalk(
                    imageUrl,
                    audioUrl,
                    quality,
                    style
                );

            const talkId =
                talkResult.id;

            if (!talkId) {

                throw new Error(
                    "D-ID did not return a talk ID."
                );
            }

            console.log(
                "D-ID talk created:",
                talkId
            );

            /*
             * Return immediately.
             *
             * Video generation is asynchronous.
             */
            return res.status(202).json({

                success:
                    true,

                message:
                    "Video generation started successfully.",

                job_id:
                    jobId,

                did_talk_id:
                    talkId,

                status:
                    talkResult.status ||
                    "created",

                requested_quality:
                    quality,

                requested_style:
                    style
            });

        } catch (
            error
        ) {

            console.error(
                "Video request error:",
                error.message
            );

            return res.status(500).json({

                success:
                    false,

                error:
                    error.message ||
                    "Unable to create video."
            });
        }
    }
);

/*
 * Check video status
 *
 * Android can call:
 *
 * GET /api/video/status/TALK_ID
 */
app.get(
    "/api/video/status/:talkId",

    async function (
        req,
        res
    ) {

        try {

            checkDidApiKey();

            const talkId =
                req.params.talkId;

            if (!talkId) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Talk ID is required."
                });
            }

            const result =
                await getDidTalk(
                    talkId
                );

            return res.status(200).json({

                success:
                    true,

                id:
                    result.id,

                status:
                    result.status,

                result_url:
                    result.result_url ||
                    null,

                created_at:
                    result.created_at ||
                    null,

                started_at:
                    result.started_at ||
                    null,

                modified_at:
                    result.modified_at ||
                    null
            });

        } catch (
            error
        ) {

            console.error(
                "Status error:",
                error.message
            );

            return res.status(500).json({

                success:
                    false,

                error:
                    error.message ||
                    "Unable to check video status."
            });
        }
    }
);

/*
 * 404
 */
app.use(
    function (
        req,
        res
    ) {

        res.status(404).json({

            success:
                false,

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

        res.status(500).json({

            success:
                false,

            error:
                "Internal server error."
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
