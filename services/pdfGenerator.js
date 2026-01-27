// const fs = require("fs");
// const path = require("path");
// const PDFDocument = require("pdfkit");

// function generatePDF(formData, uploadedFiles = []) {
//   return new Promise((resolve, reject) => {
//     try {
//       const uploadDir = path.join(__dirname, "../uploads");
//       if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir, { recursive: true });
//       }

//       const pdfPath = path.join(uploadDir, `admission-${Date.now()}.pdf`);
//       const doc = new PDFDocument({ 
//         size: "A4", 
//         margin: 50,
//         bufferPages: true 
//       });
//       const stream = fs.createWriteStream(pdfPath);

//       doc.pipe(stream);

//       // Paths for header and footer images
//       const headerPath = path.join(__dirname, "../assets/header.png");
//       const footerPath = path.join(__dirname, "../assets/footer.png");

//       let pageNumber = 0;

//       // Function to add header and footer
//       function addHeaderFooter() {
//         pageNumber++;
        
//         // Header
//         if (fs.existsSync(headerPath)) {
//           doc.image(headerPath, 0, 0, { width: 595.28, height: 70 });
//         }
        
//         // Footer
//         if (fs.existsSync(footerPath)) {
//           doc.image(footerPath, 0, 792, { width: 595.28, height: 40 });
//         }
//       }

//       // Add first page header/footer
//       addHeaderFooter();

//       // Title Section
//       doc.fontSize(22)
//          .fillColor("#003366")
//          .font("Helvetica-Bold")
//          .text("STUDENT ADMISSION FORM", 50, 100, { align: "center" });
      
//       // Decorative line under title
//       doc.strokeColor("#f4b221")
//          .lineWidth(3)
//          .moveTo(150, 130)
//          .lineTo(445, 130)
//          .stroke();

//       let yPosition = 160;

//       // Helper function to add section with improved styling
//       function addSection(title, fields) {
//         // Check if we need new page - more conservative check
//         if (yPosition > 650) {
//           doc.addPage();
//           addHeaderFooter();
//           yPosition = 100;
//         }

//         // Section Header with background
//         doc.rect(50, yPosition - 5, 495, 25)
//            .fillAndStroke("#f0f4f8", "#003366");
        
//         doc.fontSize(13)
//            .fillColor("#003366")
//            .font("Helvetica-Bold")
//            .text(title, 60, yPosition + 2);
        
//         yPosition += 30;

//         // Section Fields
//         fields.forEach(([label, value], index) => {
//           if (yPosition > 680) {
//             doc.addPage();
//             addHeaderFooter();
//             yPosition = 100;
//           }

//           // Alternating row background for better readability
//           if (index % 2 === 0) {
//             doc.rect(50, yPosition - 3, 495, 22)
//                .fill("#fafbfc");
//           }

//           doc.fontSize(10)
//              .fillColor("#003366")
//              .font("Helvetica-Bold")
//              .text(label + ":", 60, yPosition, { width: 170, continued: false });
          
//           doc.font("Helvetica")
//              .fillColor("#1a1a1a")
//              .text(value || "N/A", 240, yPosition, { width: 295 });
          
//           yPosition += 22;
//         });

//         yPosition += 15;
//       }

//       // 1. Student Details
//       addSection("1. STUDENT DETAILS", [
//         ["Full Name", formData.fullName],
//         ["Date of Birth", formData.dob],
//         ["Gender", formData.gender],
//         ["Mobile Number", formData.mobile],
//         ["Email Address", formData.email],
//         ["Permanent Address", formData.permanentAddress],
//         ["Current Address", formData.currentAddress],
//         ["DGCA Computer Number", formData.dgca],
//         ["eGCA Number", formData.egca],
//         ["Medical Status", formData.medical]
//       ]);

//       // 2. Parent/Guardian Details
//       addSection("2. PARENT / GUARDIAN DETAILS", [
//         ["Parent/Guardian Name", formData.parentName],
//         ["Relationship", formData.relationship],
//         ["Mobile Number", formData.parentMobile],
//         ["Occupation", formData.occupation]
//       ]);

//       // 3. Academic Details
//       addSection("3. ACADEMIC DETAILS", [
//         ["School/College Name", formData.school],
//         ["Current Class/Year", formData.classYear],
//         ["Board/University", formData.board]
//       ]);

//       // 4. Course Details
//       addSection("4. COURSE DETAILS", [
//         ["Course Name", formData.course],
//         ["Mode of Class", formData.modeOfClass]
//       ]);

//       // 5. Fee Structure - Only show what user filled
//       const feeFields = [
//         ["Fees Paid", formData.feesPaid]
//       ];
      
