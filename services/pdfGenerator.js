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

      const timestamp = Date.now();
      const safeName = (formData.fullName || "Student")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "");

      const pdfPath = path.join(
        uploadDir,
        `${safeName}-${timestamp}-Conversion.pdf`,
      );
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
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
      const title = "CONVERSION AND RECENCY ADMISSION FORM";

      // Title
      doc
        .fontSize(20)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text(title, 50, 100, {
          align: "center",
        });

      // 🔹 Calculate exact text width
      const textWidth = doc.widthOfString(title);
      const pageWidth = doc.page.width;

      // 🔹 Center position for underline
      const startX = (pageWidth - textWidth) / 2;
      const endX = startX + textWidth;

      // Decorative line (exactly till text)
      doc
        .strokeColor("#f4b221")
        .lineWidth(3)
        .moveTo(startX, 130)
        .lineTo(endX, 130)
        .stroke();

      let yPosition = 160;

      // Helper function to add section with consistent styling
      function addSection(title, fields) {
        // Check if we need new page
        if (yPosition > 650) {
          doc.addPage();
          addHeaderFooter();
          yPosition = 100;
        }

        // Section Header with background - CONSISTENT BORDER WIDTH
        doc.lineWidth(2); // Set consistent border width BEFORE drawing
        doc
          .rect(50, yPosition - 5, 495, 25)
          .fillAndStroke("#f0f4f8", "#003366");

        doc
          .fontSize(13)
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

          // Alternating row background
          if (index % 2 === 0) {
            doc.rect(50, yPosition - 3, 495, 22).fill("#fafbfc");
          }

          doc
            .fontSize(10)
            .fillColor("#003366")
            .font("Helvetica-Bold")
            .text(label + ":", 60, yPosition, { width: 170, continued: false });

          doc
            .font("Helvetica")
            .fillColor("#1a1a1a")
            .text(
              value !== undefined && value !== null ? String(value) : "N/A",
              240,
              yPosition,
              { width: 295 }
            );

          yPosition += label === "Total PIC Cross-Country Experience" ? 32 : 22;
        });
        yPosition += 15;
      }

      // Helper function to capitalize exam names properly
      function formatExamName(examKey) {
        const examNames = {
          airNavigation: "Air Navigation",
          meteorology: "Meteorology",
          airRegulations: "Air Regulations",
          technicalGeneral: "Technical General",
          technicalSpecific: "Technical Specific",
          compositePaper: "Composite Paper",
        };
        return examNames[examKey] || examKey;
      }

      // Helper function to check if a file is uploaded
      function isFileUploaded(fieldName) {
        return (
          uploadedFiles &&
          Array.isArray(uploadedFiles) &&
          uploadedFiles.some((file) => file.fieldname === fieldName)
        );
      }

      // 1. Personal Details with Photo and Signature
      // Check if we need new page
      if (yPosition > 650) {
        doc.addPage();
        addHeaderFooter();
        yPosition = 100;
      }

      // Section Header with background
      doc.lineWidth(2);
      doc.rect(50, yPosition - 5, 495, 25).fillAndStroke("#f0f4f8", "#003366");

      doc
        .fontSize(13)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("1. PERSONAL DETAILS", 60, yPosition + 2);

      yPosition += 30;

      // Personal details fields (left side)
      // Define photoAttachmentFields before using it
      const photoAttachmentFields = [];
      if (isFileUploaded("passportPhoto")) {
        photoAttachmentFields.push(["Passport Size Photo", "Attached"]);
      }

      // Personal details fields (left side)
      const personalFields = [
        ["Full Name", formData.fullName],
        ["Age", formData.age],
        ["Gender", formData.gender],
        ["Mobile Number", formData.mobile],
        ["Email Address", formData.email],
        ...photoAttachmentFields, // Spread the attachment fields
      ];

      // Find uploaded photo and signature
      const photoFile = uploadedFiles.find(
        (file) => file.fieldname === "passportPhoto",
      );
      const signatureFile = uploadedFiles.find(
        (file) => file.fieldname === "studentSignature",
      );

      // Draw photo box on right side (even smaller, matching sample)
      const photoBoxX = 430;
      const photoBoxY = yPosition;
      const photoBoxWidth = 90;
      const photoBoxHeight = 100;

      // Photo box border
      doc
        .rect(photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight)
        .stroke("#003366");

      if (photoFile && fs.existsSync(photoFile.path)) {
        try {
          doc.image(photoFile.path, photoBoxX + 5, photoBoxY + 5, {
            width: photoBoxWidth - 10,
            height: photoBoxHeight - 10,
            align: "center",
          });
        } catch (err) {
          console.error("Error adding passport photo:", err);
        }
      }

      // Draw signature box below photo (even smaller)
      const signBoxY = photoBoxY + photoBoxHeight + 6;
      const signBoxHeight = 35;

      doc
        .rect(photoBoxX, signBoxY, photoBoxWidth, signBoxHeight)
        .stroke("#003366");

      if (signatureFile && fs.existsSync(signatureFile.path)) {
        try {
          doc.image(signatureFile.path, photoBoxX + 5, signBoxY + 5, {
            width: photoBoxWidth - 10,
            height: signBoxHeight - 10,
            align: "center",
          });
        } catch (err) {
          console.error("Error adding signature:", err);
        }
      }

      // Print personal details fields on left side (with space for photo/signature on right)
      personalFields.forEach(([label, value], index) => {
        if (yPosition > 680) {
          doc.addPage();
          addHeaderFooter();
          yPosition = 100;
        }

        // Alternating row background (only for left side)
        if (index % 2 === 0) {
          doc.rect(50, yPosition - 3, 370, 22).fill("#fafbfc");
        }

        doc
          .fontSize(10)
          .fillColor("#003366")
          .font("Helvetica-Bold")
          .text(label + ":", 60, yPosition, { width: 170, continued: false });

        doc
          .font("Helvetica")
          .fillColor("#1a1a1a")
          .text(value || "N/A", 240, yPosition, { width: 170 });

        yPosition += 22;
      });

      // Adjust yPosition to account for signature box
      const signatureBoxBottom = signBoxY + signBoxHeight + 28;
      if (yPosition < signatureBoxBottom) {
        yPosition = signatureBoxBottom;
      }

      yPosition += 15;

      // 2. License Details - ✅ FIXED: Now properly shows Foreign License as "Attached"
      const licenseFields = [
        ["Contracting State License", formData.contractingState],
        ["License Validity", formData.licenseValidity],
        ["License Endorsement", formData.licenseEndorsement],
      ];
      
      // ✅ FIX: Add "Attached" status BEFORE calling addSection
      if (isFileUploaded("foreignLicense")) {
        licenseFields.push(["Foreign License", "Attached"]);
      }
      
      addSection("2. LICENSE DETAILS", licenseFields);

      // 3. Total Flying Hours
      const flyingHoursFields = [
        [
          "Total SE Hours",
          `${formData.totalSEHours || 0}:${formData.totalSEMinutes || 0}`,
        ],
      ];

      if (formData.licenseEndorsement === "SE ME IR") {
        flyingHoursFields.push([
          "Total ME Hours",
          `${formData.totalMEHours || 0}:${formData.totalMEMinutes || 0}`,
        ]);
      }

      flyingHoursFields.push(
        ["Total Hours", formData.totalHours || "0:00"],
        ["Aircraft Types Flown", formData.aircraftTypes],
        ["Date of Last Flight", formData.lastFlightDate],
      );

      addSection("3. TOTAL FLYING HOURS", flyingHoursFields);

      // 4. Last 6 Months Flying Experience
      addSection("4. LAST 6 MONTHS OF FLYING EXPERIENCE", [
        ["Last 6 Months Available", formData.last6MonthsAvailable],
      ]);

      // If last 6 months available = Yes, show sortie table
      if (formData.last6MonthsAvailable === "Yes" && formData.sortieRows) {
        // Check space for table
        if (yPosition > 500) {
          doc.addPage();
          addHeaderFooter();
          yPosition = 100;
        }

        // Sortie Details Table Header
        doc
          .fontSize(12)
          .fillColor("#003366")
          .font("Helvetica-Bold")
          .text("Last 6 Months Sortie Wise Details:", 50, yPosition);

        yPosition += 25;

        // Table headers
        const tableTop = yPosition;
        const colWidths = {
          aircraft: 60,
          category: 50,
          typeOfFlight: 65,
          ldgTo: 50,
          hours: 40,
          minutes: 40,
          dateFlown: 80,
          validity: 75,
        };

        let xPos = 50;

        // Draw table header background
        doc.rect(50, tableTop, 495, 20).fillAndStroke("#003366", "#003366");

        doc.fontSize(8).fillColor("#ffffff").font("Helvetica-Bold");

        doc.text("Aircraft", xPos + 2, tableTop + 5, {
          width: colWidths.aircraft,
        });
        xPos += colWidths.aircraft;

        doc.text("Category", xPos + 2, tableTop + 5, {
          width: colWidths.category,
        });
        xPos += colWidths.category;

        doc.text("Type of\nFlight", xPos + 2, tableTop + 2, {
          width: colWidths.typeOfFlight,
        });
        xPos += colWidths.typeOfFlight;

        doc.text("LDG/TO", xPos + 2, tableTop + 5, { width: colWidths.ldgTo });
        xPos += colWidths.ldgTo;

        doc.text("Hours", xPos + 2, tableTop + 5, { width: colWidths.hours });
        xPos += colWidths.hours;

        doc.text("Min", xPos + 2, tableTop + 5, { width: colWidths.minutes });
        xPos += colWidths.minutes;

        doc.text("Date Flown", xPos + 2, tableTop + 5, {
          width: colWidths.dateFlown,
        });
        xPos += colWidths.dateFlown;

        doc.text("Validity", xPos + 2, tableTop + 5, {
          width: colWidths.validity,
        });

        yPosition = tableTop + 22;

        // Table rows
        const sortieRows = formData.sortieRows || [];
        let totalDayPIC = 0,
          totalNightPIC = 0,
          totalIF = 0,
          totalNightPICLDG = 0,
          totalNightPICTO = 0;

        sortieRows.forEach((row, index) => {
          if (yPosition > 720) {
            doc.addPage();
            addHeaderFooter();
            yPosition = 100;
          }

          const rowHeight = 18;
          xPos = 50;

          // Alternating row background
          if (index % 2 === 0) {
            doc.rect(50, yPosition, 495, rowHeight).fill("#f9fafb");
          }

          // Draw borders
          doc.rect(50, yPosition, 495, rowHeight).stroke("#cccccc");

          doc.fontSize(8).fillColor("#1a1a1a").font("Helvetica");

          // Aircraft
          doc.text(row.aircraft || "-", xPos + 2, yPosition + 5, {
            width: colWidths.aircraft - 4,
          });
          doc
            .moveTo(xPos + colWidths.aircraft, yPosition)
            .lineTo(xPos + colWidths.aircraft, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.aircraft;

          // Category
          doc.text(row.category || "-", xPos + 2, yPosition + 5, {
            width: colWidths.category - 4,
          });
          doc
            .moveTo(xPos + colWidths.category, yPosition)
            .lineTo(xPos + colWidths.category, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.category;

          // Type of Flight
          doc.text(row.typeOfFlight || "-", xPos + 2, yPosition + 5, {
            width: colWidths.typeOfFlight - 4,
          });
          doc
            .moveTo(xPos + colWidths.typeOfFlight, yPosition)
            .lineTo(xPos + colWidths.typeOfFlight, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.typeOfFlight;

          // LDG/TO
          const ldgTo =
            row.ldgTo || (row.ldg && row.to ? `${row.ldg}/${row.to}` : "-");
          doc.text(ldgTo, xPos + 2, yPosition + 5, {
            width: colWidths.ldgTo - 4,
          });
          doc
            .moveTo(xPos + colWidths.ldgTo, yPosition)
            .lineTo(xPos + colWidths.ldgTo, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.ldgTo;

          // Hours
          doc.text(row.hours || "0", xPos + 2, yPosition + 5, {
            width: colWidths.hours - 4,
          });
          doc
            .moveTo(xPos + colWidths.hours, yPosition)
            .lineTo(xPos + colWidths.hours, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.hours;

          // Minutes
          doc.text(row.minutes || "0", xPos + 2, yPosition + 5, {
            width: colWidths.minutes - 4,
          });
          doc
            .moveTo(xPos + colWidths.minutes, yPosition)
            .lineTo(xPos + colWidths.minutes, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.minutes;

          // Date Flown
          doc.text(row.dateFlown || "-", xPos + 2, yPosition + 5, {
            width: colWidths.dateFlown - 4,
          });
          doc
            .moveTo(xPos + colWidths.dateFlown, yPosition)
            .lineTo(xPos + colWidths.dateFlown, yPosition + rowHeight)
            .stroke("#cccccc");
          xPos += colWidths.dateFlown;

          // Validity
          const validityColor =
            row.validity === "OUT OF RECENCY" ? "#dc2626" : "#1a1a1a";
          doc
            .fillColor(validityColor)
            .font(
              row.validity === "OUT OF RECENCY"
                ? "Helvetica-Bold"
                : "Helvetica",
            );

          // Handle "OUT OF RECENCY" text - single line with proper case
          if (row.validity === "OUT OF RECENCY") {
            doc.fontSize(7).text("Out of Recency", xPos + 2, yPosition + 5, {
              width: colWidths.validity - 4,
            });
            doc.fontSize(8); // Reset font size
          } else {
            doc.text(row.validity || "-", xPos + 2, yPosition + 5, {
              width: colWidths.validity - 4,
            });
          }

          yPosition += rowHeight;

          // Calculate totals
          const hours = parseInt(row.hours) || 0;
          const minutes = parseInt(row.minutes) || 0;
          const totalTime = hours + minutes / 60;

          if (row.typeOfFlight === "Day PIC") totalDayPIC += totalTime;
          if (row.typeOfFlight === "Night PIC") {
            totalNightPIC += totalTime;
            totalNightPICLDG += parseInt(row.ldg) || 0;
            totalNightPICTO += parseInt(row.to) || 0;
          }
          if (row.typeOfFlight === "IF") totalIF += totalTime;
        });

        yPosition += 10;

        // Summary box
        if (yPosition > 650) {
          doc.addPage();
          addHeaderFooter();
          yPosition = 100;
        }

         doc.rect(50, yPosition, 495, 60).fillAndStroke("#eff6ff", "#2563eb");

        doc
          .fontSize(11)
          .fillColor("#1e40af")
          .font("Helvetica-Bold")
          .text("SUMMARY", 60, yPosition + 10);

        yPosition += 30;

        doc.fontSize(9).fillColor("#1a1a1a").font("Helvetica");

        const dayPICHours = Math.floor(totalDayPIC);
        const dayPICMins = Math.round((totalDayPIC % 1) * 60);
        const nightPICHours = Math.floor(totalNightPIC);
        const nightPICMins = Math.round((totalNightPIC % 1) * 60);
        const ifHours = Math.floor(totalIF);
        const ifMins = Math.round((totalIF % 1) * 60);

        doc.text(
          `Total Day PIC: ${dayPICHours}h ${dayPICMins}m  |  Total Night PIC: ${nightPICHours}h ${nightPICMins}m  |  Total Night LDG: ${totalNightPICLDG} | Total Night TO: ${totalNightPICTO}`,
          60,
          yPosition,
          { width: 475 }
        );

        yPosition += 12;

        doc.text(
          ` Total IF: ${ifHours}h ${ifMins}m`,
          60,
          yPosition,
          { width: 475 }
        );

        yPosition += 55;

        // IR Check
        if (formData.irCheckAircraft) {
          if (yPosition > 650) {
            doc.addPage();
            addHeaderFooter();
            yPosition = 100;
          }

          const irCheckFields = [
            ["Aircraft Flown", formData.irCheckAircraft],
            ["Date", formData.irCheckDate],
            ["Validity", formData.irCheckValidity],
          ];

          // Add "Attached" status if CA-40 IR is uploaded
          if (isFileUploaded("ca40IR")) {
            irCheckFields.push(["CA-40 IR Performa", "Attached"]);
          }

          addSection("IR CHECK", irCheckFields);
        }

        // Signal Reception Test
        if (formData.signalReception === "Yes") {
          if (yPosition > 650) {
            doc.addPage();
            addHeaderFooter();
            yPosition = 100;
          }

          const signalFields = [
            ["Date", formData.signalReceptionDate],
            ["Validity", formData.signalReceptionValidity],
          ];

          // Add "Attached" status if Signal Reception Test is uploaded
          if (isFileUploaded("signalReceptionTest")) {
            signalFields.push(["Signal Reception Test", "Attached"]);
          }

          addSection("SIGNAL RECEPTION TEST", signalFields);
        }
      }

      // 5. Commercial Checkride
      const checkrideFields = [
        ["Checkride Type", formData.commercialCheckride],
      ];

      if (formData.commercialCheckride === "C172") {
        checkrideFields.push(["Date of Checkride", formData.c172CheckrideDate]);
        // Add "Attached" status if C172 Checkride Statement is uploaded
        if (isFileUploaded("c172CheckrideStatement")) {
          checkrideFields.push(["C172 Checkride Statement", "Attached"]);
        }
      } else if (formData.c172PICOption) {
        checkrideFields.push(["C172 PIC Option", formData.c172PICOption]);
        // Add "Attached" status if C172 Flight Review is uploaded
        if (
          formData.c172PICOption === "flightReview" &&
          isFileUploaded("c172FlightReview")
        ) {
          checkrideFields.push(["C172 Flight Review", "Attached"]);
        }
      }

      addSection("5. COMMERCIAL CHECKRIDE", checkrideFields);

      // 6. PIC Experience
      const picFields = [
        ["Total PIC Experience", `${formData.totalPICExperience || 0} hours`],
      ];

      if (isFileUploaded("pic100Statement")) {
        picFields.push(["100 hrs PIC Statement", "Attached"]);
      }

      if (isFileUploaded("crossCountry300Statement")) {
        picFields.push(["300 nm Cross-Country Statement", "Attached"]);
      }

      picFields.push([
        "Total PIC Cross-Country Experience",
        `${formData.totalPICCrossCountry || 0} hours`,
      ]);

      if (isFileUploaded("picCrossCountryStatement")) {
        picFields.push(["Total PIC Cross-Country Statement", "Attached"]);
      }

      picFields.push([
        "Total Instrument Time",
        `${formData.totalInstrumentTime || 0} hours`,
      ]);

      if (isFileUploaded("instrumentTimeStatement")) {
        picFields.push(["Instrument Time Statement", "Attached"]);
      }

      addSection("6. PIC EXPERIENCE", picFields);

      // 7. DGCA Medical & Exams
      const medicalFields = [["Medical Validity", formData.medicalValidity]];

      // Add "Attached" status if Medical Assessment is uploaded
      if (isFileUploaded("medicalAssessment")) {
        medicalFields.push(["DGCA Class-1 Medical Assessment", "Attached"]);
      }

      addSection("7. DGCA CLASS-1 MEDICAL ASSESSMENT", medicalFields);

      // DGCA Exams Table
      if (formData.dgcaExamDetails && formData.dgcaExamDetails.length > 0) {
        if (yPosition > 550) {
          doc.addPage();
          addHeaderFooter();
          yPosition = 100;
        }

        doc
          .fontSize(12)
          .fillColor("#003366")
          .font("Helvetica-Bold")
          .text("DGCA Exams Cleared:", 50, yPosition);

        yPosition += 25;

        // Table headers
        const examTableTop = yPosition;
        const examColWidths = {
          exam: 190, // Even more space
          resultDate: 135,
          validity: 100,
          attached: 70,
        };

        let examXPos = 50;

        // Draw table header background
        doc.rect(50, examTableTop, 495, 20).fillAndStroke("#003366", "#003366");

        doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold");

        doc.text("Exam Name", examXPos + 2, examTableTop + 5, {
          width: examColWidths.exam,
        });
        examXPos += examColWidths.exam;

        doc.text("Result Date", examXPos + 2, examTableTop + 5, {
          width: examColWidths.resultDate,
        });
        examXPos += examColWidths.resultDate;

        doc.text("Validity", examXPos + 2, examTableTop + 5, {
          width: examColWidths.validity,
        });
        examXPos += examColWidths.validity;

        doc.text("Proof", examXPos + 2, examTableTop + 5, {
          width: examColWidths.attached,
        });

        yPosition = examTableTop + 22;

        // Table rows
        formData.dgcaExamDetails.forEach((exam, index) => {
          if (yPosition > 720) {
            doc.addPage();
            addHeaderFooter();
            yPosition = 100;
          }

          const rowHeight = 18;
          examXPos = 50;

          // Alternating row background
          if (index % 2 === 0) {
            doc.rect(50, yPosition, 495, rowHeight).fill("#f9fafb");
          }

          // Draw borders
          doc.rect(50, yPosition, 495, rowHeight).stroke("#cccccc");

          doc.fontSize(8).fillColor("#1a1a1a").font("Helvetica");

          // Exam name - CAPITALIZED
          const examName = formatExamName(exam.exam);
          doc.text(examName, examXPos + 2, yPosition + 5, {
            width: examColWidths.exam - 4,
          });
          doc
            .moveTo(examXPos + examColWidths.exam, yPosition)
            .lineTo(examXPos + examColWidths.exam, yPosition + rowHeight)
            .stroke("#cccccc");
          examXPos += examColWidths.exam;

          // Result Date
          doc.text(exam.resultDate || "-", examXPos + 2, yPosition + 5, {
            width: examColWidths.resultDate - 4,
          });
          doc
            .moveTo(examXPos + examColWidths.resultDate, yPosition)
            .lineTo(examXPos + examColWidths.resultDate, yPosition + rowHeight)
            .stroke("#cccccc");
          examXPos += examColWidths.resultDate;

          // Validity
          let validityColor = "#1a1a1a";
          let validityFont = "Helvetica";
          let validityText = exam.validity || "-";

          if (exam.validity === "Expired") {
            validityColor = "#dc2626";
            validityFont = "Helvetica-Bold";
          } else if (exam.validity === "SPL Exam Required") {
            validityColor = "#f59e0b";
            validityFont = "Helvetica-Bold";
          }

          doc.fillColor(validityColor).font(validityFont);

          // Adjust font size for longer text
          if (exam.validity === "SPL Exam Required") {
            doc.fontSize(7).text(validityText, examXPos + 2, yPosition + 5, {
              width: examColWidths.validity - 4,
            });
            doc.fontSize(8); // Reset font size
          } else {
            doc.text(validityText, examXPos + 2, yPosition + 5, {
              width: examColWidths.validity - 4,
            });
          }

          doc
            .moveTo(examXPos + examColWidths.validity, yPosition)
            .lineTo(examXPos + examColWidths.validity, yPosition + rowHeight)
            .stroke("#cccccc");
          examXPos += examColWidths.validity;

          // Attached status
          const fieldName = `dgcaExam_${exam.exam}`;
          const attachedStatus = isFileUploaded(fieldName) ? "Attached" : "-";
          doc
            .fillColor("#1a1a1a")
            .font("Helvetica")
            .text(attachedStatus, examXPos + 2, yPosition + 5, {
              width: examColWidths.attached - 4,
            });

          yPosition += rowHeight;
        });

        yPosition += 15;
      }

      // 8. Additional Documents - ✅ FIXED: Now shows all files as "Attached"
      const additionalDocsFields = [];

      // Add all fields with their attachment status
      if (isFileUploaded("rtrCertificate")) {
        additionalDocsFields.push(["RTR Certificate", "Attached"]);
      }
      if (formData.rtrValidity) {
        additionalDocsFields.push(["RTR Validity", formData.rtrValidity]);
      }
      if (isFileUploaded("frtolCertificate")) {
        additionalDocsFields.push(["FRTOL Certificate", "Attached"]);
      }
      if (formData.policeVerificationDate) {
        additionalDocsFields.push([
          "Police Verification Date",
          formData.policeVerificationDate,
        ]);
      }
      if (isFileUploaded("policeVerification")) {
        additionalDocsFields.push(["Police Verification", "Attached"]);
      }
      if (isFileUploaded("marksheet10")) {
        additionalDocsFields.push(["10th Marksheet", "Attached"]);
      }
      if (isFileUploaded("marksheet12")) {
        additionalDocsFields.push(["12th Marksheet", "Attached"]);
      }
      if (formData.nameChangeProcessed) {
        additionalDocsFields.push([
          "Name Change Processed",
          formData.nameChangeProcessed,
        ]);
      }
      if (
        formData.nameChangeProcessed === "Yes" &&
        isFileUploaded("nameChangeCertificate")
      ) {
        additionalDocsFields.push(["Name Change Certificate", "Attached"]);
      }

      // Only add the section if there are fields to display
      if (additionalDocsFields.length > 0) {
        addSection("8. ADDITIONAL DOCUMENTS", additionalDocsFields);
      }

      // 9. How Did You Hear About Us
      if (formData.hearAboutUs) {
        addSection("9. HOW DID YOU HEAR ABOUT SKYPRO AVIATION?", [
          ["Source", formData.hearAboutUs],
        ]);
      }

      // Declaration Section
      if (yPosition > 600) {
        doc.addPage();
        addHeaderFooter();
        yPosition = 100;
      }

      yPosition += 10;

      //Self Declaration box
      doc.rect(50, yPosition, 495, 170).fillAndStroke("#fffbf0", "#f4b221");

      yPosition += 10;

      doc
        .fontSize(12)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("SELF DECLARATION", 60, yPosition);

      yPosition += 20;
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#1a1a1a")
        .text(
          `I understand and acknowledge that SkyPro Aviation's partner Flying Training Organisations (FTOs) are DGCA-approved and operate in accordance with DGCA training and safety standards. I further understand that flying training involves inherent risks. Having fully understood these risks, I voluntarily undertake sole responsibility for my safety and for any incident or accident that may occur during flight training for license conversion or recency, and I agree that SkyPro Aviation shall not be held responsible or liable in any manner.
          I further understand and agree that if I fail to perform satisfactorily during any checks, fail to obtain solo release in the first attempt, or if there is any delay arising due to my performance, skill level, preparedness, or competency, then the 7-day commitment and 15-day completion guarantee provided by SkyPro Aviation shall no longer be applicable. Any additional training, time, or costs resulting from such performance-related delays shall be my sole responsibility."`,
          60,
          yPosition,
          { width: 475, align: "justify" },
        );

      yPosition += 170;

      // Declaration box
      doc.rect(50, yPosition, 495, 75).fillAndStroke("#fffbf0", "#f4b221");

      yPosition += 10;

      doc
        .fontSize(12)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("DECLARATION", 60, yPosition);

      yPosition += 20;
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#1a1a1a")
        .text(
          "I confirm that all the information provided above is true and correct to the best of my knowledge. I understand that incomplete or incorrect information may delay my admission and training process.",
          60,
          yPosition,
          { width: 475, align: "justify" },
        );

      yPosition += 70;

      // OFFICE USE ONLY Section
      if (yPosition > 600) {
        doc.addPage();
        addHeaderFooter();
        yPosition = 100;
      }

      yPosition += 40;

      // Signature Section
      doc.fontSize(10).fillColor("#003366").font("Helvetica-Bold");

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
      doc
        .fontSize(8)
        .fillColor("#666666")
        .font("Helvetica")
        .text(
          "This is a computer-generated document. For any queries, please contact the admission office.",
          50,
          yPosition,
          { width: 495, align: "center" },
        );

      // ========================================
      // ADD UPLOADED IMAGE DOCUMENTS (A4 SIZE, NO HEADER/FOOTER)
      // Excluding passport photo and signatures
      // ========================================

      const imageFiles = uploadedFiles.filter(
        (file) =>
          file.mimetype &&
          file.mimetype.startsWith("image/") &&
          file.fieldname !== "passportPhoto" &&
          file.fieldname !== "studentSignature" &&
          file.fieldname !== "finalSignature",
      );

      if (imageFiles && imageFiles.length > 0) {
        imageFiles.forEach((file) => {
          if (!fs.existsSync(file.path)) return;

          try {
            // Add new A4 page without header/footer
            doc.addPage({
              size: "A4",
              margin: 0,
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
              height: finalHeight,
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
          const pdfFiles = uploadedFiles.filter(
            (file) =>
              file.mimetype === "application/pdf" &&
              file.fieldname !== "passportPhoto" &&
              file.fieldname !== "studentSignature" &&
              file.fieldname !== "finalSignature",
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
                  uploadedPdfDoc.getPageIndices(),
                );

                // Add copied pages to main document
                copiedPages.forEach((page) => mainPdfDoc.addPage(page));

                console.log(`✅ Merged PDF: ${pdfFile.originalname}`);
              } catch (err) {
                console.error(
                  `⚠️ Error merging PDF ${pdfFile.originalname}:`,
                  err.message,
                );
              }
            }

            // Save the merged PDF
            const mergedPdfBytes = await mainPdfDoc.save();
            fs.writeFileSync(pdfPath, mergedPdfBytes);
            console.log(
              `✅ Final PDF saved with ${mainPdfDoc.getPageCount()} pages`,
            );
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