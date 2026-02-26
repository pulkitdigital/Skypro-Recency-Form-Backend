
// // Backend/services/queueService.js - RACE-CONDITION FREE

// const generatePDF = require("./pdfGenerator");
// const sendAdminEmail = require("./emailService");
// const { appendConversionRow } = require("./googleService");
// const fs = require("fs");

// // ================ QUEUE ================

// const jobQueue = [];
// let isProcessing = false;
// const MAX_QUEUE_SIZE = 50; // Prevent memory overflow

// function addJob(jobData) {
//   // ✅ Prevent queue overflow
//   if (jobQueue.length >= MAX_QUEUE_SIZE) {
//     throw new Error(`Queue full (${MAX_QUEUE_SIZE} jobs). Please try again later.`);
//   }

//   const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

//   jobQueue.push({
//     id: jobId,
//     data: jobData,
//     status: "pending",
//     createdAt: new Date(),
//     attempts: 0,
//   });

//   console.log(`✅ Job added: ${jobId} (Queue: ${jobQueue.length})`);

//   // ✅ FIX: Use setImmediate to prevent race condition
//   if (!isProcessing) {
//     setImmediate(() => processQueue());
//   }

//   return jobId;
// }

// async function processQueue() {
//   // ✅ CRITICAL: Check and set atomically
//   if (isProcessing) {
//     console.log("⏭️ Queue already processing, skipping duplicate call");
//     return;
//   }
  
//   isProcessing = true;
//   console.log("🚀 Queue processor started");

//   while (jobQueue.length > 0) {
//     const job = jobQueue[0];

//     try {
//       console.log(`🔄 Processing ${job.id} (Attempt ${job.attempts + 1}/${3})`);
//       job.status = "processing";
//       job.attempts++;

//       await processJob(job.data);

//       job.status = "completed";
//       console.log(`✅ Completed ${job.id}`);

//       jobQueue.shift(); // Remove completed job

//     } catch (err) {
//       console.error(`❌ Failed ${job.id}:`, err.message);

//       if (job.attempts < 3) {
//         job.status = "retrying";
//         console.log(`🔄 Retrying ${job.id} (${3 - job.attempts} attempts left)`);

//         // Move to end of queue for retry
//         jobQueue.push(jobQueue.shift());

//         // Exponential backoff
//         const waitTime = Math.min(job.attempts * 5000, 30000); // Max 30s
//         console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
//         await new Promise((resolve) => setTimeout(resolve, waitTime));

//       } else {
//         job.status = "failed";
//         job.error = err.message;
//         console.error(`💀 Job ${job.id} permanently failed after 3 attempts`);

//         jobQueue.shift(); // Remove failed job
//       }
//     }
//   }

//   isProcessing = false;
//   console.log("🏁 Queue processing completed");
// }

// // ================ CORE JOB ================

// async function processJob(jobData) {
//   const { formData, uploadedFiles } = jobData;
//   let combinedPdfPath = null;

//   try {
//     // 1️⃣ Generate PDF
//     console.log("📄 Generating PDF...");
//     combinedPdfPath = await generatePDF(formData, uploadedFiles);

//     if (!combinedPdfPath || !fs.existsSync(combinedPdfPath)) {
//       throw new Error("PDF generation failed");
//     }
//     console.log(`✅ PDF: ${combinedPdfPath}`);

//     // 2️⃣ Send emails
//     console.log("📧 Sending emails...");
//     await sendAdminEmail({
//       formData,
//       pdfPath: combinedPdfPath,
//       uploadedFiles: [],
//     });
//     console.log("✅ Emails sent");

//     // 3️⃣ Google Sheet
//     console.log("📊 Updating Google Sheet...");

//     const fileStatus = (name) =>
//       uploadedFiles.some((f) => f.fieldname === name)
//         ? "Attached"
//         : "Not Attached";

