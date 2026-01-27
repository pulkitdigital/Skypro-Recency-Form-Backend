// // // Backend/services/emailService.js
// // require("dotenv").config();
// // const nodemailer = require("nodemailer");
// // const fs = require("fs");

// // async function sendAdminEmail({ formData, pdfPath, uploadedFiles }) {
// //   // 🔒 Sanitize student name for filenames
// //   const safeName = formData.fullName
// //     .trim()
// //     .replace(/\s+/g, "-")
// //     .replace(/[^a-zA-Z0-9-]/g, "");

// //   const transporter = nodemailer.createTransport({
// //     host: process.env.SMTP_HOST || "smtp.gmail.com",
// //     port: Number(process.env.SMTP_PORT) || 587,
// //     secure: false,
// //     auth: {
// //       user: process.env.EMAIL_USER,
// //       pass: process.env.EMAIL_PASS,
// //     },
// //   });

// //   await transporter.verify();

// //   /* ============================
// //      ADMIN EMAIL (INTERNAL)
// //   ============================ */

// //   const adminAttachments = [
// //     {
// //       filename: `${safeName}-Admission-Form.pdf`,
// //       path: pdfPath,
// //       contentType: "application/pdf",
// //     },
// //   ];

// //   // Attach uploaded PDFs with student-based names
// //   if (uploadedFiles && uploadedFiles.length) {
// //     uploadedFiles.forEach((file, index) => {
// //       if (
// //         file.path &&
// //         fs.existsSync(file.path) &&
// //         file.mimetype === "application/pdf"
// //       ) {
// //         adminAttachments.push({
// //           filename:
// //             uploadedFiles.length === 1
// //               ? `${safeName}-Uploaded-Documents.pdf`
// //               : `${safeName}-Uploaded-Document-${index + 1}.pdf`,
// //           path: file.path,
// //           contentType: "application/pdf",
// //         });
// //       }
// //     });
// //   }

// //   await transporter.sendMail({
// //     from: `"SKYPRO Aviation" <${process.env.EMAIL_USER}>`,
// //     to: process.env.ADMIN_EMAIL,
// //     subject: `🆕 New Admission - ${formData.fullName}`,
// //     html: `
// //       <h2>New Student Admission</h2>
// //       <p><b>Name:</b> ${formData.fullName}</p>
// //       <p><b>Email:</b> ${formData.email}</p>
// //       <p><b>Mobile:</b> ${formData.mobile}</p>
// //       <p><b>Course:</b> ${formData.course}</p>
// //       <p><b>Documents:</b> Attached PDFs</p>
// //       <hr />
// //       <p style="font-size:12px;color:#666">
// //         Internal use only • SkyPro Aviation Admission System
// //       </p>
// //     `,
// //     attachments: adminAttachments,
// //   });

// //   /* ============================
// //      STUDENT CONFIRMATION EMAIL
// //   ============================ */

// //   await transporter.sendMail({
// //     from: `"SKYPRO Aviation" <${process.env.EMAIL_USER}>`,
// //     to: formData.email,
// //     subject: "Admission Form Submitted Successfully – SkyPro Aviation",
// //     html: `
// //       <p>Dear ${formData.fullName},</p>

// //       <p>
// //         Thank you for submitting your admission form for
// //         <b>${formData.course}</b>.
// //       </p>

// //       <p>
// //         We have successfully received your details.
// //         Our admissions team will review your application and
// //         contact you shortly regarding the next steps.
// //       </p>

// //       <p>
// //         Please find attached a copy of your submitted admission form
// //         for your reference.
// //       </p>

// //       <br />

// //       <p>
// //         Regards,<br />
// //         <b>Admissions Team</b><br />
// //         SkyPro Aviation
// //       </p>

// //       <p style="font-size:12px;color:#666">
// //         This is an automated confirmation email.
// //       </p>
// //     `,
// //   });
// // }

// // module.exports = sendAdminEmail;







// // // Backend/services/emailService.js
// // require("dotenv").config();
// // const nodemailer = require("nodemailer");
// // const fs = require("fs");
// // const path = require("path");

// // /* ==========================
// //    TRANSPORTER (SINGLETON)
// // ========================== */

// // let transporter;

// // function createTransporter() {
// //   if (transporter) return transporter;

// //   const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
// //   const port = Number(process.env.SMTP_PORT || 587);
// //   const pass = process.env.SMTP_PASS; // Brevo SMTP KEY

// //   if (!pass) {
// //     throw new Error("SMTP_PASS (Brevo SMTP key) missing");
// //   }

