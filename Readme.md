# SkyPro Aviation - Conversion & Recency Backend

Backend server for the SkyPro Aviation Conversion and Recency Admission Form.

## Features

- ✅ File upload handling (photos, PDFs, signatures)
- ✅ PDF generation with form data and attached documents
- ✅ Email notifications via Brevo API
- ✅ Google Sheets integration for data storage
- ✅ Background job queue processing
- ✅ Retry logic for failed operations
- ✅ Automatic file cleanup

## Tech Stack

- **Node.js** & **Express** - Server framework
- **Multer** - File upload handling
- **PDFKit** - PDF generation
- **Brevo API** - Email sending
- **Google Sheets API** - Data storage
- **Custom Queue System** - Background job processing

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then configure the following variables:

#### Server Configuration
```
PORT=5000
```

#### Brevo Email API
1. Sign up at [Brevo](https://www.brevo.com/)
2. Go to SMTP & API → API Keys
3. Create a new API key
4. Add to `.env`:
```
BREVO_API_KEY=your_brevo_api_key_here
MAIL_FROM=noreply@skyproaviation.org
ADMIN_EMAIL=admin@skyproaviation.org
```

#### Google Sheets API

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable Google Sheets API**
   - In the project, go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Fill in the details and create
   - Click on the created service account
   - Go to "Keys" tab → "Add Key" → "Create New Key"
   - Choose JSON format and download

4. **Configure Google Sheet**
   - Create a new Google Sheet
   - Create a tab named **"Conversion"** (case-sensitive)
   - Add headers in the first row (see below)
   - Share the sheet with the service account email (found in the JSON file)
   - Give it "Editor" access

5. **Add to .env**
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
SHEET_ID=your_google_sheet_id_here
```

**Note:** The `GOOGLE_SERVICE_ACCOUNT_JSON` should be the entire JSON file content as a single line.

The `SHEET_ID` is found in the Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

### Google Sheet Headers (Row 1 of "Conversion" tab)

```
Timestamp | Full Name | Age | Gender | Mobile | Email | Contracting State | License Validity | License Endorsement | Total SE Hours | Total ME Hours | Total Hours | Aircraft Types | Last Flight Date | Last 6 Months Available | Sortie Count | Total Day PIC | Total Night PIC | Total IF | IR Check Aircraft | IR Check Date | IR Check Validity | Signal Reception | Signal Reception Date | Signal Reception Validity | Commercial Checkride | C172 Checkride Date | C172 PIC Option | Total PIC Experience | Total PIC XC | Total Instrument Time | Medical Validity | DGCA Exams | RTR Validity | Police Verification Date | Name Change Processed | Heard About Us | Passport Photo | Foreign License | CA-40 IR | Signal Reception Test | C172 Checkride Statement | C172 Flight Review | PIC 100 Statement | XC 300 Statement | PIC XC Statement | Instrument Time Statement | Medical Assessment | RTR | FRTOL | Police Verification | 10th Marksheet | 12th Marksheet | Name Change Certificate | Student Signature | Final Signature
```

### 3. Project Structure

```
Backend/
├── server.js                 # Main Express server
├── services/
│   ├── queueService.js      # Background job queue
│   ├── pdfGenerator.js      # PDF generation logic
│   ├── emailService.js      # Brevo email sending
│   └── googleService.js     # Google Sheets integration
├── uploads/                 # Temporary file storage (auto-created)
├── .env                     # Environment variables
├── .env.example            # Example environment file
├── package.json            # Dependencies
└── README.md              # This file
```

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### POST `/api/submit-conversion`

Submit a conversion & recency form with file uploads.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data + file uploads

**Response:**
```json
{
  "success": true,
  "message": "Form submitted successfully! Processing in background.",
  "jobId": "job-1234567890-abc123",
  "info": "You will receive a confirmation email shortly."
}
```

### GET `/api/queue-status`

Get the current status of the job queue.

**Response:**
```json
{
  "queueLength": 2,
  "isProcessing": true,
  "jobs": [
    {
      "id": "job-1234567890-abc123",
      "status": "processing",
      "attempts": 1,
      "createdAt": "2025-01-31T10:30:00.000Z",
      "studentName": "John Doe"
    }
  ]
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-31T10:30:00.000Z"
}
```

## File Upload Fields

The form accepts the following file fields:

**Required:**
- `passportPhoto` (JPG, 413x531px)
- `foreignLicense` (PDF)
- `studentSignature` (JPG, 300x150px)
- `finalSignature` (JPG, 300x150px)

**Conditional:**
- `ca40IR` (PDF) - Required if Last 6 Months Available = Yes
- `signalReceptionTest` (PDF) - Required if Signal Reception = Yes
- `c172CheckrideStatement` (PDF) - Required if Checkride Type = C172
- `c172FlightReview` (PDF) - Required if C172 PIC Option = flightReview
- `nameChangeCertificate` (PDF) - Required if Name Change = Yes

**Additional:**
- `pic100Statement` (PDF)
- `xc300Statement` (PDF)
- `picXCStatement` (PDF)
- `instrumentTimeStatement` (PDF)
- `medicalAssessment` (PDF)
- `rtr` (PDF)
- `frtol` (PDF)
- `policeVerification` (PDF)
- `marksheet10` (PDF)
- `marksheet12` (PDF)

**File Limits:**
- Max size: 2MB per file
- Images: JPG/JPEG only
- Documents: PDF only

## Background Processing

The backend uses a custom job queue system to handle form submissions in the background:

1. **Form submission** → Instant response (2-3 seconds)
2. **Background processing:**
   - Generate PDF with form data and documents
   - Send admin email with PDF attachment
   - Send student confirmation email
   - Update Google Sheet with submission data
   - Clean up temporary files

3. **Retry logic:** Up to 3 attempts for failed operations
4. **Auto cleanup:** All temporary files are deleted after processing

## Error Handling

- Invalid file types/sizes: Rejected with error message
- Missing required files: Warning logged, processing continues
- Email failures: Retry up to 3 times with exponential backoff
- PDF generation failures: Job marked as failed after 3 attempts
- Google Sheets failures: Retry with backoff

## Development

**Install nodemon for auto-restart:**
```bash
npm install -D nodemon
```

**Run in development mode:**
```bash
npm run dev
```

## Production Deployment

1. Set up environment variables on your server
2. Install dependencies: `npm install --production`
3. Start server: `npm start`
4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name skypro-backend
   pm2 save
   pm2 startup
   ```

## Security Notes

- Never commit `.env` file to version control
- Keep API keys and service account JSON secure
- Use HTTPS in production
- Validate all user inputs
- Set appropriate CORS policies
- Implement rate limiting for production

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env to a different number
PORT=5001
```

**Google Sheets permission denied:**
- Check if service account email has Editor access to the sheet
- Verify the sheet has a tab named "Conversion"
- Ensure GOOGLE_SERVICE_ACCOUNT_JSON is valid JSON

**Email not sending:**
- Verify BREVO_API_KEY is correct
- Check Brevo account status and limits
- Ensure MAIL_FROM email is verified in Brevo

**Files not uploading:**
- Check uploads directory exists and has write permissions
- Verify file size is under 2MB
- Ensure correct file types (JPG for images, PDF for documents)

## Support

For issues or questions, contact: admin@skyproaviation.org

## License

© 2025 SkyPro Aviation Academy. All rights reserved.