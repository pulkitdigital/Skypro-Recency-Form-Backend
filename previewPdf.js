const generatePDF = require("./services/pdfGenerator");

const dummyData = {
  fullName: "Test Candidate",
  age: "25",
  gender: "Male",
  mobile: "9999999999",
  email: "test@mail.com",
  contractingState: "USA",
  licenseValidity: "Valid",
  licenseEndorsement: "SE ME IR",
  totalSEHours: 120,
  totalSEMinutes: 30,
  totalMEHours: 40,
  totalMEMinutes: 15,
  totalHours: "160:45",
  aircraftTypes: "C172, DA42",
  lastFlightDate: "2025-01-01",
  last6MonthsAvailable: "No",
  commercialCheckride: "C172",
  totalPICExperience: 80,
  totalPICXC: 20,
  totalInstrumentTime: 35,
  medicalValidity: "2026-05-01",
  hearAboutUs: "Website",
};

(async () => {
  const pdfPath = await generatePDF(dummyData, []);
  console.log("PDF generated at:", pdfPath);
})();