// //   transporter = nodemailer.createTransport({
// //     host,
// //     port,
// //     secure: port === 465, // 587 → false | 465 → true
// //     auth: {
// //       user: "apikey", // 🔑 ALWAYS apikey for Brevo
// //       pass,
// //     },
// //     connectionTimeout: 20000,
// //     greetingTimeout: 20000,
// //     socketTimeout: 20000,
// //   });

// //   return transporter;
// // }

// // /* ==========================
// //    EMAIL SENDER
// // ========================== */

// // async function sendAdminEmail({ formData, pdfPath, uploadedFiles = [] }) {
// //   const transporter = createTransporter();

// //   // Fail fast if SMTP is broken (production lifesaver)
// //   await transporter.verify();

// //   /* ==========================
// //      SAFE FILE NAME
// //   ========================== */

// //   const safeName = (formData.fullName || "Student")
// //     .trim()
// //     .replace(/\s+/g, "-")
// //     .replace(/[^a-zA-Z0-9-]/g, "");

// //   /* ==========================
// //      ATTACHMENTS
// //   ========================== */

// //   const attachments = [];

// //   if (pdfPath && fs.existsSync(pdfPath)) {
// //     attachments.push({
// //       filename: `${safeName}-Admission-Form.pdf`,
// //       path: pdfPath,
// //       contentType: "application/pdf",
// //     });
// //   }

// //   uploadedFiles.forEach((file, index) => {
// //     if (
// //       file?.path &&
// //       fs.existsSync(file.path) &&
// //       file.mimetype === "application/pdf"
// //     ) {
// //       attachments.push({
// //         filename:
// //           uploadedFiles.length === 1
// //             ? `${safeName}-Uploaded-Documents.pdf`
// //             : `${safeName}-Uploaded-Document-${index + 1}.pdf`,
// //         path: file.path,
// //         contentType: "application/pdf",
// //       });
// //     }
// //   });

// //   /* ==========================
// //      FROM / TO
// //   ========================== */

// //   const FROM_EMAIL =
// //     process.env.MAIL_FROM || "no-reply@yourverifieddomain.com";

// //   if (!process.env.ADMIN_EMAIL) {
// //     throw new Error("ADMIN_EMAIL missing");
// //   }

// //   /* ==========================
// //      ADMIN EMAIL
// //   ========================== */

// //   await transporter.sendMail({
// //     from: `"SkyPro Aviation" <${FROM_EMAIL}>`,
// //     to: process.env.ADMIN_EMAIL,
// //     subject: `New Admission – ${formData.fullName}`,
// //     html: `
// //       <h3>New Admission Received</h3>
// //       <p><b>Name:</b> ${formData.fullName}</p>
// //       <p><b>Email:</b> ${formData.email}</p>
// //       <p><b>Mobile:</b> ${formData.mobile}</p>
// //       <p><b>Course:</b> ${formData.course}</p>
// //       <p>Attached: Admission Form & Documents</p>
// //     `,
// //     attachments,
// //   });

// //   /* ==========================
// //      STUDENT CONFIRMATION
// //   ========================== */

// //   await transporter.sendMail({
// //     from: `"SkyPro Aviation" <${FROM_EMAIL}>`,
// //     to: formData.email,
// //     subject: "Admission Form Submitted – SkyPro Aviation",
// //     html: `
// //       <p>Dear ${formData.fullName},</p>
// //       <p>Your admission form for <b>${formData.course}</b> has been received.</p>
// //       <p>Our team will contact you shortly.</p>
// //       <br/>
// //       <p>Regards,<br/>SkyPro Aviation</p>
// //     `,
// //   });
// // }

// // module.exports = sendAdminEmail;




















// // Backend/services/emailService.js
// require("dotenv").config();
// const nodemailer = require("nodemailer");
// const fs = require("fs");

// /* ==========================
//    TRANSPORTER (SINGLETON)
// ========================== */

// let transporter;

// function createTransporter() {
//   if (transporter) return transporter;

//   const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
//   const port = Number(process.env.SMTP_PORT || 587);
//   const user = process.env.SMTP_USER || "apikey";
//   const pass = process.env.SMTP_PASS;

//   if (!pass) {
//     throw new Error("❌ SMTP_PASS missing in .env");
//   }

//   console.log(`📧 SMTP Config: ${host}:${port} | User: ${user}`);

//   transporter = nodemailer.createTransport({
//     host,
//     port,
//     secure: false, // STARTTLS for port 587
//     requireTLS: true,
//     auth: { user, pass },
    
//     // ✅ NO TIMEOUT LIMITS - Unlimited time
//     connectionTimeout: 0, // 0 = no timeout
//     greetingTimeout: 0,
//     socketTimeout: 0,
    
