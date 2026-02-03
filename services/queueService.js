// Backend/services/queueService.js - EXACT FORM/PDF SEQUENCE
 
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
  
    // 3️⃣ Push data to Google Sheet - EXACT FORM/PDF SEQUENCE
    console.log("📊 Writing to Google Sheet..."); 
  
    // Helper function to check file status
    const fileStatus = (name) => 
      uploadedFiles.some((f) => f.fieldname === name) 
        ? "Attached" 
        : "Not Attached"; 
  
    // Calculate sortie summary
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

    // Format DGCA exams summary
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

    // Helper to get DGCA exam details
    const getExamDetail = (examName, field) => {
      if (!formData.dgcaExamDetails || formData.dgcaExamDetails.length === 0) return "";
      const exam = formData.dgcaExamDetails.find(e => e.exam === examName);
      return exam ? exam[field] || "" : "";
    };

    // 🎯 EXACT SEQUENCE AS FORM & PDF (75 Columns Total)
    const sheetRow = [ 
      // 1. TIMESTAMP
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  
      // 2-7. PERSONAL DETAILS
      formData.fullName || "",
      formData.age || "",
      formData.gender || "",
      formData.mobile || "",
      formData.email || "",
      fileStatus("passportPhoto"),
  
      // 8-11. LICENSE DETAILS
      formData.contractingState || "",
      formData.licenseValidity || "",
      formData.licenseEndorsement || "",
      fileStatus("foreignLicense"),
  
      // 12-16. TOTAL FLYING HOURS
      `${formData.totalSEHours || 0}:${formData.totalSEMinutes || 0}`,
      formData.licenseEndorsement === "SE ME IR" ? `${formData.totalMEHours || 0}:${formData.totalMEMinutes || 0}` : "N/A",
      formData.totalHours || "",
      formData.aircraftTypes || "",
      formData.lastFlightDate || "",
  
      // 17-27. LAST 6 MONTHS OF FLYING EXPERIENCE
      formData.last6MonthsAvailable || "",
      formData.sortieRows?.length || 0,
      `${Math.floor(totalDayPIC)}h ${Math.round((totalDayPIC % 1) * 60)}m`,
      `${Math.floor(totalNightPIC)}h ${Math.round((totalNightPIC % 1) * 60)}m`,
      totalNightPICLDG,
      totalNightPICTO,
      `${Math.floor(totalIF)}h ${Math.round((totalIF % 1) * 60)}m`,
      formData.irCheckAircraft || "",
      formData.irCheckDate || "",
      formData.irCheckValidity || "",
      fileStatus("ca40IR"),
  
      // 28-31. SIGNAL RECEPTION TEST
      formData.signalReception || "",
      formData.signalReceptionDate || "",
      formData.signalReceptionValidity || "",
      fileStatus("signalReceptionTest"),
  
      // 32-36. COMMERCIAL CHECKRIDE
      formData.commercialCheckride || "",
      formData.c172CheckrideDate || "",
      fileStatus("c172CheckrideStatement"),
      formData.c172PICOption || "",
      fileStatus("c172FlightReview"),
  
      // 37-43. PIC EXPERIENCE
      `${formData.totalPICExperience || 0} hrs`,
      fileStatus("pic100Statement"),
      fileStatus("crossCountry300Statement"),
      `${formData.totalPICCrossCountry || 0} hrs`,
      fileStatus("picCrossCountryStatement"),
      `${formData.totalInstrumentTime || 0} hrs`,
      fileStatus("instrumentTimeStatement"),
  
      // 44-45. DGCA CLASS-1 MEDICAL ASSESSMENT
      formData.medicalValidity || "",
      fileStatus("medicalAssessment"),
      
      // 46-64. DGCA EXAMS CLEARED
      dgcaExamsList, // Summary
      
      // Air Navigation (47-49)
      getExamDetail("airNavigation", "resultDate"),
      getExamDetail("airNavigation", "validity"),
      fileStatus("dgcaExam_airNavigation"),
      
      // Meteorology (50-52)
      getExamDetail("meteorology", "resultDate"),
      getExamDetail("meteorology", "validity"),
      fileStatus("dgcaExam_meteorology"),
      
      // Air Regulations (53-55)
      getExamDetail("airRegulations", "resultDate"),
      getExamDetail("airRegulations", "validity"),
      fileStatus("dgcaExam_airRegulations"),
      
      // Technical General (56-58)
      getExamDetail("technicalGeneral", "resultDate"),
      getExamDetail("technicalGeneral", "validity"),
      fileStatus("dgcaExam_technicalGeneral"),
      
      // Technical Specific (59-61)
      getExamDetail("technicalSpecific", "resultDate"),
      getExamDetail("technicalSpecific", "validity"),
      fileStatus("dgcaExam_technicalSpecific"),
      
      // Composite Paper (62-64)
      getExamDetail("compositePaper", "resultDate"),
      getExamDetail("compositePaper", "validity"),
      fileStatus("dgcaExam_compositePaper"),
  
      // 65-72. ADDITIONAL DOCUMENTS
      fileStatus("rtrCertificate"),
      formData.rtrValidity || "",
      fileStatus("frtolCertificate"),
      formData.policeVerificationDate || "",
      fileStatus("policeVerification"),
      fileStatus("marksheet10"),
      fileStatus("marksheet12"),
      formData.nameChangeProcessed || "",
      fileStatus("nameChangeCertificate"),
  
      // 73. HOW DID YOU HEAR ABOUT US
      formData.hearAboutUs || "",
  
      // 74-75. SIGNATURES
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