//     // Calculate sortie summary
//     let totalDayPIC = 0, totalNightPIC = 0, totalIF = 0;
//     let totalNightPICLDG = 0, totalNightPICTO = 0;

//     if (formData.sortieRows?.length > 0) {
//       formData.sortieRows.forEach((row) => {
//         const hours = parseInt(row.hours) || 0;
//         const minutes = parseInt(row.minutes) || 0;
//         const totalTime = hours + minutes / 60;

//         if (row.typeOfFlight === "Day PIC") totalDayPIC += totalTime;
//         if (row.typeOfFlight === "Night PIC") {
//           totalNightPIC += totalTime;
//           totalNightPICLDG += parseInt(row.ldg) || 0;
//           totalNightPICTO += parseInt(row.to) || 0;
//         }
//         if (row.typeOfFlight === "IF") totalIF += totalTime;
//       });
//     }

//     const dgcaExamsList =
//       formData.dgcaExamDetails?.length > 0
//         ? formData.dgcaExamDetails
//             .map((exam) => {
//               const examName = exam.exam.replace(/([A-Z])/g, " $1").trim();
//               const status =
//                 exam.validity === "Expired"
//                   ? "❌ EXPIRED"
//                   : exam.validity === "SPL Exam Required"
//                   ? "⚠️ SPL EXAM REQUIRED"
//                   : `✅ Valid until ${exam.validity}`;
//               return `${examName}: ${exam.resultDate} - ${status}`;
//             })
//             .join("; ")
//         : "None";

//     const getExamDetail = (examName, field) => {
//       const exam = formData.dgcaExamDetails?.find((e) => e.exam === examName);
//       return exam?.[field] || "";
//     };

//     const sheetRow = [
//       // 1. Timestamp
//       new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),

//       // 2-7. Personal Details
//       formData.fullName || "",
//       formData.age || "",
//       formData.gender || "",
//       formData.mobile || "",
//       formData.email || "",
//       fileStatus("passportPhoto"),

//       // 8-11. License Details
//       formData.contractingState || "",
//       formData.licenseValidity || "",
//       formData.licenseEndorsement || "",
//       fileStatus("foreignLicense"),

//       // 12-16. Total Flying Hours
//       `${formData.totalSEHours || 0}:${formData.totalSEMinutes || 0}`,
//       formData.licenseEndorsement === "SE ME IR"
//         ? `${formData.totalMEHours || 0}:${formData.totalMEMinutes || 0}`
//         : "N/A",
//       formData.totalHours || "",
//       formData.aircraftTypes || "",
//       formData.lastFlightDate || "",

//       // 17-27. Last 6 Months
//       formData.last6MonthsAvailable || "",
//       formData.sortieRows?.length || 0,
//       `${Math.floor(totalDayPIC)}h ${Math.round((totalDayPIC % 1) * 60)}m`,
//       `${Math.floor(totalNightPIC)}h ${Math.round((totalNightPIC % 1) * 60)}m`,
//       totalNightPICLDG,
//       totalNightPICTO,
//       `${Math.floor(totalIF)}h ${Math.round((totalIF % 1) * 60)}m`,
//       formData.irCheckAircraft || "",
//       formData.irCheckDate || "",
//       formData.irCheckValidity || "",
//       fileStatus("ca40IR"),

//       // 28-31. Signal Reception
//       formData.signalReception || "",
//       formData.signalReceptionDate || "",
//       formData.signalReceptionValidity || "",
//       fileStatus("signalReceptionTest"),

//       // 32-36. Commercial Checkride
//       formData.commercialCheckride || "",
//       formData.c172CheckrideDate || "",
//       fileStatus("c172CheckrideStatement"),
//       formData.c172PICOption || "",
//       fileStatus("c172FlightReview"),

//       // 37-43. PIC Experience
//       `${formData.totalPICExperience || 0} hrs`,
//       fileStatus("pic100Statement"),
//       fileStatus("crossCountry300Statement"),
//       `${formData.totalPICCrossCountry || 0} hrs`,
//       fileStatus("picCrossCountryStatement"),
//       `${formData.totalInstrumentTime || 0} hrs`,
//       fileStatus("instrumentTimeStatement"),

