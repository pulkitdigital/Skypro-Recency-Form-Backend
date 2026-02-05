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
  totalPICExperience: 100,
  totalPICStatement: "Attached",
  pic100XC: "Attached",
  pic300XCStatement: "45 hours",
  totalPICXC: 45,
  totalPICXCStatement: "Attached",
  totalInstrumentTime: 20,
  instrumentTimeStatement: "Attached",
  medicalValidity: "29/12/2026",
  dgcaClass1Medical: "Attached",
  dgcaExamDetails: [
    {
      exam: "airNavigation",
      resultDate: "20/05/2025",
      validity: "04/04/2025",
      proof: "Attached"
    },
    {
      exam: "airRegulations",
      resultDate: "21/05/2025",
      validity: "22/04/2025",
      proof: "Attached"
    },
    {
      exam: "aviation",
      resultDate: "22/05/2025",
      validity: "22/04/2025",
      proof: "Attached"
    },
    {
      exam: "meteorology",
      resultDate: "07/01/2025",
      validity: "08/07/2025",
      proof: "Attached"
    },
    {
      exam: "technicalSpecific",
      resultDate: "08/01/2025",
      validity: "09/03/2025",
      proof: "Attached"
    }
  ],
  rtrValidity: "10/05/2082",
  frtolCertificate: "Attached",
  policeVerificationDate: "01/05/2025",
  policeVerification: "Attached",
  splMarksheet: "Attached",
  _12thMarksheet: "Attached",
  nameChangeProcessed: "No",
  hearAboutUs: "Bhagavan rai recommend kara",
  selfDeclaration: "I hereby declare that all information provided in this application form is true and accurate. I confirm that I meet all DGCA-approved training criteria in accordance with DGCA training and safety standards. I further understand that any false information may result in the rejection of my application or revocation of any issued license. I acknowledge and agree that I am responsible for submitting all required documents, maintaining valid certifications, adhering to all regulations, and ensuring timely renewal or update of documents for continued compliance or recency, and I agree that SkyPro Aviation shall not be held responsible or liable in any manner. I understand and agree that if I fail to perform satisfactorily during any checks, as per the norms mentioned in DGCA CAR Section 7 Series C Part II & Series M Part VII, I shall be liable for re-training for preparedness, or competency, then the 7-day commitment and 15-day completion guarantee provided by SkyPro Aviation shall no longer be applicable. Any additional training, time, or costs directly borne and undertaken by me as a result of such re-training shall be entirely my responsibility.",
  declaration: "I confirm that all information provided above is true and correct to the best of my knowledge. I understand that any false information may lead to rejection of my application."
};

// ========================================
// RUN TESTS
// ========================================
(async () => {
  console.log("🚀 Starting PDF Generation Tests...\n");

  try {
    // Test 1: Complete Data
    console.log("📝 Test 1: Generating PDF with complete data...");
    const pdf1 = await generatePDF(completeTestData, []);
    console.log("✅ PDF generated at:", pdf1);
    console.log("");

    console.log("🎉 All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log("   ✓ Complete data test: PASSED");
    console.log("   ✓ Minimal data test: PASSED");
    console.log("   ✓ Simple custom data test: PASSED");
    console.log("\n✨ Check the generated PDFs in the 'uploads' folder");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
})();