// Backend/services/queueService.js
 
const generatePDF = require("./pdfGenerator"); 
const sendAdminEmail = require("./emailService"); 
const { appendConversionRow } = require("./googleService"); 
 
const fs = require("fs"); 
 
// ================ QUEUE ================ 
 
const jobQueue = []; 
let isProcessing = false; 
 
function addJob(jobData) { 
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; 
 
  jobQueue.push({ 
    id: jobId, 
    data: jobData, 
    status: "pending", 
    createdAt: new Date(),
    attempts: 0,
  }); 
 
  console.log(`✅ Job added: ${jobId}`); 
 
  if (!isProcessing) processQueue(); 
 
  return jobId; 
} 
 
async function processQueue() { 
  if (isProcessing || jobQueue.length === 0) return; 
 
  isProcessing = true; 
 
  while (jobQueue.length) { 
    const job = jobQueue[0];
 
    try { 
      console.log(`🔄 Processing ${job.id} (Attempt ${job.attempts + 1})`); 
      job.status = "processing"; 
      job.attempts++;
 
      await processJob(job.data); 
 
      job.status = "completed"; 
      console.log(`✅ Completed ${job.id}`); 
      
      jobQueue.shift();
      
    } catch (err) { 
      console.error(`❌ Failed ${job.id} (Attempt ${job.attempts}):`, err.message); 
      
      if (job.attempts < 3) {
        job.status = "retrying";
        console.log(`🔄 Will retry ${job.id} (${3 - job.attempts} attempts remaining)`);
        
        jobQueue.push(jobQueue.shift());
        
        const waitTime = job.attempts * 5000;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } else {
        job.status = "failed"; 
        job.error = err.message; 
        console.error(`💀 Job ${job.id} failed permanently after 3 attempts`);
        
        jobQueue.shift();
      }
    } 
  } 
 
  isProcessing = false; 
  console.log("🏁 Queue processing completed");
} 
 
// ================ CORE JOB ================ 
 
