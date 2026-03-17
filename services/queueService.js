// // services/queueService.js  ─  race-condition-free job queue

// const generatePDF = require("./pdfGenerator");
// const sendAdminEmail = require("./emailService");
// const { appendConversionRow } = require("./googleService");
// const fs = require("fs");

// /* ===============================
//    QUEUE STATE
// ================================ */
// const jobQueue = [];
// let isProcessing = false;
// const MAX_QUEUE_SIZE = 50;

// /* ===============================
//    PUBLIC: addJob
// ================================ */
// function addJob(jobData) {
//   if (jobQueue.length >= MAX_QUEUE_SIZE) {
//     throw new Error(
//       `Queue full (${MAX_QUEUE_SIZE} jobs). Please try again later.`
//     );
//   }

//   const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

//   jobQueue.push({
//     id: jobId,
//     data: jobData,
//     status: "pending",
//     createdAt: new Date(),
//     attempts: 0,
//   });

//   console.log(`✅ Job added: ${jobId}  (queue length: ${jobQueue.length})`);

//   if (!isProcessing) {
//     setImmediate(() => processQueue());
//   }

//   return jobId;
// }

// /* ===============================
//    QUEUE PROCESSOR
// ================================ */
// async function processQueue() {
//   if (isProcessing) {
//     console.log("⏭️  Queue already running – skipping duplicate call");
//     return;
//   }

//   isProcessing = true;
//   console.log("🚀 Queue processor started");

//   while (jobQueue.length > 0) {
//     const job = jobQueue[0];

//     try {
//       console.log(
//         `🔄 Processing ${job.id}  (attempt ${job.attempts + 1}/3)`
//       );
//       job.status = "processing";
//       job.attempts++;

//       await processJob(job.data);

//       job.status = "completed";
//       console.log(`✅ Completed ${job.id}`);
//       jobQueue.shift();
//     } catch (err) {
//       console.error(`❌ Failed ${job.id}:`, err.message);

//       if (job.attempts < 3) {
//         job.status = "retrying";
//         const wait = Math.min(job.attempts * 5000, 30000);
//         console.log(
//           `🔄 Will retry ${job.id} in ${wait / 1000}s  ` +
//             `(${3 - job.attempts} attempts left)`
//         );
//         jobQueue.push(jobQueue.shift()); // move to end
//         await delay(wait);
//       } else {
//         job.status = "failed";
//         job.error = err.message;
//         console.error(`💀 Job ${job.id} permanently failed after 3 attempts`);
//         jobQueue.shift();
//       }
//     }
//   }

//   isProcessing = false;
//   console.log("🏁 Queue processing completed");
// }

// /* ===============================
//    CORE JOB
// ================================ */
// async function processJob(jobData) {
//   const { formData, uploadedFiles } = jobData;

//   // ✅ generatePDF now returns { formPdfPath, mergedPdfPath }
//   let pdfResult = null;

//   try {
//     // 1️⃣  Generate PDF
//     console.log("📄 Generating PDF…");
//     pdfResult = await generatePDF(formData, uploadedFiles);

//     // ✅ Validate both paths exist
//     if (!pdfResult || typeof pdfResult !== "object") {
//       throw new Error("PDF generation failed – invalid return value");
//     }
//     const { formPdfPath, mergedPdfPath } = pdfResult;

//     if (!formPdfPath || !fs.existsSync(formPdfPath)) {
//       throw new Error("PDF generation failed – form PDF file not found");
//     }
//     if (!mergedPdfPath || !fs.existsSync(mergedPdfPath)) {
//       throw new Error("PDF generation failed – merged PDF file not found");
//     }

//     console.log(`✅ Form PDF   : ${formPdfPath}`);
//     console.log(`✅ Merged PDF : ${mergedPdfPath}`);

//     // 2️⃣  Send emails (BEFORE cleanup — files must exist for attachment reading)
//     console.log("📧 Sending emails…");
//     await sendAdminEmail({
//       formData,
//       pdfPath: pdfResult,       // ✅ pass the full { formPdfPath, mergedPdfPath } object
//       uploadedFiles: [],         // uploaded files already merged into PDFs
//     });
//     console.log("✅ Emails sent");

