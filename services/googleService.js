// Backend/services/googleService.js

const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function appendConversionRow(row) {
  const spreadsheetId = process.env.SHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Recency and Conversion Form!A1", // Use a separate sheet called "Conversion"
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  console.log("📊 Data appended to Google Sheet (Conversion tab)");
}

module.exports = {
  appendConversionRow,
};