//     pool: true, // ✅ Connection pooling for speed
//     maxConnections: 5,
//     maxMessages: 100,
    
//     logger: true,
//     debug: process.env.NODE_ENV !== "production",
    
//     tls: {
//       rejectUnauthorized: true,
//       minVersion: "TLSv1.2",
//     },
//   });

//   return transporter;
// }

// /* ==========================
//    VERIFY CONNECTION (ONE TIME)
// ========================== */

// let isVerified = false;

// async function verifyConnection() {
//   if (isVerified) return;
  
//   const transporter = createTransporter();
  
//   try {
//     console.log("🔍 Verifying SMTP...");
//     await transporter.verify();
//     console.log("✅ SMTP Ready");
//     isVerified = true;
//   } catch (error) {
//     console.error("❌ SMTP Verification Failed:", error.message);
//     throw new Error(`SMTP Error: ${error.message}`);
//   }
// }

// /* ==========================
//    EMAIL SENDER (PARALLEL + RETRY)
// ========================== */

// async function sendAdminEmail({ formData, pdfPath, uploadedFiles = [] }) {
//   // Verify once per server restart
//   await verifyConnection();
  
//   const transporter = createTransporter();

//   const safeName = (formData.fullName || "Student")
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^a-zA-Z0-9-]/g, "");

//   /* ==========================
//      ATTACHMENTS
//   ========================== */

//   const attachments = [];

//   if (pdfPath && fs.existsSync(pdfPath)) {
//     attachments.push({
//       filename: `${safeName}-Admission-Form.pdf`,
//       path: pdfPath,
//       contentType: "application/pdf",
//     });
//   }

//   uploadedFiles.forEach((file, index) => {
//     if (
//       file?.path &&
//       fs.existsSync(file.path) &&
//       file.mimetype === "application/pdf"
//     ) {
//       attachments.push({
//         filename:
//           uploadedFiles.length === 1
//             ? `${safeName}-Uploaded-Documents.pdf`
//             : `${safeName}-Uploaded-Document-${index + 1}.pdf`,
//         path: file.path,
//         contentType: "application/pdf",
//       });
//     }
//   });

//   const FROM_EMAIL = process.env.MAIL_FROM;
//   const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

//   if (!FROM_EMAIL || !ADMIN_EMAIL) {
//     throw new Error("❌ MAIL_FROM or ADMIN_EMAIL missing in .env");
//   }

//   /* ==========================
//      RETRY HELPER (MAX 3 ATTEMPTS)
//   ========================== */

