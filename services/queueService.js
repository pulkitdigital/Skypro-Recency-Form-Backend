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
  
    const fileStatus = (name) => 
      uploadedFiles.some((f) => f.fieldname === name) 
        ? "Attached" 
        : "Not Attached"; 
  
    // Calculate sortie summary
    let totalDayPIC = 0, totalNightPIC = 0, totalIF = 0;
    if (formData.sortieRows && formData.sortieRows.length > 0) {
      formData.sortieRows.forEach(row => {
        const hours = parseInt(row.hours) || 0;
        const minutes = parseInt(row.minutes) || 0;
        const totalTime = hours + minutes / 60;
        
        if (row.typeOfFlight === "Day PIC") totalDayPIC += totalTime;
        if (row.typeOfFlight === "Night PIC") totalNightPIC += totalTime;
        if (row.typeOfFlight === "IF") totalIF += totalTime;
      });
    }

    // Format DGCA exams
    const dgcaExamsList = formData.dgcaExamDetails && formData.dgcaExamDetails.length > 0
      ? formData.dgcaExamDetails.map(exam => 
          `${exam.exam}: ${exam.resultDate} (Valid: ${exam.validity})`
        ).join("; ")
      : "None";

    const sheetRow = [ 
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // Timestamp
  
      // Personal Details
      formData.fullName || "", 
      formData.age || "", 
      formData.gender || "", 
      formData.mobile || "", 
      formData.email || "", 
  
      // License Details
      formData.contractingState || "", 
      formData.licenseValidity || "", 
      formData.licenseEndorsement || "", 
  
      // Flying Hours
      `${formData.totalSEHours || 0}:${formData.totalSEMinutes || 0}`,
      formData.licenseEndorsement === "SE ME IR" ? `${formData.totalMEHours || 0}:${formData.totalMEMinutes || 0}` : "N/A",
      formData.totalHours || "",
      formData.aircraftTypes || "",
      formData.lastFlightDate || "",
  
      // Last 6 Months
      formData.last6MonthsAvailable || "",
      formData.sortieRows?.length || 0,
      `${Math.floor(totalDayPIC)}h ${Math.round((totalDayPIC % 1) * 60)}m`,
      `${Math.floor(totalNightPIC)}h ${Math.round((totalNightPIC % 1) * 60)}m`,
      `${Math.floor(totalIF)}h ${Math.round((totalIF % 1) * 60)}m`,
  
      // IR Check
      formData.irCheckAircraft || "",
      formData.irCheckDate || "",
      formData.irCheckValidity || "",
  
      // Signal Reception
      formData.signalReception || "",
      formData.signalReceptionDate || "",
      formData.signalReceptionValidity || "",
  
      // Commercial Checkride
      formData.commercialCheckride || "",
      formData.c172CheckrideDate || "",
      formData.c172PICOption || "",
  
      // PIC Experience
      `${formData.totalPICExperience || 0} hrs`,
      `${formData.totalPICXC || 0} hrs`,
      `${formData.totalInstrumentTime || 0} hrs`,
  
      // Medical & Exams
      formData.medicalValidity || "",
      dgcaExamsList,
  
      // Additional Documents
      formData.rtrValidity || "",
      formData.policeVerificationDate || "",
      formData.nameChangeProcessed || "",
  
      // Source
      formData.hearAboutUs || "",
  
      // File Status
      fileStatus("passportPhoto"),
      fileStatus("foreignLicense"),
      fileStatus("ca40IR"),
      fileStatus("signalReceptionTest"),
      fileStatus("c172CheckrideStatement"),
      fileStatus("c172FlightReview"),
      fileStatus("pic100Statement"),
      fileStatus("xc300Statement"),
      fileStatus("picXCStatement"),
      fileStatus("instrumentTimeStatement"),
      fileStatus("medicalAssessment"),
      fileStatus("rtr"),
      fileStatus("frtol"),
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