//       // 44-45. Medical
//       formData.medicalValidity || "",
//       fileStatus("medicalAssessment"),

//       // 46-64. DGCA Exams
//       dgcaExamsList,
//       getExamDetail("airNavigation", "resultDate"),
//       getExamDetail("airNavigation", "validity"),
//       fileStatus("dgcaExam_airNavigation"),
//       getExamDetail("meteorology", "resultDate"),
//       getExamDetail("meteorology", "validity"),
//       fileStatus("dgcaExam_meteorology"),
//       getExamDetail("airRegulations", "resultDate"),
//       getExamDetail("airRegulations", "validity"),
//       fileStatus("dgcaExam_airRegulations"),
//       getExamDetail("technicalGeneral", "resultDate"),
//       getExamDetail("technicalGeneral", "validity"),
//       fileStatus("dgcaExam_technicalGeneral"),
//       getExamDetail("technicalSpecific", "resultDate"),
//       getExamDetail("technicalSpecific", "validity"),
//       fileStatus("dgcaExam_technicalSpecific"),
//       getExamDetail("compositePaper", "resultDate"),
//       getExamDetail("compositePaper", "validity"),
//       fileStatus("dgcaExam_compositePaper"),

//       // 65-72. Additional Documents
//       fileStatus("rtrCertificate"),
//       formData.rtrValidity || "",
//       fileStatus("frtolCertificate"),
//       formData.policeVerificationDate || "",
//       fileStatus("policeVerification"),
//       fileStatus("marksheet10"),
//       fileStatus("marksheet12"),
//       formData.nameChangeProcessed || "",
//       fileStatus("nameChangeCertificate"),

//       // 73. Referral
//       formData.hearAboutUs || "",

//       // 74-75. Signatures
//       fileStatus("studentSignature"),
//       fileStatus("finalSignature"),
//     ];

//     await appendConversionRow(sheetRow);
//     console.log("✅ Sheet updated");

//   } finally {
//     // Cleanup
//     console.log("🧹 Cleaning up...");

//     const filesToClean = [combinedPdfPath, ...uploadedFiles.map((f) => f.path)].filter(Boolean);

//     cleanupFiles(filesToClean);
//   }
// }

// // ================ CLEANUP ================

// function cleanupFiles(filePaths) {
//   filePaths.forEach((filePath) => {
//     if (fs.existsSync(filePath)) {
//       try {
//         fs.unlinkSync(filePath);
//         console.log(`🗑️ Deleted: ${filePath}`);
//       } catch (e) {
//         console.error(`⚠️ Cleanup failed:`, e.message);
//       }
//     }
//   });
// }

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

// module.exports = {
//   addJob,
//   getQueueStatus,
// };





























// services/queueService.js  ─  race-condition-free job queue

const generatePDF = require("./pdfGenerator");
const sendAdminEmail = require("./emailService");
const { appendConversionRow } = require("./googleService");
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
      console.log(
        `🔄 Processing ${job.id}  (attempt ${job.attempts + 1}/3)`
      );
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
          `🔄 Will retry ${job.id} in ${wait / 1000}s  ` +
            `(${3 - job.attempts} attempts left)`
        );
        jobQueue.push(jobQueue.shift()); // move to end
        await delay(wait);
      } else {
        job.status = "failed";
        job.error = err.message;
        console.error(`💀 Job ${job.id} permanently failed after 3 attempts`);
        jobQueue.shift();
      }
    }
  }

  isProcessing = false;
  console.log("🏁 Queue processing completed");
}

