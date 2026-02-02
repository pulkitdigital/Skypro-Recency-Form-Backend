require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

/* Fields coming from frontend */
const fields = [
  { name: "passportPhoto", maxCount: 1 },
  { name: "foreignLicense", maxCount: 1 },
  { name: "ca40IR", maxCount: 1 },
  { name: "signalReceptionTest", maxCount: 1 },
  { name: "c172CheckrideStatement", maxCount: 1 },
  { name: "c172FlightReview", maxCount: 1 },
  { name: "pic100Statement", maxCount: 1 },
  { name: "xc300Statement", maxCount: 1 },
  { name: "picXCStatement", maxCount: 1 },
  { name: "instrumentTimeStatement", maxCount: 1 },
  { name: "medicalAssessment", maxCount: 1 },
  { name: "rtr", maxCount: 1 },
  { name: "frtol", maxCount: 1 },
  { name: "policeVerification", maxCount: 1 },
  { name: "marksheet10", maxCount: 1 },
  { name: "marksheet12", maxCount: 1 },
  { name: "nameChangeCertificate", maxCount: 1 },
  { name: "studentSignature", maxCount: 1 },
  { name: "finalSignature", maxCount: 1 },
];

// Dynamic DGCA exam fields
for (let i = 0; i < 10; i++) {
  fields.push({ name: `dgcaExam_airNavigation`, maxCount: 1 });
  fields.push({ name: `dgcaExam_meteorology`, maxCount: 1 });
  fields.push({ name: `dgcaExam_regulations`, maxCount: 1 });
  fields.push({ name: `dgcaExam_technicalGeneral`, maxCount: 1 });
  fields.push({ name: `dgcaExam_technicalSpecific`, maxCount: 1 });
  fields.push({ name: `dgcaExam_compositePaper`, maxCount: 1 });
}

/* ===============================
   SUBMIT ENDPOINT
================================ */
app.post("/api/submit-conversion", upload.fields(fields), async (req, res) => {
  try {
    console.log("📥 Received conversion form submission");

    // Process form data
    const formData = {
      ...req.body,
      submittedAt: new Date().toISOString(),
    };

    // Parse JSON fields
    if (formData.dgcaExams && typeof formData.dgcaExams === 'string') {
      formData.dgcaExams = JSON.parse(formData.dgcaExams);
    }
    
    if (formData.sortieRows && typeof formData.sortieRows === 'string') {
      formData.sortieRows = JSON.parse(formData.sortieRows);
    }
    
    if (formData.dgcaExamDetails && typeof formData.dgcaExamDetails === 'string') {
      formData.dgcaExamDetails = JSON.parse(formData.dgcaExamDetails);
    }

    if (!formData.fullName) {
      return res.status(400).json({ error: "Full name required" });
    }

    // Collect uploaded files
    const uploadedFiles = Object.values(req.files || {}).flat();

    console.log("📝 Form data received:", {
      fullName: formData.fullName,
      email: formData.email,
      contractingState: formData.contractingState,
      filesCount: uploadedFiles.length,
      sortieRowsCount: formData.sortieRows?.length || 0,
      dgcaExamsCount: formData.dgcaExamDetails?.length || 0
    });

    // Validate required files
    const requiredFiles = [
      'passportPhoto',
      'foreignLicense',
      'studentSignature',
      'finalSignature'
    ];

    // Check conditional required files
    if (formData.last6MonthsAvailable === "Yes") {
      requiredFiles.push('ca40IR');
      if (formData.signalReception === "Yes") {
        requiredFiles.push('signalReceptionTest');
      }
    }

    if (formData.commercialCheckride === "C172") {
      requiredFiles.push('c172CheckrideStatement');
    } else if (formData.c172PICOption === "flightReview") {
      requiredFiles.push('c172FlightReview');
    }

    if (formData.nameChangeProcessed === "Yes") {
      requiredFiles.push('nameChangeCertificate');
    }

    const missingFiles = requiredFiles.filter(fieldName => 
      !uploadedFiles.some(f => f.fieldname === fieldName)
    );

    if (missingFiles.length > 0) {
      console.warn("⚠️ Missing required files:", missingFiles);
    }

    // Add job to queue (non-blocking)
    const jobId = addJob({
      formData,
      uploadedFiles,
      uploadDir,
    });

    console.log("✅ Job added to queue:", jobId);

    // INSTANT RESPONSE
    res.json({
      success: true,
      message: "Form submitted successfully! Processing in background.",
      jobId: jobId,
      info: "You will receive a confirmation email shortly.",
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Conversion & Recency Backend started successfully 🚀");
});

/* ===============================
   QUEUE STATUS ENDPOINT
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
    timestamp: new Date().toISOString()
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
});