//       // Only show payment mode and installment if fees are paid
//       if (formData.feesPaid === "Yes") {
//         feeFields.push(
//           ["Mode of Payment", formData.paymentMode],
//           ["Installment", formData.installment]
//         );
//       }
      
//       addSection("5. FEE STRUCTURE", feeFields);

//       // 6. Documents Submitted (including passport photo status, but not the image)
//       const documentFields = [
//         ["Address Proof", "addressProof"],
//         ["Passport Size Photo", "photo"],
//         ["10th Marksheet", "marksheet10"],
//         ["12th Marksheet", "marksheet12"],
//         ["Aadhaar Card", "aadhar"]
//       ];

//       const documentStatus = documentFields.map(([label, fieldName]) => {
//         const isUploaded = uploadedFiles && Array.isArray(uploadedFiles) && 
//           uploadedFiles.some(file => file.fieldname === fieldName);
        
//         return [label, isUploaded ? "Attached" : "Not Attached"];
//       });

//       addSection("6. DOCUMENTS SUBMITTED", documentStatus);

//       // Declaration Section - Reduced height
//       if (yPosition > 600) {
//         doc.addPage();
//         addHeaderFooter();
//         yPosition = 100;
//       }

//       yPosition += 10;
      
//       // Declaration box - reduced height from 100 to 75
//       doc.rect(50, yPosition, 495, 75)
//          .fillAndStroke("#fffbf0", "#f4b221");
      
//       yPosition += 10;
      
//       doc.fontSize(12)
//          .fillColor("#003366")
//          .font("Helvetica-Bold")
//          .text("DECLARATION", 60, yPosition);
      
//       yPosition += 20;
//       doc.fontSize(10)
//          .font("Helvetica")
//          .fillColor("#1a1a1a")
//          .text(
//            "I hereby declare that all the information provided above is true and correct to the best of my knowledge. I understand that any false information may result in the cancellation of my admission.",
//            60,
//            yPosition,
//            { width: 475, align: "justify" }
//          );

//       yPosition += 70;

//       // OFFICE USE ONLY Section
//       if (yPosition > 600) {
//         doc.addPage();
//         addHeaderFooter();
//         yPosition = 100;
//       }

//       // Office Use Only Header
//       doc.rect(50, yPosition - 5, 495, 25)
//          .fillAndStroke("#f0f4f8", "#003366");
      
//       doc.fontSize(13)
//          .fillColor("#003366")
//          .font("Helvetica-Bold")
//          .text("OFFICE USE ONLY", 60, yPosition + 2);
      
//       yPosition += 35;

//       // Fee Structure boxes for manual filling
//       doc.fontSize(10)
//          .fillColor("#003366")
//          .font("Helvetica-Bold");

//       // Row 1: Gross Course Fee and Registration Fee
//       doc.text("Gross Course Fee:", 60, yPosition);
//       doc.rect(180, yPosition - 3, 150, 20).stroke("#cccccc");
      
//       doc.text("Registration Fee:", 345, yPosition);
//       doc.rect(465, yPosition - 3, 80, 20).stroke("#cccccc");
      
//       yPosition += 30;

//       // Row 2: Discount and Net Fee Payable
//       doc.text("Discount:", 60, yPosition);
//       doc.rect(180, yPosition - 3, 150, 20).stroke("#cccccc");
      
//       doc.text("Net Fee Payable:", 345, yPosition);
//       doc.rect(465, yPosition - 3, 80, 20).stroke("#cccccc");
      
//       yPosition += 40;

//       // Signature Section
//       doc.fontSize(10)
//          .fillColor("#003366")
//          .font("Helvetica-Bold");
      
//       // Student signature box
//       doc.text("Student Sign:", 60, yPosition);
//       doc.rect(60, yPosition + 15, 150, 35).stroke("#cccccc");
      
//       // Date box
//       doc.text("Date:", 230, yPosition);
//       doc.rect(230, yPosition + 15, 150, 35).stroke("#cccccc");
      
//       // Administrative signature box
//       doc.text("Administrative Sign:", 400, yPosition);
//       doc.rect(400, yPosition + 15, 145, 35).stroke("#cccccc");

//       // Footer note
//       yPosition += 65;
//       doc.fontSize(8)
//          .fillColor("#666666")
//          .font("Helvetica-Oblique")
//          .text(
//            "This is a computer-generated document. For any queries, please contact the admission office.",
//            50,
//            yPosition,
//            { width: 495, align: "center" }
//          );

