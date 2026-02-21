// ══════════════════════════════════════════════════
//  Money Tracker — Google Apps Script Backend
//  Paste this entire file into your Apps Script editor
//  and deploy as Web App (Anyone can access)
// ══════════════════════════════════════════════════

const SHEET_NAME   = 'Entries';
const DRIVE_FOLDER = 'Money Tracker Receipt';
const TIMEZONE     = 'Asia/Tokyo';

// Column order in the sheet (0-indexed)
// [ID, Date, Direction, Amount(¥), Method, Situation, Description, Who, Saved At (JST), Receipt (Drive Link)]

// ──────────────────────────────────────────────────
//  doGet — fetch all entries (for cross-device sync)
// ──────────────────────────────────────────────────
function doGet(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({ entries: [] });
    }

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return jsonResponse({ entries: [] });
    }

    // Skip header row; map each row to an object
    const entries = rows.slice(1)
      .filter(r => r[0]) // skip empty rows
      .map(r => ({
        id:        r[0],
        date:      formatDateCell(r[1]),   // normalize Date objects → YYYY-MM-DD string
        direction: r[2] || 'out',
        amount:    Number(r[3]) || 0,
        method:    r[4] || '',
        situation: r[5] || '',
        desc:      r[6] || '',
        who:       r[7] || '',
        savedAt:   r[8] ? String(r[8]) : '',
        driveLink: r[9] || ''
      }));

    // Return newest first (sheet is oldest-first by default)
    entries.reverse();

    return jsonResponse({ entries });

  } catch (err) {
    return jsonResponse({ entries: [], error: err.toString() });
  }
}

// Helper: format a cell that might be a Date object or a plain string
function formatDateCell(cell) {
  if (!cell) return '';
  if (cell instanceof Date) {
    return Utilities.formatDate(cell, TIMEZONE, 'yyyy-MM-dd');
  }
  return String(cell).split('T')[0]; // handle any ISO strings
}

// Helper: return JSON response with CORS header
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────
//  doPost — save new entry OR delete existing entry
// ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'delete') {
      deleteEntry(data.id);
    } else {
      addEntry(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Add entry ──
function addEntry(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || createSheet(ss);

  const now     = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  const entryId = String(data.id);

  // Always save the text row first (so data is never lost even if image fails)
  sheet.appendRow([
    entryId,
    data.date       || '',
    data.direction  || 'out',
    Number(data.amount) || 0,
    data.method     || '',
    data.situation  || '',
    data.desc       || '',
    data.who        || '',
    now,             // Saved At (JST)
    ''               // Drive link — filled in below if image upload succeeds
  ]);

  // Try to upload receipt image (separate try-catch so row is never lost)
  if (data.receiptImage) {
    try {
      const driveLink = saveImageToDrive(data.receiptImage, entryId, data.date, data.desc);
      // Find the row we just appended and write the Drive link
      const allData = sheet.getDataRange().getValues();
      for (let i = allData.length - 1; i >= 1; i--) {
        if (String(allData[i][0]) === entryId) {
          sheet.getRange(i + 1, 10).setValue(driveLink);
          break;
        }
      }
    } catch (imgErr) {
      Logger.log('Image upload failed: ' + imgErr);
      // Row is already saved — just no Drive link
    }
  }
}

// ── Delete entry ──
function deleteEntry(id) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// ── Create the Entries sheet with headers if it doesn't exist ──
function createSheet(ss) {
  const sheet = ss.insertSheet(SHEET_NAME);
  sheet.appendRow([
    'ID', 'Date', 'Direction', 'Amount (¥)',
    'Method', 'Situation', 'Description', 'Who',
    'Saved At (JST)', 'Receipt (Drive Link)'
  ]);
  return sheet;
}

// ──────────────────────────────────────────────────
//  Save receipt image to Google Drive
// ──────────────────────────────────────────────────
function saveImageToDrive(base64Data, entryId, date, desc) {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const ssFile     = DriveApp.getFileById(ss.getId());
  const parentFolder = ssFile.getParents().next();

  // Get or create "Money Tracker Receipt" folder (same level as the spreadsheet)
  let receiptFolder;
  const rfSearch = parentFolder.getFoldersByName(DRIVE_FOLDER);
  receiptFolder = rfSearch.hasNext() ? rfSearch.next() : parentFolder.createFolder(DRIVE_FOLDER);

  // Get or create YYYYMM subfolder  (e.g. 202602)
  const yearMonth = Utilities.formatDate(
    new Date(date ? date + 'T12:00:00' : new Date()),
    TIMEZONE, 'yyyyMM'
  );
  let monthFolder;
  const mfSearch = receiptFolder.getFoldersByName(yearMonth);
  monthFolder = mfSearch.hasNext() ? mfSearch.next() : receiptFolder.createFolder(yearMonth);

  // Build filename: date_entryId_description.jpg
  const cleanDesc = (desc || 'receipt')
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]+/g, '-')
    .substring(0, 40);
  const filename = `${date || yearMonth}_${entryId}_${cleanDesc}.jpg`;

  // Decode base64 and create file
  const imageBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const blob = Utilities.newBlob(
    Utilities.base64Decode(imageBase64), 'image/jpeg', filename
  );
  const file = monthFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

// ──────────────────────────────────────────────────
//  Run this ONCE manually to authorize Drive access
//  (only needed when setting up for the first time,
//   or after creating a new deployment)
// ──────────────────────────────────────────────────
function fullDriveAuth() {
  const testFolder = DriveApp.getRootFolder().createFolder('_mt_auth_test');
  testFolder.setTrashed(true); // immediately delete it
  Logger.log('Drive write access granted ✓');
}
