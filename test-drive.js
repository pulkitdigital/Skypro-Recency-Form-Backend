require("dotenv").config();
const { uploadToDrive } = require("./services/driveService");
const fs = require("fs");

fs.writeFileSync("test.pdf", "test content");

uploadToDrive("test.pdf", "TEST-upload.pdf", "Test Student")
  .then(id => console.log("✅ SUCCESS, file ID:", id))
  .catch(err => console.log("❌ FAILED:", err.message))
  .finally(() => fs.unlinkSync("test.pdf"));