//       // ========================================
//       // NOW ADD UPLOADED DOCUMENTS (A4 SIZE, NO HEADER/FOOTER)
//       // Excluding passport photo
//       // ========================================
      
//       const imageFiles = uploadedFiles.filter(file => 
//         file.mimetype && 
//         file.mimetype.startsWith("image/") && 
//         file.fieldname !== "photo" // Exclude passport photo from PDF images
//       );

//       if (imageFiles && imageFiles.length > 0) {
//         imageFiles.forEach(file => {
//           if (!fs.existsSync(file.path)) return;

//           try {
//             // Add new A4 page without header/footer
//             doc.addPage({
//               size: "A4",
//               margin: 0
//             });

//             const img = doc.openImage(file.path);
            
//             // A4 dimensions in points
//             const pageWidth = 595.28;
//             const pageHeight = 841.89;
            
//             // Calculate scaling to fit A4 while maintaining aspect ratio
//             const imgAspect = img.width / img.height;
//             const pageAspect = pageWidth / pageHeight;
            
//             let finalWidth, finalHeight, xPos, yPos;
            
//             if (imgAspect > pageAspect) {
//               // Image is wider - fit to width
//               finalWidth = pageWidth;
//               finalHeight = pageWidth / imgAspect;
//               xPos = 0;
//               yPos = (pageHeight - finalHeight) / 2;
//             } else {
//               // Image is taller - fit to height
//               finalHeight = pageHeight;
//               finalWidth = pageHeight * imgAspect;
//               xPos = (pageWidth - finalWidth) / 2;
//               yPos = 0;
//             }
            
//             doc.image(file.path, xPos, yPos, {
//               width: finalWidth,
//               height: finalHeight
//             });
            
//           } catch (err) {
//             console.error(`Error adding image ${file.originalname}:`, err);
//           }
//         });
//       }

//       doc.end();

//       stream.on("finish", () => resolve(pdfPath));
//       stream.on("error", reject);

//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// module.exports = generatePDF;
















































const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PDFDocument: PDFLib } = require("pdf-lib");