//     // 3️⃣  Google Sheet
//     console.log("📊 Updating Google Sheet…");
//     const sheetRow = buildSheetRow(formData, uploadedFiles);
//     await appendConversionRow(sheetRow);
//     console.log("✅ Sheet updated");

//   } finally {
//     // ✅ Cleanup AFTER emails are sent
//     // Clean: both generated PDFs + all uploaded temp files
//     const filesToClean = [
//       pdfResult?.formPdfPath,
//       pdfResult?.docsPdfPath,   // ✅ docs-only PDF for admin
//       pdfResult?.mergedPdfPath,
//       ...uploadedFiles.map((f) => f.path),
//     ].filter(Boolean);

//     cleanupFiles(filesToClean);
//   }
// }

// /* ===============================
//    SHEET ROW BUILDER
// ================================ */
// function buildSheetRow(formData, uploadedFiles) {
//   /* ── helpers ── */
//   const fileStatus = (name) =>
//     uploadedFiles.some((f) => f.fieldname === name) ? "Attached" : "Not Attached";

//   const getExamDetail = (examKey, field) => {
//     const exam = (formData.dgcaExamDetails || []).find(
//       (e) => e.exam === examKey
//     );
//     return exam?.[field] || "";
//   };

//   /* ── sortie summary ── */
//   let totalDayPIC = 0,
//     totalNightPIC = 0,
//     totalIF = 0,
//     totalNightPICLDG = 0,
//     totalNightPICTO = 0;

//   (formData.sortieRows || []).forEach((row) => {
//     const h = parseInt(row.hours) || 0;
//     const m = parseInt(row.minutes) || 0;
//     const t = h + m / 60;
//     if (row.typeOfFlight === "Day PIC") totalDayPIC += t;
//     if (row.typeOfFlight === "Night PIC") {
//       totalNightPIC += t;
//       totalNightPICLDG += parseInt(row.ldg) || 0;
//       totalNightPICTO += parseInt(row.to) || 0;
//     }
//     if (row.typeOfFlight === "IF") totalIF += t;
//   });

//   const fmtTime = (decimal) =>
//     `${Math.floor(decimal)}h ${Math.round((decimal % 1) * 60)}m`;

//   /* ── DGCA exams summary string ── */
//   const EXAM_LABELS = {
//     airNavigation:    "Air Navigation",
//     meteorology:      "Meteorology",
//     airRegulations:   "Air Regulations",
//     technicalGeneral: "Technical General",
//     technicalSpecific:"Technical Specific",
//     compositePaper:   "Composite Paper (Meteorology + Navigation)",
//   };

//   const dgcaExamsList =
//     (formData.dgcaExamDetails || []).length > 0
//       ? formData.dgcaExamDetails
//           .map((exam) => {
//             const label = EXAM_LABELS[exam.exam] || exam.exam;
//             const status =
//               exam.validity === "Expired"
//                 ? "❌ EXPIRED"
//                 : exam.validity === "SPL Exam Required"
//                 ? "⚠️ SPL EXAM REQUIRED"
//                 : `✅ Valid until ${exam.validity}`;
//             return `${label}: ${exam.resultDate} – ${status}`;
//           })
//           .join("; ")
//       : "None";

//   /* ── PIC hours display ── */
//   const picExp = `${formData.totalPICExperienceHours || 0}:${String(
//     formData.totalPICExperienceMinutes || 0
//   ).padStart(2, "0")}`;
//   const picXC = `${formData.totalPICCrossCountryHours || 0}:${String(
//     formData.totalPICCrossCountryMinutes || 0
//   ).padStart(2, "0")}`;

//   return [
//     /* A  */ new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),

//     /* ── SECTION 1: Personal Details ─────────────────────── */
//     /* B  */ formData.fullName || "",
//     /* C  */ formData.age || "",
//     /* D  */ formData.gender || "",
//     /* E  */ formData.mobile || "",
//     /* F  */ formData.email || "",
//     /* G  */ fileStatus("passportPhoto"),

//     /* ── SECTION 2: License Details ──────────────────────── */
//     /* H  */ formData.contractingState || "",
//     /* I  */ formData.licenseValidity || "",
//     /* J  */ formData.licenseEndorsement || "",
//     /* K  */ fileStatus("foreignLicense"),

