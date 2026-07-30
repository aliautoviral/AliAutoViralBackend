require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;

/* ---------------- SECURITY ---------------- */

app.use(helmet());

app.use(
    cors({
        origin: "*"
    })
);

app.use(
    express.json({
        limit: "2mb"
    })
);

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
});

app.use("/api/", apiLimiter);


/* ---------------- HOME ---------------- */

app.get("/", function (req, res) {

    res.json({
        success: true,
        app: "Ali Auto Viral Backend",
        status: "online"
    });

});


/* ---------------- HEALTH CHECK ---------------- */

app.get("/api/health", function (req, res) {

    res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString()
    });

});


/* ---------------- CREATE VIDEO ---------------- */

app.post("/api/video/create", function (req, res) {

    try {

        const body = req.body || {};

        const photoPath = body.photo_path;
        const voicePath = body.voice_path;
        const quality = body.quality;
        const style = body.style;
        const instruction = body.instruction || "";

        /* PHOTO */

        if (!photoPath) {

            return res.status(400).json({
                success: false,
                error: "Photo is required."
            });

        }


        /* VOICE */

        if (!voicePath) {

            return res.status(400).json({
                success: false,
                error: "Voice recording is required."
            });

        }


        /* QUALITY */

        const allowedQualities = [
            "1080p",
            "360p",
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


        /* STYLE */

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


        /* JOB ID */

        const jobId =
            "job_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10);


        console.log("");
        console.log("========== NEW VIDEO JOB ==========");
        console.log("Job ID:", jobId);
        console.log("Quality:", quality);
        console.log("Style:", style);
        console.log("Instruction:", instruction);
        console.log("===================================");
        console.log("");


        /*
         * IMPORTANT:
         *
         * Abhi AI provider connect nahi kiya gaya hai.
         *
         * Ye endpoint sirf request receive karke
         * validate karta hai.
         *
         * Agle stage mein:
         *
         * Photo upload
         * Voice upload
         * Photo enhancement
         * AI video generation
         * Job status
         * Video download
         *
         * add kiya jayega.
         */


        return res.status(202).json({

            success: true,

            message:
                "Video request received successfully.",

            job_id: jobId,

            status: "queued",

            requested_quality: quality,

            requested_style: style,

            face_preservation: true,

            photo_enhancement: true,

            voice_enhancement: true,

            natural_voice: true

        });

    } catch (error) {

        console.error(
            "Video creation error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Internal backend error."

        });

    }

});


/* ---------------- 404 ---------------- */

app.use(function (req, res) {

    res.status(404).json({

        success: false,

        error: "Endpoint not found."

    });

});


/* ---------------- START SERVER ---------------- */

app.listen(PORT, function () {

    console.log("");
    console.log(
        "======================================"
    );

    console.log(
        "Ali Auto Viral Backend is running"
    );

    console.log(
        "Port:",
        PORT
    );

    console.log(
        "======================================"
    );

});
