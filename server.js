
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// Services
const { addJob, getQueueStatus } = require("./services/queueService");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   UPLOAD SETUP
================================ */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* Fields coming from frontend */
const fields = [
  { name: "addressProof", maxCount: 1 },
  { name: "photo", maxCount: 1 },
  { name: "marksheet10", maxCount: 1 },
  { name: "marksheet12", maxCount: 1 },
  { name: "aadhar", maxCount: 1 },
];

/* ===============================
//    RECAPTCHA VERIFICATION FUNCTION
// ================================ */

async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn("⚠️  RECAPTCHA_SECRET_KEY not found in environment variables");
    throw new Error("reCAPTCHA secret key not configured");
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );

    console.log("✅ reCAPTCHA verification response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ reCAPTCHA verification error:", error.message);
    throw new Error("Failed to verify reCAPTCHA");
  }
}

/* ===============================
   SUBMIT ENDPOINT (WITH RECAPTCHA)
================================ */
app.post("/api/submit", upload.fields(fields), async (req, res) => {
  try {
     const { recaptchaToken } = req.body;

    // ✅ STEP 1: Verify reCAPTCHA
    if (!recaptchaToken) {
      console.warn("⚠️  No reCAPTCHA token provided");
      return res.status(400).json({ 
        error: "reCAPTCHA token is missing. Please complete the verification." 
      });
    }

    console.log("🔒 Verifying reCAPTCHA token...");
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);

    if (!recaptchaResult.success) {
      console.error("❌ reCAPTCHA verification failed:", recaptchaResult["error-codes"]);
      return res.status(400).json({ 
        error: "reCAPTCHA verification failed. Please try again.",
        details: recaptchaResult["error-codes"] || []
      });
    }

    // Optional: Check score for reCAPTCHA v3 (if using v3 instead of v2)
    if (recaptchaResult.score && recaptchaResult.score < 0.5) {
      console.warn("⚠️  Low reCAPTCHA score:", recaptchaResult.score);
      return res.status(400).json({ 
        error: "Security check failed. Please try again." 
      });
    }

    console.log("✅ reCAPTCHA verified successfully");
  

    // ✅ STEP 2: Process form data
    const formData = {
      ...req.body,
      submittedAt: new Date().toISOString(),
    };

    // Remove recaptchaToken from stored data
    // delete formData.recaptchaToken;

    if (!formData.fullName) {
      return res.status(400).json({ error: "Full name required" });
    }

    // Collect uploaded files
    const uploadedFiles = Object.values(req.files || {}).flat();

    console.log("📝 Form data received:", {
      fullName: formData.fullName,
      email: formData.email,
      filesCount: uploadedFiles.length
    });

    // ✅ STEP 3: Add job to queue (non-blocking)
    const jobId = addJob({
      formData,
      uploadedFiles,
      uploadDir,
    });

    console.log("✅ Job added to queue:", jobId);

    // ✅ STEP 4: INSTANT RESPONSE (2-3 seconds)
    res.json({
      success: true,
      message: "Form submitted successfully! Processing in background.",
      jobId: jobId,
      info: "You will receive a confirmation email shortly.",
    });

    // Background processing continues automatically...

  } catch (err) {
    console.error("❌ ERROR:", err);
    
    // Handle specific reCAPTCHA errors
    if (err.message.includes("reCAPTCHA")) {
      return res.status(400).json({ 
        error: "Security verification failed. Please try again." 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend started successfully 🚀");
});

/* ===============================
   QUEUE STATUS ENDPOINT (OPTIONAL)
================================ */
app.get("/api/queue-status", (req, res) => {
  res.json(getQueueStatus());
});

/* ===============================
   HEALTH CHECK
================================ */
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    recaptchaConfigured: !!process.env.RECAPTCHA_SECRET_KEY,
    timestamp: new Date().toISOString()
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔒 reCAPTCHA: ${process.env.RECAPTCHA_SECRET_KEY ? '✅ Configured' : '⚠️  NOT CONFIGURED - Add RECAPTCHA_SECRET_KEY to .env'}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
});