//     /* ── SECTION 3: Total Flying Hours ───────────────────── */
//     /* L  */ `${formData.totalSEHours || 0}:${String(formData.totalSEMinutes || 0).padStart(2, "0")}`,
//     /* M  */ formData.licenseEndorsement === "SE ME IR"
//       ? `${formData.totalMEHours || 0}:${String(formData.totalMEMinutes || 0).padStart(2, "0")}`
//       : "N/A",
//     /* N  */ formData.totalHours || "",
//     /* O  */ formData.aircraftTypes || "",
//     /* P  */ formData.lastFlightDate || "",

//     /* ── SECTION 4: Last 6 Months ─────────────────────────── */
//     /* Q  */ formData.last6MonthsAvailable || "",
//     /* R  */ (formData.sortieRows || []).length,
//     /* S  */ fmtTime(totalDayPIC),
//     /* T  */ fmtTime(totalNightPIC),
//     /* U  */ totalNightPICLDG,
//     /* V  */ totalNightPICTO,
//     /* W  */ fmtTime(totalIF),
//     /* X  */ formData.irCheckGiven || "",
//     /* Y  */ formData.irCheckAircraft || "",
//     /* Z  */ formData.irCheckDate || "",
//     /* AA */ formData.irCheckValidity || "",
//     /* AB */ fileStatus("ca40IR"),

//     /* ── Signal Reception ────────────────────────────────── */
//     /* AC */ formData.signalReception || "",
//     /* AD */ formData.signalReceptionDate || "",
//     /* AE */ formData.signalReceptionValidity || "",
//     /* AF */ fileStatus("signalReceptionTest"),

//     /* ── SECTION 5: Commercial Checkride ────────────────── */
//     /* AG */ formData.commercialCheckride || "",
//     /* AH */ formData.c172CheckrideDate || "",
//     /* AI */ fileStatus("c172CheckrideStatement"),
//     /* AJ */ formData.c172PICOption || "",
//     /* AK */ fileStatus("c172FlightReview"),

//     /* ── SECTION 6: PIC Experience ───────────────────────── */
//     /* AL */ picExp,
//     /* AM */ fileStatus("pic100Statement"),
//     /* AN */ fileStatus("crossCountry300Statement"),
//     /* AO */ picXC,
//     /* AP */ fileStatus("picCrossCountryStatement"),
//     /* AQ */ formData.totalInstrumentTime || "",
//     /* AR */ `${formData.instrumentActualHours || 0}:${String(formData.instrumentActualMinutes || 0).padStart(2, "0")}`,
//     /* AS */ `${formData.instrumentSimulatorHours || 0}:${String(formData.instrumentSimulatorMinutes || 0).padStart(2, "0")}`,
//     /* AT */ fileStatus("instrumentTimeStatement"),

//     /* ── SECTION 7: Medical ───────────────────────────────── */
//     /* AU */ formData.medicalValidity || "",
//     /* AV */ fileStatus("medicalAssessment"),

//     /* ── SECTION 7: DGCA Exams ────────────────────────────── */
//     /* AW */ dgcaExamsList,

//     /* Air Navigation */
//     /* AX */ getExamDetail("airNavigation", "resultDate"),
//     /* AY */ getExamDetail("airNavigation", "validity"),
//     /* AZ */ fileStatus("dgcaExam_airNavigation"),

//     /* Meteorology */
//     /* BA */ getExamDetail("meteorology", "resultDate"),
//     /* BB */ getExamDetail("meteorology", "validity"),
//     /* BC */ fileStatus("dgcaExam_meteorology"),

//     /* Air Regulations */
//     /* BD */ getExamDetail("airRegulations", "resultDate"),
//     /* BE */ getExamDetail("airRegulations", "validity"),
//     /* BF */ fileStatus("dgcaExam_airRegulations"),

//     /* Technical General */
//     /* BG */ getExamDetail("technicalGeneral", "resultDate"),
//     /* BH */ getExamDetail("technicalGeneral", "validity"),
//     /* BI */ fileStatus("dgcaExam_technicalGeneral"),