async function generatePDF(formData, uploadedFiles = []) {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const pdfPath = path.join(uploadDir, `admission-${Date.now()}.pdf`);
      const doc = new PDFDocument({ 
        size: "A4", 
        margin: 50,
        bufferPages: true 
      });
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // Paths for header and footer images
      const headerPath = path.join(__dirname, "../assets/header.png");
      const footerPath = path.join(__dirname, "../assets/footer.png");

      let pageNumber = 0;

      // Function to add header and footer
      function addHeaderFooter() {
        pageNumber++;
        
        // Header
        if (fs.existsSync(headerPath)) {
          doc.image(headerPath, 0, 0, { width: 595.28, height: 70 });
        }
        
        // Footer
        if (fs.existsSync(footerPath)) {
          doc.image(footerPath, 0, 792, { width: 595.28, height: 40 });
        }
      }

      // Add first page header/footer
      addHeaderFooter();

      // Title Section
      doc.fontSize(22)
         .fillColor("#003366")
         .font("Helvetica-Bold")
         .text("STUDENT ADMISSION FORM", 50, 100, { align: "center" });
      
      // Decorative line under title
      doc.strokeColor("#f4b221")
         .lineWidth(3)
         .moveTo(150, 130)
         .lineTo(445, 130)
         .stroke();

      let yPosition = 160;

      // Helper function to add section with improved styling
      function addSection(title, fields) {
        // Check if we need new page - more conservative check
        if (yPosition > 650) {
          doc.addPage();
          addHeaderFooter();
          yPosition = 100;
        }

        // Section Header with background
        doc.rect(50, yPosition - 5, 495, 25)
           .fillAndStroke("#f0f4f8", "#003366");
        
        doc.fontSize(13)
           .fillColor("#003366")
           .font("Helvetica-Bold")
           .text(title, 60, yPosition + 2);
        
        yPosition += 30;

        // Section Fields
        fields.forEach(([label, value], index) => {
          if (yPosition > 680) {
            doc.addPage();
            addHeaderFooter();
            yPosition = 100;
          }

          // Alternating row background for better readability
          if (index % 2 === 0) {
            doc.rect(50, yPosition - 3, 495, 22)
               .fill("#fafbfc");
          }

          doc.fontSize(10)
             .fillColor("#003366")
             .font("Helvetica-Bold")
             .text(label + ":", 60, yPosition, { width: 170, continued: false });
          
          doc.font("Helvetica")
             .fillColor("#1a1a1a")
             .text(value || "N/A", 240, yPosition, { width: 295 });
          
          yPosition += 22;
        });

        yPosition += 15;
      }

      // 1. Student Details
      addSection("1. STUDENT DETAILS", [
        ["Full Name", formData.fullName],
        ["Date of Birth", formData.dob],
        ["Gender", formData.gender],
        ["Mobile Number", formData.mobile],
        ["Email Address", formData.email],
        ["Permanent Address", formData.permanentAddress],
        ["Current Address", formData.currentAddress],
        ["DGCA Computer Number", formData.dgca],
        ["eGCA Number", formData.egca],
        ["Medical Status", formData.medical]
      ]);

      // 2. Parent/Guardian Details
      addSection("2. PARENT / GUARDIAN DETAILS", [
        ["Parent/Guardian Name", formData.parentName],
        ["Relationship", formData.relationship],
        ["Mobile Number", formData.parentMobile],
        ["Occupation", formData.occupation]
      ]);

      // 3. Academic Details
      addSection("3. ACADEMIC DETAILS", [
        ["School/College Name", formData.school],
        ["Current Class/Year", formData.classYear],
        ["Board/University", formData.board]
      ]);

      // 4. Course Details
      addSection("4. COURSE DETAILS", [
        ["Course Name", formData.course],
        ["Mode of Class", formData.modeOfClass]
      ]);

      // 5. Fee Structure - Only show what user filled
      const feeFields = [
        ["Fees Paid", formData.feesPaid]
      ];
      
      // Only show payment mode and installment if fees are paid
      if (formData.feesPaid === "Yes") {
        feeFields.push(
          ["Mode of Payment", formData.paymentMode],
          ["Installment", formData.installment]
        );
      }
      
      addSection("5. FEE STRUCTURE", feeFields);

      // 6. Documents Submitted (including passport photo status, but not the image)
      const documentFields = [
        ["Address Proof", "addressProof"],
        ["Passport Size Photo", "photo"],
        ["10th Marksheet", "marksheet10"],
        ["12th Marksheet", "marksheet12"],
        ["Aadhaar Card", "aadhar"]
      ];

      const documentStatus = documentFields.map(([label, fieldName]) => {
        const isUploaded = uploadedFiles && Array.isArray(uploadedFiles) && 
          uploadedFiles.some(file => file.fieldname === fieldName);
        
        return [label, isUploaded ? "Attached" : "Not Attached"];
      });

      addSection("6. DOCUMENTS SUBMITTED", documentStatus);

      // Declaration Section - Reduced height
      if (yPosition > 600) {
        doc.addPage();
        addHeaderFooter();
        yPosition = 100;
      }

      yPosition += 10;
      
      // Declaration box - reduced height from 100 to 75
      doc.rect(50, yPosition, 495, 75)
         .fillAndStroke("#fffbf0", "#f4b221");
      
      yPosition += 10;
      
      doc.fontSize(12)
         .fillColor("#003366")
         .font("Helvetica-Bold")
         .text("DECLARATION", 60, yPosition);
      
      yPosition += 20;
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor("#1a1a1a")
         .text(
           "I hereby declare that all the information provided above is true and correct to the best of my knowledge. I understand that any false information may result in the cancellation of my admission.",
           60,
           yPosition,
           { width: 475, align: "justify" }
         );

      yPosition += 70;

      // OFFICE USE ONLY Section
      if (yPosition > 600) {
        doc.addPage();
        addHeaderFooter();
        yPosition = 100;
      }

      // Office Use Only Header
      doc.rect(50, yPosition - 5, 495, 25)
         .fillAndStroke("#f0f4f8", "#003366");
      
      doc.fontSize(13)
         .fillColor("#003366")
         .font("Helvetica-Bold")
         .text("OFFICE USE ONLY", 60, yPosition + 2);
      
      yPosition += 35;

      // Fee Structure boxes for manual filling
      doc.fontSize(10)
         .fillColor("#003366")
         .font("Helvetica-Bold");

      // Row 1: Gross Course Fee and Registration Fee
      doc.text("Gross Course Fee:", 60, yPosition);
      doc.rect(180, yPosition - 3, 150, 20).stroke("#cccccc");
      
      doc.text("Registration Fee:", 345, yPosition);
      doc.rect(465, yPosition - 3, 80, 20).stroke("#cccccc");
      
      yPosition += 30;

      // Row 2: Discount and Net Fee Payable
      doc.text("Discount:", 60, yPosition);
      doc.rect(180, yPosition - 3, 150, 20).stroke("#cccccc");
      
      doc.text("Net Fee Payable:", 345, yPosition);
      doc.rect(465, yPosition - 3, 80, 20).stroke("#cccccc");
      
      yPosition += 40;

      // Signature Section
      doc.fontSize(10)
         .fillColor("#003366")
         .font("Helvetica-Bold");
      
      // Student signature box
      doc.text("Student Sign:", 60, yPosition);
      doc.rect(60, yPosition + 15, 150, 35).stroke("#cccccc");
      
      // Date box
      doc.text("Date:", 230, yPosition);
      doc.rect(230, yPosition + 15, 150, 35).stroke("#cccccc");
      
      // Administrative signature box
      doc.text("Administrative Sign:", 400, yPosition);
      doc.rect(400, yPosition + 15, 145, 35).stroke("#cccccc");

      // Footer note
      yPosition += 65;
      doc.fontSize(8)
         .fillColor("#666666")
         .font("Helvetica-Oblique")
         .text(
           "This is a computer-generated document. For any queries, please contact the admission office.",
           50,
           yPosition,
           { width: 495, align: "center" }
         );

      // ========================================
      // ADD UPLOADED IMAGE DOCUMENTS (A4 SIZE, NO HEADER/FOOTER)
      // Excluding passport photo
      // ========================================
      
      const imageFiles = uploadedFiles.filter(file => 
        file.mimetype && 
        file.mimetype.startsWith("image/") && 
        file.fieldname !== "photo" // Exclude passport photo from PDF images
      );

      if (imageFiles && imageFiles.length > 0) {
        imageFiles.forEach(file => {
          if (!fs.existsSync(file.path)) return;

          try {
            // Add new A4 page without header/footer
            doc.addPage({
              size: "A4",
              margin: 0
            });

            const img = doc.openImage(file.path);
            
            // A4 dimensions in points
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            
            // Calculate scaling to fit A4 while maintaining aspect ratio
            const imgAspect = img.width / img.height;
            const pageAspect = pageWidth / pageHeight;
            
            let finalWidth, finalHeight, xPos, yPos;
            
            if (imgAspect > pageAspect) {
              // Image is wider - fit to width
              finalWidth = pageWidth;
              finalHeight = pageWidth / imgAspect;
              xPos = 0;
              yPos = (pageHeight - finalHeight) / 2;
            } else {
              // Image is taller - fit to height
              finalHeight = pageHeight;
              finalWidth = pageHeight * imgAspect;
              xPos = (pageWidth - finalWidth) / 2;
              yPos = 0;
            }
            
            doc.image(file.path, xPos, yPos, {
              width: finalWidth,
              height: finalHeight
            });
            
          } catch (err) {
            console.error(`Error adding image ${file.originalname}:`, err);
          }
        });
      }

      // Finalize the main PDF
      doc.end();

      // Wait for the stream to finish before merging PDFs
      stream.on("finish", async () => {
        try {
          // ========================================
          // MERGE UPLOADED PDF DOCUMENTS
          // ========================================
          const pdfFiles = uploadedFiles.filter(file => 
            file.mimetype === "application/pdf" &&
            file.fieldname !== "photo" // Exclude photo field if it's PDF
          );

          if (pdfFiles && pdfFiles.length > 0) {
            console.log(`📎 Merging ${pdfFiles.length} PDF document(s)...`);
            
            // Load the main generated PDF
            const mainPdfBytes = fs.readFileSync(pdfPath);
            const mainPdfDoc = await PDFLib.load(mainPdfBytes);

            // Merge each uploaded PDF
            for (const pdfFile of pdfFiles) {
              if (!fs.existsSync(pdfFile.path)) continue;

              try {
                const uploadedPdfBytes = fs.readFileSync(pdfFile.path);
                const uploadedPdfDoc = await PDFLib.load(uploadedPdfBytes);
                
                // Copy all pages from uploaded PDF
                const copiedPages = await mainPdfDoc.copyPages(
                  uploadedPdfDoc, 
                  uploadedPdfDoc.getPageIndices()
                );

                // Add copied pages to main document
                copiedPages.forEach(page => mainPdfDoc.addPage(page));
                
                console.log(`✅ Merged PDF: ${pdfFile.originalname}`);
              } catch (err) {
                console.error(`⚠️ Error merging PDF ${pdfFile.originalname}:`, err.message);
              }
            }

            // Save the merged PDF
            const mergedPdfBytes = await mainPdfDoc.save();
            fs.writeFileSync(pdfPath, mergedPdfBytes);
            console.log(`✅ Final PDF saved with ${mainPdfDoc.getPageCount()} pages`);
          }

          resolve(pdfPath);
        } catch (err) {
          console.error("Error during PDF merge:", err);
          reject(err);
        }
      });

      stream.on("error", reject);

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generatePDF;