/* ===============================
   CORE JOB
================================ */
async function processJob(jobData) {
  const { formData, uploadedFiles } = jobData;
  let combinedPdfPath = null;

  try {
    // 1️⃣  Generate PDF
    console.log("📄 Generating PDF…");
    combinedPdfPath = await generatePDF(formData, uploadedFiles);
    if (!combinedPdfPath || !fs.existsSync(combinedPdfPath)) {
      throw new Error("PDF generation failed – file not found");
    }
    console.log(`✅ PDF: ${combinedPdfPath}`);

    // 2️⃣  Send emails
    console.log("📧 Sending emails…");
    await sendAdminEmail({ formData, pdfPath: combinedPdfPath, uploadedFiles: [] });
    console.log("✅ Emails sent");

    // 3️⃣  Google Sheet
    console.log("📊 Updating Google Sheet…");
    const sheetRow = buildSheetRow(formData, uploadedFiles);
    await appendConversionRow(sheetRow);
    console.log("✅ Sheet updated");
  } finally {
    // Always clean up temp files
    const filesToClean = [
      combinedPdfPath,
      ...uploadedFiles.map((f) => f.path),
    ].filter(Boolean);
    cleanupFiles(filesToClean);
  }
}

/* ===============================
   SHEET ROW BUILDER
   Columns must match your Google Sheet header row exactly.
================================ */
function buildSheetRow(formData, uploadedFiles) {
  /* ── helpers ── */
  const fileStatus = (name) =>
    uploadedFiles.some((f) => f.fieldname === name) ? "Attached" : "Not Attached";

  const getExamDetail = (examKey, field) => {
    const exam = (formData.dgcaExamDetails || []).find(
      (e) => e.exam === examKey
    );
    return exam?.[field] || "";
  };

  /* ── sortie summary ── */
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

  /* ── DGCA exams summary string ── */
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

  /* ── PIC hours display ── */
  // Frontend now sends separate Hours/Minutes fields:
  //   totalPICExperienceHours / totalPICExperienceMinutes
  //   totalPICCrossCountryHours / totalPICCrossCountryMinutes
  const picExp = `${formData.totalPICExperienceHours || 0}:${String(
    formData.totalPICExperienceMinutes || 0
  ).padStart(2, "0")}`;
  const picXC = `${formData.totalPICCrossCountryHours || 0}:${String(
    formData.totalPICCrossCountryMinutes || 0
  ).padStart(2, "0")}`;

  return [
    /* A  */ new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),

    /* ── SECTION 1: Personal Details ─────────────────────── */
    /* B  */ formData.fullName || "",
    /* C  */ formData.age || "",
    /* D  */ formData.gender || "",
    /* E  */ formData.mobile || "",
    /* F  */ formData.email || "",
    /* G  */ fileStatus("passportPhoto"),

    /* ── SECTION 2: License Details ──────────────────────── */
    /* H  */ formData.contractingState || "",
    /* I  */ formData.licenseValidity || "",
    /* J  */ formData.licenseEndorsement || "",
    /* K  */ fileStatus("foreignLicense"),

    /* ── SECTION 3: Total Flying Hours ───────────────────── */
    /* L  */ `${formData.totalSEHours || 0}:${String(formData.totalSEMinutes || 0).padStart(2, "0")}`,
    /* M  */
    formData.licenseEndorsement === "SE ME IR"
      ? `${formData.totalMEHours || 0}:${String(formData.totalMEMinutes || 0).padStart(2, "0")}`
      : "N/A",
    /* N  */ formData.totalHours || "",
    /* O  */ formData.aircraftTypes || "",
    /* P  */ formData.lastFlightDate || "",

    /* ── SECTION 4: Last 6 Months ─────────────────────────── */
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

    /* ── Signal Reception ────────────────────────────────── */
    /* AC */ formData.signalReception || "",
    /* AD */ formData.signalReceptionDate || "",
    /* AE */ formData.signalReceptionValidity || "",
    /* AF */ fileStatus("signalReceptionTest"),

    /* ── SECTION 5: Commercial Checkride ────────────────── */
    /* AG */ formData.commercialCheckride || "",
    /* AH */ formData.c172CheckrideDate || "",
    /* AI */ fileStatus("c172CheckrideStatement"),
    /* AJ */ formData.c172PICOption || "",
    /* AK */ fileStatus("c172FlightReview"),

    /* ── SECTION 6: PIC Experience ───────────────────────── */
    /* AL */ picExp,
    /* AM */ fileStatus("pic100Statement"),
    /* AN */ fileStatus("crossCountry300Statement"),
    /* AO */ picXC,
    /* AP */ fileStatus("picCrossCountryStatement"),
    /* AQ */ formData.totalInstrumentTime || "",          // auto-calc HH:MM
    /* AR */ `${formData.instrumentActualHours || 0}:${String(formData.instrumentActualMinutes || 0).padStart(2, "0")}`,
    /* AS */ `${formData.instrumentSimulatorHours || 0}:${String(formData.instrumentSimulatorMinutes || 0).padStart(2, "0")}`,
    /* AT */ fileStatus("instrumentTimeStatement"),

    /* ── SECTION 7: Medical ───────────────────────────────── */
    /* AU */ formData.medicalValidity || "",
    /* AV */ fileStatus("medicalAssessment"),

    /* ── SECTION 7: DGCA Exams ────────────────────────────── */
    /* AW */ dgcaExamsList,

    /* Air Navigation */
    /* AX */ getExamDetail("airNavigation", "resultDate"),
    /* AY */ getExamDetail("airNavigation", "validity"),
    /* AZ */ fileStatus("dgcaExam_airNavigation"),

    /* Meteorology */
    /* BA */ getExamDetail("meteorology", "resultDate"),
    /* BB */ getExamDetail("meteorology", "validity"),
    /* BC */ fileStatus("dgcaExam_meteorology"),

    /* Air Regulations */
    /* BD */ getExamDetail("airRegulations", "resultDate"),
    /* BE */ getExamDetail("airRegulations", "validity"),
    /* BF */ fileStatus("dgcaExam_airRegulations"),

    /* Technical General */
    /* BG */ getExamDetail("technicalGeneral", "resultDate"),
    /* BH */ getExamDetail("technicalGeneral", "validity"),
    /* BI */ fileStatus("dgcaExam_technicalGeneral"),

    /* Technical Specific */
    /* BJ */ getExamDetail("technicalSpecific", "resultDate"),
    /* BK */ getExamDetail("technicalSpecific", "validity"),
    /* BL */ getExamDetail("technicalSpecific", "aircraft"),   // ← new: aircraft field
    /* BM */ fileStatus("dgcaExam_technicalSpecific"),

    /* Composite Paper */
    /* BN */ getExamDetail("compositePaper", "resultDate"),
    /* BO */ getExamDetail("compositePaper", "validity"),
    /* BP */ fileStatus("dgcaExam_compositePaper"),

    /* ── SECTION 8: Additional Documents ────────────────── */
    /* BQ */ fileStatus("rtrCertificate"),
    /* BR */ formData.rtrValidity || "",
    /* BS */ fileStatus("frtolCertificate"),
    /* BT */ formData.policeVerificationDate || "",
    /* BU */ fileStatus("policeVerification"),
    /* BV */ fileStatus("marksheet10"),
    /* BW */ fileStatus("marksheet12"),

    /* SPL */
    /* BX */ formData.hasSPL || "",
    /* BY */ formData.splIssueDate || "",
    /* BZ */ formData.splValidity || "",
    /* CA */ fileStatus("splDocument"),

    /* Name Change */
    /* CB */ formData.nameChangeProcessed || "",
    /* CC */ fileStatus("nameChangeCertificate"),

    /* ── SECTION 9 / 11: Signatures ──────────────────────── */
    /* CD */ fileStatus("studentSignature"),
    /* CE */ fileStatus("finalSignature"),

    /* ── SECTION 10: Referral ─────────────────────────────── */
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