//     /* Technical Specific */
//     /* BJ */ getExamDetail("technicalSpecific", "resultDate"),
//     /* BK */ getExamDetail("technicalSpecific", "validity"),
//     /* BL */ getExamDetail("technicalSpecific", "aircraft"),
//     /* BM */ fileStatus("dgcaExam_technicalSpecific"),

//     /* Composite Paper */
//     /* BN */ getExamDetail("compositePaper", "resultDate"),
//     /* BO */ getExamDetail("compositePaper", "validity"),
//     /* BP */ fileStatus("dgcaExam_compositePaper"),

//     /* ── SECTION 8: Additional Documents ────────────────── */
//     /* BQ */ fileStatus("rtrCertificate"),
//     /* BR */ formData.rtrValidity || "",
//     /* BS */ fileStatus("frtolCertificate"),
//     /* BT */ formData.policeVerificationDate || "",
//     /* BU */ fileStatus("policeVerification"),
//     /* BV */ fileStatus("marksheet10"),
//     /* BW */ fileStatus("marksheet12"),

//     /* SPL */
//     /* BX */ formData.hasSPL || "",
//     /* BY */ formData.splIssueDate || "",
//     /* BZ */ formData.splValidity || "",
//     /* CA */ fileStatus("splDocument"),

//     /* Name Change */
//     /* CB */ formData.nameChangeProcessed || "",
//     /* CC */ fileStatus("nameChangeCertificate"),

//     /* ── Signatures ───────────────────────────────────────── */
//     /* CD */ fileStatus("studentSignature"),
//     /* CE */ fileStatus("finalSignature"),

//     /* ── Referral ─────────────────────────────────────────── */
//     /* CF */ formData.hearAboutUs || "",
//   ];
// }

// /* ===============================
//    CLEANUP
// ================================ */
// function cleanupFiles(filePaths) {
//   filePaths.forEach((fp) => {
//     if (fp && fs.existsSync(fp)) {
//       try {
//         fs.unlinkSync(fp);
//         console.log(`🗑️  Deleted: ${fp}`);
//       } catch (e) {
//         console.error(`⚠️  Cleanup failed for ${fp}:`, e.message);
//       }
//     }
//   });
// }

// /* ===============================
//    UTILITY
// ================================ */
// const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// function getQueueStatus() {
//   return {
//     queueLength: jobQueue.length,
//     isProcessing,
//     maxQueueSize: MAX_QUEUE_SIZE,
//     jobs: jobQueue.map((j) => ({
//       id: j.id,
//       status: j.status,
//       attempts: j.attempts,
//       createdAt: j.createdAt,
//       studentName: j.data?.formData?.fullName || "Unknown",
//     })),
//   };
// }

// module.exports = { addJob, getQueueStatus };



























// services/queueService.js  ─  race-condition-free job queue

const generatePDF = require("./pdfGenerator");
const sendAdminEmail = require("./emailService");
const { appendConversionRow } = require("./googleService");
const { uploadToDrive } = require("./driveService");
const fs = require("fs");

/* ===============================
   QUEUE STATE
================================ */
const jobQueue = [];
let isProcessing = false;
const MAX_QUEUE_SIZE = 50;

