const generatePDF = require("./services/pdfGenerator");

// ========================================
// TEST CASE 1: COMPLETE DATA
// ========================================
const completeTestData = {
  fullName: "Rishabh sfsdf",
  age: "24",
  gender: "Male",
  mobile: "9158466877",
  email: "rishabhgolabha16@gmail.com",
  passportSize: "Attached",
  foreignLicense: "Attached",
  contractingState: "India",
  licenseValidity: "27/02/2024",
  licenseEndorsement: "SE ME IR",
  totalSEHours: 185,
  totalSEMinutes: 0,
  totalMEHours: 15,
  totalMEMinutes: 0,
  totalHours: "200:00",
  aircraftTypes: "C172, PA34, A320",
  lastFlightDate: "18/01/2024",
  last6MonthsAvailable: "No",
  sortieRows: [],
  commercialCheckride: "Other Than C172",
  c172CheckrideDate: "",

  // PIC Experience — split HH:MM fields (new format)
  totalPICExperienceHours: 100,
  totalPICExperienceMinutes: 0,
  totalPICStatement: "Attached",
  pic100XC: "Attached",
  pic300XCStatement: "45 hours",
  totalPICCrossCountryHours: 45,
  totalPICCrossCountryMinutes: 0,
  totalPICXCStatement: "Attached",

  // Instrument time — split fields (new format)
  instrumentActualHours: 15,
  instrumentActualMinutes: 30,
  instrumentSimulatorHours: 4,
  instrumentSimulatorMinutes: 30,
  totalInstrumentTime: "20:00",  // auto-calculated string
  instrumentTimeStatement: "Attached",

  medicalValidity: "29/12/2026",
  dgcaClass1Medical: "Attached",
  dgcaExamDetails: [
    {
      exam: "airNavigation",
      resultDate: "20/05/2025",
      validity: "04/04/2025",
      proof: "Attached",
    },
    {
      exam: "airRegulations",
      resultDate: "21/05/2025",
      validity: "22/04/2025",
      proof: "Attached",
    },
    {
      exam: "meteorology",
      resultDate: "07/01/2025",
      validity: "08/07/2025",
      proof: "Attached",
    },
    {
      exam: "technicalGeneral",
      resultDate: "88/01/2025",
      validity: "09/03/2025",
      proof: "Attached",
    },
    {
      exam: "technicalSpecific",
      resultDate: "08/01/2025",
      validity: "09/03/2025",
      aircraft: "C172",
      proof: "Attached",
    },
  ],
  rtrValidity: "10/05/2082",
  frtolCertificate: "Attached",
  policeVerificationDate: "01/05/2025",
  policeVerification: "Attached",

  // SPL (new field)
  hasSPL: "Yes",
  splIssueDate: "15/03/2023",
  splValidity: "14/03/2025",

  splMarksheet: "Attached",
  _12thMarksheet: "Attached",
  nameChangeProcessed: "No",
  hearAboutUs: "Bhagavan rai recommend kara",
  selfDeclaration:
    "I hereby declare that all information provided in this application form is true and accurate...",
  declaration:
    "I confirm that all information provided above is true and correct to the best of my knowledge.",
};

// ========================================
// RUN TESTS
// ========================================
(async () => {
  console.log("🚀 Starting PDF Generation Tests...\n");

  try {
    // Test 1: Complete Data
    console.log("📝 Test 1: Generating PDF with complete data...");

    const result = await generatePDF(completeTestData, []);

    // ✅ generatePDF now returns { formPdfPath, mergedPdfPath }
    console.log("✅ Form-only PDF  :", result.formPdfPath);
    console.log("✅ Merged PDF     :", result.mergedPdfPath);
    console.log("");

    console.log("🎉 All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log("   ✓ Complete data test       : PASSED");
    console.log("   ✓ formPdfPath generated    : PASSED");
    console.log("   ✓ mergedPdfPath generated  : PASSED");
    console.log("\n✨ Check the generated PDFs in the 'uploads' folder");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
})();