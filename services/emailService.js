// Backend/services/emailService.js
require("dotenv").config();
const fs = require("fs");
const brevo = require("@getbrevo/brevo");

/* ==========================
   BREVO API CLIENT (SINGLETON)
========================== */

let apiInstance;
let isVerified = false;

function createBrevoClient() {
  if (apiInstance) return apiInstance;

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("❌ BREVO_API_KEY missing in .env");
  }

  console.log("📧 Initializing Brevo API client...");

  apiInstance = new brevo.TransactionalEmailsApi();

  const apiKeyAuth = apiInstance.authentications["apiKey"];
  apiKeyAuth.apiKey = apiKey;

  return apiInstance;
}

/* ==========================
   VERIFY API KEY (ONE TIME)
========================== */

async function verifyConnection() {
  if (isVerified) return;

  const client = createBrevoClient();

  try {
    console.log("🔍 Verifying Brevo API key...");

    const accountApi = new brevo.AccountApi();
    const apiKeyAuth = accountApi.authentications["apiKey"];
    apiKeyAuth.apiKey = process.env.BREVO_API_KEY;

    await accountApi.getAccount();

    console.log("✅ Brevo API key verified successfully");
    isVerified = true;
  } catch (error) {
    console.error("❌ Brevo API verification failed:", error.message);
    throw new Error(`Brevo API Error: ${error.message}`);
  }
}

/* ==========================
   EMAIL SENDER WITH RETRY
========================== */

