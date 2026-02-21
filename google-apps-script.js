// ══════════════════════════════════════════════════════
//  Money Tracker — Google Apps Script Backend  v3
//  Paste this entire file into Google Apps Script
//  and deploy as a NEW Web App (see setup guide)
// ══════════════════════════════════════════════════════

const SHEET_NAME   = 'Entries';
const DRIVE_FOLDER = 'Money Tracker Receipts';
const TIMEZONE     = 'Asia/Tokyo';

// Column headers — DO NOT change order after first use
const HEADERS = [
  'ID', 'Date', 'Direction', 'Amount (¥)', 'Method',
  'Situation', 'Description', 'Who', 'Saved At (JST)', 'Receipt (Drive Link)'
];

// ── Called when the tracker app saves OR deletes an entry ──
function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    // ── DELETE action ──
    if (data.action === 'delete') {
      const rows  = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ status: 'ok', deleted: data.id });
        }
      }
      return jsonResponse({ status: 'ok', note: 'row not found' });
    }

    // ── ADD action (default) ──

    // Format saved time in JST
    const jstTime = Utilities.formatDate(
      new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'
    );

    // Save entry row first — always, even if image upload fails
    sheet.appendRow([
      data.id        || Date.now(),
      data.date      || '',
      data.direction || '',
      data.amount    || 0,
      data.method    || '',
      data.situation || '',
      data.desc      || '',
      data.who       || '',
      jstTime,
      '' // Drive link — filled in below if image upload succeeds
    ]);

    // Upload receipt image to Google Drive separately
    // If this fails, the entry row is already saved safely above
    let driveLink = '';
    if (data.receiptImage) {
      try {
        driveLink = saveImageToDrive(
          data.receiptImage,
          data.id,
          data.date,
          data.desc
        );
        // Find the row we just added and update the Drive link column
        const rows   = sheet.getDataRange().getValues();
        for (let i = rows.length - 1; i >= 1; i--) {
          if (String(rows[i][0]) === String(data.id)) {
            sheet.getRange(i + 1, 10).setValue(driveLink);
            break;
          }
        }
      } catch (imgErr) {
        Logger.log('Drive upload failed: ' + imgErr.message);
        // Entry is already saved — just log the error, don't fail the whole request
      }
    }

    return jsonResponse({ status: 'ok', driveLink });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ── Called when the tracker app loads entries ──
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const rows  = sheet.getDataRange().getValues();
    if (rows.length <= 1) return jsonResponse({ entries: [] });

    const entries = rows.slice(1).map(r => ({
      id:        r[0],
      date:      r[1],
      direction: r[2],
      amount:    r[3],
      method:    r[4],
      situation: r[5],
      desc:      r[6],
      who:       r[7],
      savedAt:   r[8],
      driveLink: r[9] || ''
    })).reverse();

    return jsonResponse({ entries });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ── Save receipt image to Google Drive ──
function saveImageToDrive(base64Data, entryId, date, desc) {
  // ── Step 1: Find the same parent folder as the spreadsheet ──
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const ssFile     = DriveApp.getFileById(ss.getId());
  const parentFolder = ssFile.getParents().next(); // folder containing the sheet

  // ── Step 2: Get or create "Money Tracker Receipt" in that same folder ──
  let receiptFolder;
  const rfSearch = parentFolder.getFoldersByName(DRIVE_FOLDER);
  receiptFolder  = rfSearch.hasNext() ? rfSearch.next() : parentFolder.createFolder(DRIVE_FOLDER);

  // ── Step 3: Get or create year+month subfolder (e.g. "202601") ──
  const entryDate = new Date(date + 'T00:00:00');
  const yearMonth = Utilities.formatDate(entryDate, TIMEZONE, 'yyyyMM'); // e.g. "202601"

  let monthFolder;
  const mfSearch = receiptFolder.getFoldersByName(yearMonth);
  monthFolder    = mfSearch.hasNext() ? mfSearch.next() : receiptFolder.createFolder(yearMonth);

  // ── Step 4: Build filename ──
  // Format: date_entryId_description.jpg
  // e.g.   2026-01-21_1740123456789_lunch-ramen.jpg
  const cleanDesc = (desc || 'receipt')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const filename = `${date}_${entryId}_${cleanDesc}.jpg`;

  // ── Step 5: Decode base64 → save file ──
  const imageBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const blob = Utilities.newBlob(
    Utilities.base64Decode(imageBase64),
    'image/jpeg',
    filename
  );
  const file = monthFolder.createFile(blob);

  // View-only link for anyone with the URL
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

// ── Helpers ──
function getOrCreateSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    // Style header row
    const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
    hRange.setBackground('#1a1a2e');
    hRange.setFontColor('#c084fc');
    hRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Column widths
    sheet.setColumnWidth(1,  140); // ID
    sheet.setColumnWidth(2,  100); // Date
    sheet.setColumnWidth(3,   90); // Direction
    sheet.setColumnWidth(4,  100); // Amount
    sheet.setColumnWidth(5,  120); // Method
    sheet.setColumnWidth(6,  150); // Situation
    sheet.setColumnWidth(7,  200); // Description
    sheet.setColumnWidth(8,  100); // Who
    sheet.setColumnWidth(9,  160); // Saved At JST
    sheet.setColumnWidth(10, 300); // Receipt Drive Link
  } else {
    // If sheet already exists, make sure column 10 header is set
    const lastCol = sheet.getLastColumn();
    if (lastCol < 10) {
      sheet.getRange(1, 10).setValue('Receipt (Drive Link)');
      sheet.setColumnWidth(10, 300);
    }
  }

  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