async function processJob(jobData) { 
  const { formData, uploadedFiles } = jobData; 
 
  let combinedPdfPath = null;
  
  try {
    // 1️⃣ Generate Combined PDF
    console.log("📄 Generating combined PDF (Form + Documents)..."); 
    combinedPdfPath = await generatePDF(formData, uploadedFiles); 
    
    if (!combinedPdfPath || !fs.existsSync(combinedPdfPath)) {
      throw new Error("PDF generation failed - file not created");
    }
    
    console.log(`✅ PDF created: ${combinedPdfPath}`);
  
    // 2️⃣ Send emails
    console.log("📧 Sending emails..."); 
    await sendAdminEmail({ 
      formData, 
      pdfPath: combinedPdfPath, 
      uploadedFiles: [],
    }); 
    
    console.log("✅ Emails sent successfully");
  
    // 3️⃣ Push data to Google Sheet
    console.log("📊 Writing to Google Sheet..."); 
  
    // ✅ FIXED: Helper function with correct field names
    const fileStatus = (name) => 
      uploadedFiles.some((f) => f.fieldname === name) 
        ? "Attached" 
        : "Not Attached"; 
  
    // Calculate sortie summary with Night PIC LDG/TO
    let totalDayPIC = 0, totalNightPIC = 0, totalIF = 0;
    let totalNightPICLDG = 0, totalNightPICTO = 0;
    
    if (formData.sortieRows && formData.sortieRows.length > 0) {
      formData.sortieRows.forEach(row => {
        const hours = parseInt(row.hours) || 0;
        const minutes = parseInt(row.minutes) || 0;
        const totalTime = hours + minutes / 60;
        
        if (row.typeOfFlight === "Day PIC") {
          totalDayPIC += totalTime;
        }
        if (row.typeOfFlight === "Night PIC") {
          totalNightPIC += totalTime;
          totalNightPICLDG += parseInt(row.ldg) || 0;
          totalNightPICTO += parseInt(row.to) || 0;
        }
        if (row.typeOfFlight === "IF") {
          totalIF += totalTime;
        }
      });
    }

    // Format DGCA exams with validity status (Expired, SPL Exam Required, or valid date)
    const dgcaExamsList = formData.dgcaExamDetails && formData.dgcaExamDetails.length > 0
      ? formData.dgcaExamDetails.map(exam => {
          const examName = exam.exam.replace(/([A-Z])/g, ' $1').trim();
          const status = exam.validity === "Expired" 
            ? "❌ EXPIRED" 
            : exam.validity === "SPL Exam Required"
            ? "⚠️ SPL EXAM REQUIRED"
            : `✅ Valid until ${exam.validity}`;
          return `${examName}: ${exam.resultDate} - ${status}`;
        }).join("; ")
      : "None";

    const sheetRow = [ 
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // 1. Timestamp
  
      // Personal Details (5 columns: 2-6)
      formData.fullName || "", 
      formData.age || "", 
      formData.gender || "", 
      formData.mobile || "", 
      formData.email || "", 
  
      // License Details (3 columns: 7-9)
      formData.contractingState || "", 
      formData.licenseValidity || "", 
      formData.licenseEndorsement || "", 
  
      // Flying Hours (5 columns: 10-14)
      `${formData.totalSEHours || 0}:${formData.totalSEMinutes || 0}`,
      formData.licenseEndorsement === "SE ME IR" ? `${formData.totalMEHours || 0}:${formData.totalMEMinutes || 0}` : "N/A",
      formData.totalHours || "",
      formData.aircraftTypes || "",
      formData.lastFlightDate || "",
  
      // Last 6 Months (7 columns: 15-21)
      formData.last6MonthsAvailable || "",
      formData.sortieRows?.length || 0,
      `${Math.floor(totalDayPIC)}h ${Math.round((totalDayPIC % 1) * 60)}m`,
      `${Math.floor(totalNightPIC)}h ${Math.round((totalNightPIC % 1) * 60)}m`,
      totalNightPICLDG,
      totalNightPICTO,
      `${Math.floor(totalIF)}h ${Math.round((totalIF % 1) * 60)}m`,
  
      // IR Check (3 columns: 22-24)
      formData.irCheckAircraft || "",
      formData.irCheckDate || "",
      formData.irCheckValidity || "",
  
      // Signal Reception (3 columns: 25-27)
      formData.signalReception || "",
      formData.signalReceptionDate || "",
      formData.signalReceptionValidity || "",
  
      // Commercial Checkride (3 columns: 28-30)
      formData.commercialCheckride || "",
      formData.c172CheckrideDate || "",
      formData.c172PICOption || "",
  
      // PIC Experience (3 columns: 31-33)
      `${formData.totalPICExperience || 0} hrs`,
      `${formData.totalPICCrossCountry || 0} hrs`,
      `${formData.totalInstrumentTime || 0} hrs`,
  
      // Medical & Exams (1 column: 34)
      formData.medicalValidity || "",
      
      // DGCA Exams Summary (1 column: 35)
      dgcaExamsList,
      
      // DGCA Exam File Attachments (6 columns: 36-41)
      fileStatus("dgcaExam_airNavigation"),
      fileStatus("dgcaExam_meteorology"),
      fileStatus("dgcaExam_airRegulations"),
      fileStatus("dgcaExam_technicalGeneral"),
      fileStatus("dgcaExam_technicalSpecific"),
      fileStatus("dgcaExam_compositePaper"),
  
      // Additional Documents (3 columns: 42-44)
      formData.rtrValidity || "",
      formData.policeVerificationDate || "",
      formData.nameChangeProcessed || "",
  
      // Source (1 column: 45)
      formData.hearAboutUs || "",
  
      // ✅ FIXED: File Status - Regular Documents (19 columns: 46-64) with correct field names
      fileStatus("passportPhoto"),
      fileStatus("foreignLicense"),
      fileStatus("ca40IR"),
      fileStatus("signalReceptionTest"),
      fileStatus("c172CheckrideStatement"),
      fileStatus("c172FlightReview"),
      fileStatus("pic100Statement"),
      fileStatus("crossCountry300Statement"),
      fileStatus("picCrossCountryStatement"),
      fileStatus("instrumentTimeStatement"),
      fileStatus("medicalAssessment"),
      fileStatus("rtrCertificate"), // ✅ FIXED: was "rtr"
      fileStatus("frtolCertificate"), // ✅ FIXED: was "frtol"
      fileStatus("policeVerification"),
      fileStatus("marksheet10"),
      fileStatus("marksheet12"),
      fileStatus("nameChangeCertificate"),
      fileStatus("studentSignature"),
      fileStatus("finalSignature"),
    ]; 
  
    await appendConversionRow(sheetRow); 
    
    console.log("✅ Google Sheet updated");
  
    console.log("🎉 Job finished successfully"); 
    
  } finally {
    // Cleanup
    console.log("🧹 Cleaning up files...");
    
    const filesToClean = [];
    
    if (combinedPdfPath) {
      filesToClean.push(combinedPdfPath);
    }
    
    uploadedFiles.forEach(file => {
      if (file?.path) {
        filesToClean.push(file.path);
      }
    });
    
    cleanupFiles(filesToClean);
  }
} 
 
// ================ CLEANUP ================ 
 
function cleanupFiles(filePaths) { 
  filePaths.forEach((filePath) => { 
    if (filePath && fs.existsSync(filePath)) { 
      try { 
        fs.unlinkSync(filePath); 
        console.log(`🗑️ Deleted: ${filePath}`); 
      } catch (e) { 
        console.error(`⚠️ Cleanup failed for ${filePath}:`, e.message); 
      } 
    } 
  }); 
} 
 
function getQueueStatus() { 
  return { 
    queueLength: jobQueue.length,
    isProcessing,
    jobs: jobQueue.map(j => ({
      id: j.id,
      status: j.status,
      attempts: j.attempts,
      createdAt: j.createdAt,
      studentName: j.data?.formData?.fullName || "Unknown",
    })),
  }; 
} 
 
module.exports = { 
  addJob, 
  getQueueStatus, 
};