//   const sendWithRetry = async (mailOptions, label, maxRetries = 3) => {
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       try {
//         console.log(`📤 Sending ${label} (Attempt ${attempt}/${maxRetries})...`);
//         const info = await transporter.sendMail(mailOptions);
//         console.log(`✅ ${label} sent: ${info.messageId}`);
//         return info;
//       } catch (error) {
//         console.error(`❌ ${label} Attempt ${attempt} failed:`, error.message);
        
//         if (attempt === maxRetries) {
//           throw new Error(`${label} failed after ${maxRetries} attempts: ${error.message}`);
//         }
        
//         // Wait before retry (exponential backoff)
//         const waitTime = attempt * 3000; // 3s, 6s, 9s
//         console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
//         await new Promise(resolve => setTimeout(resolve, waitTime));
//       }
//     }
//   };

//   /* ==========================
//      SEND BOTH EMAILS IN PARALLEL
//   ========================== */

//   const adminMailOptions = {
//     from: `"SkyPro Aviation" <${FROM_EMAIL}>`,
//     to: ADMIN_EMAIL,
//     subject: `New Admission – ${formData.fullName}`,
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #2563eb;">New Admission Received</h2>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formData.fullName}</td>
//           </tr>
//           <tr>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formData.email}</td>
//           </tr>
//           <tr>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Mobile:</strong></td>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formData.mobile}</td>
//           </tr>
//           <tr>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Course:</strong></td>
//             <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formData.course}</td>
//           </tr>
//         </table>
//         <p style="margin-top: 20px; color: #6b7280;">📎 Admission Form & Documents are attached.</p>
//       </div>
//     `,
//     attachments,
//   };

//   const studentMailOptions = {
//     from: `"SkyPro Aviation" <${FROM_EMAIL}>`,
//     to: formData.email,
//     subject: "Admission Form Submitted – SkyPro Aviation",
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//         <h2 style="color: #2563eb;">Thank You for Your Application!</h2>
//         <p>Dear <strong>${formData.fullName}</strong>,</p>
//         <p>Your admission form for <strong>${formData.course}</strong> has been successfully received.</p>
//         <p>Our admissions team will review your application and contact you shortly.</p>
//         <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
//         <p style="color: #6b7280; font-size: 14px;">
//           Best Regards,<br/>
//           <strong>SkyPro Aviation Team</strong><br/>
//           📧 ${ADMIN_EMAIL}
//         </p>
//       </div>
//     `,
//   };

//   // ✅ SEND BOTH EMAILS SIMULTANEOUSLY (FASTER)
//   console.log("🚀 Sending emails in parallel...");
  
//   await Promise.all([
//     sendWithRetry(adminMailOptions, "Admin Email"),
//     sendWithRetry(studentMailOptions, "Student Confirmation"),
//   ]);

//   console.log("✅ All emails sent successfully!");
// }

// module.exports = sendAdminEmail;
















// Backend/services/emailService.js
require("dotenv").config();
const fs = require("fs");

// Install this: npm install @getbrevo/brevo
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
  
  // Set API key
  const apiKeyAuth = apiInstance.authentications['apiKey'];
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
    
    // Test API connection by getting account info
    const accountApi = new brevo.AccountApi();
    const apiKeyAuth = accountApi.authentications['apiKey'];
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
  // Verify API key once
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
      name: `${safeName}-Admission-Form.pdf`,
      content: pdfContent.toString("base64"),
    });
  }

  // Add uploaded documents
  uploadedFiles.forEach((file, index) => {
    if (file?.path && fs.existsSync(file.path) && file.mimetype === "application/pdf") {
      const fileContent = fs.readFileSync(file.path);
      const fileName = uploadedFiles.length === 1
        ? `${safeName}-Uploaded-Documents.pdf`
        : `${safeName}-Uploaded-Document-${index + 1}.pdf`;
      
      attachments.push({
        name: fileName,
        content: fileContent.toString("base64"),
      });
    }
  });

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
        console.log(`📤 Sending ${label} (Attempt ${attempt}/${maxRetries})...`);
        
        const result = await client.sendTransacEmail(emailData);
        
        console.log(`✅ ${label} sent successfully`);
        console.log(`   Message ID: ${result.messageId}`);
        
        return result;
      } catch (error) {
        console.error(`❌ ${label} Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`${label} failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const waitTime = attempt * 3000;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  /* ==========================
     EMAIL CONTENT
  ========================== */

  // Admin Email
  const adminEmail = new brevo.SendSmtpEmail();
  adminEmail.sender = { name: FROM_NAME, email: FROM_EMAIL };
  adminEmail.to = [{ email: ADMIN_EMAIL }];
  adminEmail.subject = `New Admission – ${formData.fullName}`;
  adminEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        New Admission Application Received
      </h2>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Student Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Full Name:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Email:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Mobile:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.mobile}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Course:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.course}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;"><strong>Mode:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #d1d5db;">${formData.modeOfClass || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Submitted:</strong></td>
            <td style="padding: 8px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #059669; font-weight: bold; margin: 20px 0;">
        📎 Admission Form and Documents are attached to this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 12px;">
        This is an automated notification from the SkyPro Aviation admission system.
      </p>
    </div>
  `;
  adminEmail.attachment = attachments;

  // Student Confirmation Email
  const studentEmail = new brevo.SendSmtpEmail();
  studentEmail.sender = { name: FROM_NAME, email: FROM_EMAIL };
  studentEmail.to = [{ email: formData.email, name: formData.fullName }];
  studentEmail.subject = "Admission Application Received – SkyPro Aviation";
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
        We are pleased to confirm that your admission application for <strong>${formData.course}</strong> 
        has been successfully received and is now being processed by our admissions team.
      </p>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e;">
          <strong>⏳ Next Steps:</strong><br>
          Our admissions team will review your application and contact you within 2-3 business days 
          regarding the next steps in the admission process.
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Application Details</h3>
        <p style="margin: 5px 0;"><strong>Course:</strong> ${formData.course}</p>
        <p style="margin: 5px 0;"><strong>Mode:</strong> ${formData.modeOfClass || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
        If you have any questions in the meantime, please don't hesitate to reach out to us.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 5px 0;"><strong>Best Regards,</strong></p>
        <p style="margin: 5px 0;"><strong>SkyPro Aviation Admissions Team</strong></p>
        <p style="margin: 5px 0;">📧 ${ADMIN_EMAIL}</p>
        <p style="margin: 5px 0;">📞 +91 8209388460</p>
        <p style="margin: 15px 0 5px 0; font-size: 12px; color: #9ca3af;">
          This is an automated confirmation email. Please do not reply to this message.
        </p>
      </div>
    </div>
  `;

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