/* ===============================
   PUBLIC: addJob
================================ */
function addJob(jobData) {
  if (jobQueue.length >= MAX_QUEUE_SIZE) {
    throw new Error(
      `Queue full (${MAX_QUEUE_SIZE} jobs). Please try again later.`
    );
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  jobQueue.push({
    id: jobId,
    data: jobData,
    status: "pending",
    createdAt: new Date(),
    attempts: 0,
  });

  console.log(`✅ Job added: ${jobId}  (queue length: ${jobQueue.length})`);

  if (!isProcessing) {
    setImmediate(() => processQueue());
  }

  return jobId;
}

/* ===============================
   QUEUE PROCESSOR
================================ */
async function processQueue() {
  if (isProcessing) {
    console.log("⏭️  Queue already running – skipping duplicate call");
    return;
  }

  isProcessing = true;
  console.log("🚀 Queue processor started");

  while (jobQueue.length > 0) {
    const job = jobQueue[0];

    try {
      console.log(`🔄 Processing ${job.id}  (attempt ${job.attempts + 1}/3)`);
      job.status = "processing";
      job.attempts++;

      await processJob(job.data);

      job.status = "completed";
      console.log(`✅ Completed ${job.id}`);
      jobQueue.shift();

    } catch (err) {
      console.error(`❌ Failed ${job.id}:`, err.message);

      if (job.attempts < 3) {
        job.status = "retrying";
        const wait = Math.min(job.attempts * 5000, 30000);
        console.log(
          `🔄 Will retry ${job.id} in ${wait / 1000}s  (${3 - job.attempts} attempts left)`
        );
        jobQueue.push(jobQueue.shift()); // move to end of queue
        await delay(wait);

      } else {
        job.status = "failed";
        job.error = err.message;
        console.error(`💀 Job ${job.id} permanently failed after 3 attempts`);

        // Cleanup uploaded files on permanent failure to avoid disk leak
        cleanupFiles(
          (job.data.uploadedFiles || []).map((f) => f.path)
        );

        jobQueue.shift();
      }
    }
  }

  isProcessing = false;
  console.log("🏁 Queue processing completed");
}

/* ===============================
   CORE JOB

   KEY FIX: No try/finally here.
   - On SUCCESS  → all steps complete → cleanup runs at bottom
   - On FAILURE  → error thrown → queue catches it → retry with files still intact
   - On PERMANENT FAILURE (3 attempts) → queue processor cleans uploaded files
================================ */
async function processJob(jobData) {
  const { formData, uploadedFiles } = jobData;

  // 1️⃣  Generate PDF
  console.log("📄 Generating PDF…");
  const pdfResult = await generatePDF(formData, uploadedFiles);

  if (!pdfResult || typeof pdfResult !== "object") {
    throw new Error("PDF generation failed – invalid return value");
  }

  const { formPdfPath, docsPdfPath, mergedPdfPath } = pdfResult;

  if (!formPdfPath || !fs.existsSync(formPdfPath)) {
    throw new Error("PDF generation failed – form PDF file not found");
  }
  if (!mergedPdfPath || !fs.existsSync(mergedPdfPath)) {
    throw new Error("PDF generation failed – merged PDF file not found");
  }

  console.log(`✅ Form PDF   : ${formPdfPath}`);
  console.log(`✅ Merged PDF : ${mergedPdfPath}`);

  // 2️⃣  Send emails
  console.log("📧 Sending emails…");
  await sendAdminEmail({
    formData,
    pdfPath: pdfResult,
    uploadedFiles: [],
  });
  console.log("✅ Emails sent");

  // 3️⃣  Upload to Google Drive
  console.log("☁️  Uploading to Google Drive…");
  const safeName = (formData.fullName || "Student")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // Merged PDF — form + all documents (main file)
    await uploadToDrive(
      mergedPdfPath,
      `${safeName}-${dateStr}-Conversion.pdf`,
      formData.fullName
    );

    // Docs-only PDF — uploaded documents separately (if exists)
    if (docsPdfPath && fs.existsSync(docsPdfPath)) {
      await uploadToDrive(
        docsPdfPath,
        `${safeName}-${dateStr}-Documents.pdf`,
        formData.fullName
      );
    }

    console.log("✅ Drive upload complete");
  } catch (driveErr) {
    // Drive upload failure is NON-CRITICAL
    // Job will NOT fail or retry just because of Drive
    console.warn("⚠️  Drive upload failed (non-critical):", driveErr.message);
  }

  // 4️⃣  Update Google Sheet
  console.log("📊 Updating Google Sheet…");
  const sheetRow = buildSheetRow(formData, uploadedFiles);
  await appendConversionRow(sheetRow);
  console.log("✅ Sheet updated");

  // 5️⃣  Cleanup — runs ONLY after full success
  const filesToClean = [
    formPdfPath,
    docsPdfPath,
    mergedPdfPath,
    ...uploadedFiles.map((f) => f.path),
  ].filter(Boolean);

  cleanupFiles(filesToClean);
}