async function sendAdminEmail({ formData, pdfPath, uploadedFiles = [] }) {
  await verifyConnection();

  const client = createBrevoClient();

  const safeName = (formData.fullName || "Student")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");

  /* ==========================
     PREPARE ATTACHMENTS
  ========================== */

  const attachments = [];

  // Add generated PDF
  if (pdfPath && fs.existsSync(pdfPath)) {
    const pdfContent = fs.readFileSync(pdfPath);
    attachments.push({
      name: `${safeName}-Conversion-Recency-Form.pdf`,
      content: pdfContent.toString("base64"),
    });
  }

  const FROM_EMAIL = process.env.MAIL_FROM;
  const FROM_NAME = "SkyPro Aviation";
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  if (!FROM_EMAIL || !ADMIN_EMAIL) {
    throw new Error("❌ MAIL_FROM or ADMIN_EMAIL missing in .env");
  }

  /* ==========================
     RETRY HELPER
  ========================== */

  const sendWithRetry = async (emailData, label, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📤 Sending ${label} (Attempt ${attempt}/${maxRetries})...`,
        );

        const result = await client.sendTransacEmail(emailData);

        console.log(`✅ ${label} sent successfully`);
        console.log(`   Message ID: ${result.messageId}`);

        return result;
      } catch (error) {
        console.error(`❌ ${label} Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw new Error(
            `${label} failed after ${maxRetries} attempts: ${error.message}`,
          );
        }

        const waitTime = attempt * 3000;
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  };

  /* ==========================
     EMAIL CONTENT
  ========================== */

  const formatExamName = (examKey) => {
    const examNames = {
      airNavigation: "Air Navigation",
      meteorology: "Meteorology",
      airRegulations: "Air Regulations",
      technicalGeneral: "Technical General",
      technicalSpecific: "Technical Specific",
      compositePaper: "Composite Paper (Meteorology + Navigation)",
    };
    return examNames[examKey] || examKey;
  };

  // Format sortie summary if available - ✅ ENHANCED WITH LDG/TO
  let sortieSummary = "";
  if (formData.sortieRows && formData.sortieRows.length > 0) {
    let totalDayPIC = 0,
      totalNightPIC = 0,
      totalIF = 0;
    let totalNightPICLDG = 0,
      totalNightPICTO = 0; // ✅ ADDED

    formData.sortieRows.forEach((row) => {
      const hours = parseInt(row.hours) || 0;
      const minutes = parseInt(row.minutes) || 0;
      const totalTime = hours + minutes / 60;

      if (row.typeOfFlight === "Day PIC") totalDayPIC += totalTime;
      if (row.typeOfFlight === "Night PIC") {
        totalNightPIC += totalTime;
        totalNightPICLDG += parseInt(row.ldg) || 0; // ✅ ADDED
        totalNightPICTO += parseInt(row.to) || 0; // ✅ ADDED
      }
      if (row.typeOfFlight === "IF") totalIF += totalTime;
    });

    sortieSummary = `
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="color: #1e40af; margin-top: 0;">Last 6 Months Flying Summary</h4>
        <p style="margin: 5px 0;"><strong>Total Day PIC:</strong> ${Math.floor(totalDayPIC)}h ${Math.round((totalDayPIC % 1) * 60)}m</p>
        <p style="margin: 5px 0;"><strong>Total Night PIC:</strong> ${Math.floor(totalNightPIC)}h ${Math.round((totalNightPIC % 1) * 60)}m</p>
        <p style="margin: 5px 0;"><strong>Total Night LDG:</strong> ${totalNightPICLDG}</p>
        <p style="margin: 5px 0;"><strong>Total Night  TO:</strong> ${totalNightPICTO}</p>
        <p style="margin: 5px 0;"><strong>Total IF:</strong> ${Math.floor(totalIF)}h ${Math.round((totalIF % 1) * 60)}m</p>
      </div>
    `;
  }

  // Format DGCA exams if available
  let dgcaExamsList = "";
  if (formData.dgcaExamDetails && formData.dgcaExamDetails.length > 0) {
    dgcaExamsList = `
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="color: #166534; margin-top: 0;">DGCA Exams Cleared</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${formData.dgcaExamDetails
            .map((exam) => {
              const examName = formatExamName(exam.exam);
              let statusBadge = "";

              if (exam.validity === "Expired") {
                statusBadge =
                  '<span style="color: #dc2626; font-weight: bold;">❌ EXPIRED</span>';
              } else if (exam.validity === "SPL Exam Required") {
                statusBadge =
                  '<span style="color: #f59e0b; font-weight: bold;">⚠️ SPL EXAM REQUIRED</span>';
              } else {
                statusBadge = `<span style="color: #059669;">✅ Valid until ${exam.validity}</span>`;
              }

              return `
              <li>
                <strong>${examName}:</strong> 
                Result Date: ${exam.resultDate || "N/A"}<br>
                Status: ${statusBadge}
              </li>
            `;
            })
            .join("")}
        </ul>
      </div>
    `;
  }

  // Admin Email
  const adminEmail = new brevo.SendSmtpEmail();
  adminEmail.sender = { name: FROM_NAME, email: FROM_EMAIL };
  adminEmail.to = [{ email: ADMIN_EMAIL }];
  adminEmail.subject = `New Conversion & Recency Application – ${formData.fullName}`;
  adminEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        New Conversion & Recency Application Received
      </h2>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Student Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Full Name:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Age:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.age}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Gender:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.gender}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Mobile:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.mobile}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Email:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.email}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #92400e; margin-top: 0;">License Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Contracting State:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.contractingState}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>License Validity:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.licenseValidity || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>License Endorsement:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.licenseEndorsement}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Total SE Hours:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.totalSEHours}:${formData.totalSEMinutes}</td>
          </tr>
          ${
            formData.licenseEndorsement === "SE ME IR"
              ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Total ME Hours:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.totalMEHours}:${formData.totalMEMinutes}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Total Hours:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.totalHours}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Aircraft Types:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #fde68a;">${formData.aircraftTypes}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Last Flight Date:</strong></td>
            <td style="padding: 8px;">${formData.lastFlightDate || "N/A"}</td>
          </tr>
        </table>
      </div>
      
      ${sortieSummary}
      
      ${
        formData.last6MonthsAvailable === "Yes"
          ? `
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #075985; margin-top: 0;">IR Check & Signal Reception</h3>
        <p style="margin: 5px 0;"><strong>IR Check Aircraft:</strong> ${formData.irCheckAircraft || "N/A"}</p>
        <p style="margin: 5px 0;"><strong>IR Check Date:</strong> ${formData.irCheckDate || "N/A"}</p>
        <p style="margin: 5px 0;"><strong>IR Check Validity:</strong> ${formData.irCheckValidity || "N/A"}</p>
        ${
          formData.signalReception === "Yes"
            ? `
        <p style="margin: 5px 0;"><strong>Signal Reception Date:</strong> ${formData.signalReceptionDate || "N/A"}</p>
        <p style="margin: 5px 0;"><strong>Signal Reception Validity:</strong> ${formData.signalReceptionValidity || "N/A"}</p>
        `
            : ""
        }
      </div>
      `
          : ""
      }
      
      <div style="background-color: #fdf4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #701a75; margin-top: 0;">PIC Experience</h3>
        <p style="margin: 5px 0;"><strong>Total PIC Experience:</strong> ${formData.totalPICExperience} hours</p>
        <p style="margin: 5px 0;"><strong>Total PIC Cross Country:</strong> ${formData.totalPICCrossCountry} hours</p>
        <p style="margin: 5px 0;"><strong>Total Instrument Time:</strong> ${formData.totalInstrumentTime} hours</p>
      </div>
      
      ${dgcaExamsList}
      
      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #065f46; margin-top: 0;">Medical & Additional Info</h3>
        <p style="margin: 5px 0;"><strong>Medical Validity:</strong> ${formData.medicalValidity || "N/A"}</p>
        <p style="margin: 5px 0;"><strong>RTR Validity:</strong> ${formData.rtrValidity || "N/A"}</p>
        <p style="margin: 5px 0;"><strong>Police Verification Date:</strong> ${formData.policeVerificationDate || "N/A"}</p>
        <p style="margin: 5px 0;"><strong>Name Change Processed:</strong> ${formData.nameChangeProcessed || "No"}</p>
      </div>
      
      <p style="color: #059669; font-weight: bold; margin: 20px 0;">
        📎 Complete application form with all documents is attached to this email.
      </p>
      
      <p style="color: #6b7280; margin: 15px 0;">
        <strong>Submitted:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
      </p>
      
      ${
        formData.hearAboutUs
          ? `
      <p style="color: #6b7280; margin: 5px 0;">
        <strong>How they heard about us:</strong> ${formData.hearAboutUs}
      </p>
      `
          : ""
      }
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 12px;">
        This is an automated notification from the SkyPro Aviation Conversion & Recency system.
      </p>
    </div>
  `;
  adminEmail.attachment = attachments;

  // Student Confirmation Email
  const studentEmail = new brevo.SendSmtpEmail();
  studentEmail.sender = { name: FROM_NAME, email: FROM_EMAIL };
  studentEmail.to = [{ email: formData.email, name: formData.fullName }];
  studentEmail.subject =
    "Conversion & Recency Application Received – SkyPro Aviation";
  studentEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">SkyPro Aviation</h1>
        <p style="color: #6b7280; margin: 5px 0;">Excellence in Aviation Training</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px 0;">Application Received Successfully! ✓</h2>
        <p style="margin: 0; opacity: 0.9;">Thank you for choosing SkyPro Aviation</p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Dear <strong>${formData.fullName}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        We are pleased to confirm that your <strong>Conversion & Recency</strong> application 
        has been successfully received and is now being processed by our training team.
      </p>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e;">
          <strong>⏳ Next Steps:</strong><br>
          Our training team will review your application and flying experience. We will contact you within 
          2-3 business days to discuss your training schedule and requirements.
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Your Application Summary</h3>
        <p style="margin: 5px 0;"><strong>License Type:</strong> ${formData.licenseEndorsement}</p>
        <p style="margin: 5px 0;"><strong>Contracting State:</strong> ${formData.contractingState}</p>
        <p style="margin: 5px 0;"><strong>Total Hours:</strong> ${formData.totalHours}</p>
        <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
      </div>
      
      <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>📋 Important:</strong><br>
          Please keep your foreign license and all required documents ready. Our team may request 
          additional information during the review process.
        </p>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
        If you have any questions in the meantime, please don't hesitate to reach out to us.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 5px 0;"><strong>Best Regards,</strong></p>
        <p style="margin: 5px 0;"><strong>SkyPro Aviation Training Team</strong></p>
        <p style="margin: 5px 0;">📧 ${ADMIN_EMAIL}</p>
        <p style="margin: 5px 0;">📞 +91 8955804726</p>
        <p style="margin: 15px 0 5px 0; font-size: 12px; color: #9ca3af;">
          This is an automated confirmation email. Please do not reply to this message.
        </p>
      </div>
    </div>
  `;
  studentEmail.attachment = attachments;

  /* ==========================
     SEND BOTH EMAILS IN PARALLEL
  ========================== */

  console.log("🚀 Sending emails via Brevo API...");

  try {
    await Promise.all([
      sendWithRetry(adminEmail, "Admin Email"),
      sendWithRetry(studentEmail, "Student Confirmation"),
    ]);

    console.log("✅ All emails sent successfully via Brevo API!");
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
}

module.exports = sendAdminEmail;
