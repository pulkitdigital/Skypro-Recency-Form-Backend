// services/driveService.js
const fs = require("fs");
const axios = require("axios");

async function uploadToDrive(filePath, fileName, studentName) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`❌ File not found: ${filePath}`);
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;
  if (!scriptUrl) throw new Error("❌ APPS_SCRIPT_URL missing in .env");

  const fileBuffer = fs.readFileSync(filePath);
  const fileBase64 = fileBuffer.toString("base64");
  const monthStr = new Date().toISOString().slice(0, 7);

  const safeName = (studentName || "Unknown")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");

  console.log(`   ☁️  Uploading via Apps Script: ${fileName}…`);

  const response = await axios.post(scriptUrl, {
    fileName,
    fileBase64,
    studentName: safeName,
    month: monthStr,
  }, {
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
  });

  if (!response.data.success) {
    throw new Error(`Apps Script error: ${response.data.error}`);
  }

  console.log(`   ✅ Uploaded: ${fileName} | ID: ${response.data.fileId}`);
  return response.data.fileId;
}

module.exports = { uploadToDrive };