/* ===============================
   SHEET ROW BUILDER
================================ */
function buildSheetRow(formData, uploadedFiles) {
  const fileStatus = (name) =>
    uploadedFiles.some((f) => f.fieldname === name) ? "Attached" : "Not Attached";

  const getExamDetail = (examKey, field) => {
    const exam = (formData.dgcaExamDetails || []).find(
      (e) => e.exam === examKey
    );
    return exam?.[field] || "";
  };

  let totalDayPIC = 0,
    totalNightPIC = 0,
    totalIF = 0,
    totalNightPICLDG = 0,
    totalNightPICTO = 0;

  (formData.sortieRows || []).forEach((row) => {
    const h = parseInt(row.hours) || 0;
    const m = parseInt(row.minutes) || 0;
    const t = h + m / 60;
    if (row.typeOfFlight === "Day PIC") totalDayPIC += t;
    if (row.typeOfFlight === "Night PIC") {
      totalNightPIC += t;
      totalNightPICLDG += parseInt(row.ldg) || 0;
      totalNightPICTO += parseInt(row.to) || 0;
    }
    if (row.typeOfFlight === "IF") totalIF += t;
  });

  const fmtTime = (decimal) =>
    `${Math.floor(decimal)}h ${Math.round((decimal % 1) * 60)}m`;

  const EXAM_LABELS = {
    airNavigation:    "Air Navigation",
    meteorology:      "Meteorology",
    airRegulations:   "Air Regulations",
    technicalGeneral: "Technical General",
    technicalSpecific:"Technical Specific",
    compositePaper:   "Composite Paper (Meteorology + Navigation)",
  };

  const dgcaExamsList =
    (formData.dgcaExamDetails || []).length > 0
      ? formData.dgcaExamDetails
          .map((exam) => {
            const label = EXAM_LABELS[exam.exam] || exam.exam;
            const status =
              exam.validity === "Expired"
                ? "❌ EXPIRED"
                : exam.validity === "SPL Exam Required"
                ? "⚠️ SPL EXAM REQUIRED"
                : `✅ Valid until ${exam.validity}`;
            return `${label}: ${exam.resultDate} – ${status}`;
          })
          .join("; ")
      : "None";

  const picExp = `${formData.totalPICExperienceHours || 0}:${String(
    formData.totalPICExperienceMinutes || 0
  ).padStart(2, "0")}`;
  const picXC = `${formData.totalPICCrossCountryHours || 0}:${String(
    formData.totalPICCrossCountryMinutes || 0
  ).padStart(2, "0")}`;

  return [
    /* A  */ new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    /* B  */ formData.fullName || "",
    /* C  */ formData.age || "",
    /* D  */ formData.gender || "",
    /* E  */ formData.mobile || "",
    /* F  */ formData.email || "",
    /* G  */ fileStatus("passportPhoto"),
    /* H  */ formData.contractingState || "",
    /* I  */ formData.licenseValidity || "",
    /* J  */ formData.licenseEndorsement || "",
    /* K  */ fileStatus("foreignLicense"),
    /* L  */ `${formData.totalSEHours || 0}:${String(formData.totalSEMinutes || 0).padStart(2, "00")}`,
    /* M  */ formData.licenseEndorsement === "SE ME IR"
      ? `${formData.totalMEHours || 0}:${String(formData.totalMEMinutes || 0).padStart(2, "00")}`
      : "N/A",
    /* N  */ formData.totalHours || "",
    /* O  */ formData.aircraftTypes || "",
    /* P  */ formData.lastFlightDate || "",
    /* Q  */ formData.last6MonthsAvailable || "",
    /* R  */ (formData.sortieRows || []).length,
    /* S  */ fmtTime(totalDayPIC),
    /* T  */ fmtTime(totalNightPIC),
    /* U  */ totalNightPICLDG,
    /* V  */ totalNightPICTO,
    /* W  */ fmtTime(totalIF),
    /* X  */ formData.irCheckGiven || "",
    /* Y  */ formData.irCheckAircraft || "",
    /* Z  */ formData.irCheckDate || "",
    /* AA */ formData.irCheckValidity || "",
    /* AB */ fileStatus("ca40IR"),
    /* AC */ formData.signalReception || "",
    /* AD */ formData.signalReceptionDate || "",
    /* AE */ formData.signalReceptionValidity || "",
    /* AF */ fileStatus("signalReceptionTest"),
    /* AG */ formData.commercialCheckride || "",
    /* AH */ formData.c172CheckrideDate || "",
    /* AI */ fileStatus("c172CheckrideStatement"),
    /* AJ */ formData.c172PICOption || "",
    /* AK */ fileStatus("c172FlightReview"),
    /* AL */ picExp,
    /* AM */ fileStatus("pic100Statement"),
    /* AN */ fileStatus("crossCountry300Statement"),
    /* AO */ picXC,
    /* AP */ fileStatus("picCrossCountryStatement"),
    /* AQ */ formData.totalInstrumentTime || "",
    /* AR */ `${formData.instrumentActualHours || 0}:${String(formData.instrumentActualMinutes || 0).padStart(2, "00")}`,
    /* AS */ `${formData.instrumentSimulatorHours || 0}:${String(formData.instrumentSimulatorMinutes || 0).padStart(2, "00")}`,
    /* AT */ fileStatus("instrumentTimeStatement"),
    /* AU */ formData.medicalValidity || "",
    /* AV */ fileStatus("medicalAssessment"),
    /* AW */ dgcaExamsList,
    /* AX */ getExamDetail("airNavigation", "resultDate"),
    /* AY */ getExamDetail("airNavigation", "validity"),
    /* AZ */ fileStatus("dgcaExam_airNavigation"),
    /* BA */ getExamDetail("meteorology", "resultDate"),
    /* BB */ getExamDetail("meteorology", "validity"),
    /* BC */ fileStatus("dgcaExam_meteorology"),
    /* BD */ getExamDetail("airRegulations", "resultDate"),
    /* BE */ getExamDetail("airRegulations", "validity"),
    /* BF */ fileStatus("dgcaExam_airRegulations"),
    /* BG */ getExamDetail("technicalGeneral", "resultDate"),
    /* BH */ getExamDetail("technicalGeneral", "validity"),
    /* BI */ fileStatus("dgcaExam_technicalGeneral"),
    /* BJ */ getExamDetail("technicalSpecific", "resultDate"),
    /* BK */ getExamDetail("technicalSpecific", "validity"),
    /* BL */ getExamDetail("technicalSpecific", "aircraft"),
    /* BM */ fileStatus("dgcaExam_technicalSpecific"),
    /* BN */ getExamDetail("compositePaper", "resultDate"),
    /* BO */ getExamDetail("compositePaper", "validity"),
    /* BP */ fileStatus("dgcaExam_compositePaper"),
    /* BQ */ fileStatus("rtrCertificate"),
    /* BR */ formData.rtrValidity || "",
    /* BS */ fileStatus("frtolCertificate"),
    /* BT */ formData.policeVerificationDate || "",
    /* BU */ fileStatus("policeVerification"),
    /* BV */ fileStatus("marksheet10"),
    /* BW */ fileStatus("marksheet12"),
    /* BX */ formData.hasSPL || "",
    /* BY */ formData.splIssueDate || "",
    /* BZ */ formData.splValidity || "",
    /* CA */ fileStatus("splDocument"),
    /* CB */ formData.nameChangeProcessed || "",
    /* CC */ fileStatus("nameChangeCertificate"),
    /* CD */ fileStatus("studentSignature"),
    /* CE */ fileStatus("finalSignature"),
    /* CF */ formData.hearAboutUs || "",
  ];
}

/* ===============================
   CLEANUP
================================ */
function cleanupFiles(filePaths) {
  filePaths.forEach((fp) => {
    if (fp && fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
        console.log(`🗑️  Deleted: ${fp}`);
      } catch (e) {
        console.error(`⚠️  Cleanup failed for ${fp}:`, e.message);
      }
    }
  });
}

/* ===============================
   UTILITY
================================ */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function getQueueStatus() {
  return {
    queueLength: jobQueue.length,
    isProcessing,
    maxQueueSize: MAX_QUEUE_SIZE,
    jobs: jobQueue.map((j) => ({
      id: j.id,
      status: j.status,
      attempts: j.attempts,
      createdAt: j.createdAt,
      studentName: j.data?.formData?.fullName || "Unknown",
    })),
  };
}

module.exports = { addJob, getQueueStatus };