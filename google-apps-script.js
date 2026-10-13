/**
 * TreasTrack — Google Drive & Gmail Automation Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and open your project.
 * 2. Replace all code in Code.gs with this entire file and press Ctrl+S (Save).
 * 3. (Optional — for Automatic Gmail Signature & Blank "To" field):
 *    In the left sidebar, click "+" next to "Services", select "Gmail API", and click "Add".
 * 4. At the top toolbar, select "doGet" in the function dropdown and click "Run" once
 *    to approve the Google permissions prompt ("Review permissions" -> "Advanced" -> "Allow").
 * 5. Click "Deploy" (top right) -> "New deployment" (or "Manage deployments" -> Edit -> "New version").
 *    - Type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Copy the Web app URL (ending in /exec) and paste it into "Google Setup" in TreasTrack.
 */

function doGet(e) {
  try {
    // Touch DriveApp and GmailApp so visiting the URL in a browser verifies permissions
    var rootName = DriveApp.getRootFolder().getName();
    var draftsCount = GmailApp.getDrafts().length;
    var hasAdvancedGmail = (typeof Gmail !== 'undefined' && Boolean(Gmail.Users));
    var sig = getGmailSignatureHtml();

    var statusText = [
      '✓ TreasTrack Google Apps Script is active and authorized!',
      '',
      '• Google Drive connected (Root folder: ' + rootName + ')',
      '• Gmail connected (Current drafts: ' + draftsCount + ')',
      '• Advanced Gmail API service enabled: ' + (hasAdvancedGmail ? 'Yes' : 'No (optional — enable "Gmail API" under Services + for automatic signature & blank To field)'),
      '• Default Gmail signature detected: ' + (sig ? 'Yes' : 'No')
    ].join('\n');

    return ContentService
      .createTextOutput(statusText)
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService
      .createTextOutput('Error checking permissions: ' + (err && err.message ? err.message : String(err)))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPost(e) {
  try {
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(rawContents);
    var eventName = (payload.eventName || 'Untitled Event').trim();
    var fileName = (payload.fileName || ('BF_' + eventName + '.pdf')).trim();
    var pdfBase64 = payload.pdfBase64 || '';
    var parentFolderId = extractFolderId(payload.parentFolderId || '');

    if (!pdfBase64) {
      return jsonResponse({ success: false, error: 'Missing PDF data.' });
    }

    // 1. Decode the Blue Form PDF bytes
    var pdfBytes = Utilities.base64Decode(pdfBase64);
    var pdfBlob = Utilities.newBlob(pdfBytes, 'application/pdf', fileName);

    // 2. Find or create the "{event name}" folder inside the Parent Drive Folder (or root Drive)
    var parentFolder = parentFolderId
      ? DriveApp.getFolderById(parentFolderId)
      : DriveApp.getRootFolder();

    var eventFolder = getOrCreateSubfolder(parentFolder, eventName);

    // Save BF_{event name}.pdf into the event folder
    var savedFile = eventFolder.createFile(pdfBlob);

    // 3. Build the Gmail Draft ("Blue Form - {event name}") with automatic Gmail signature
    var subject = 'Blue Form - ' + eventName;
    var plainBody = 'Hi,\n\nPlease find attached the Blue Form for ' + eventName;
    var htmlBody =
      '<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222222;">' +
      '<p>Hi,</p>' +
      '<p>Please find attached the Blue Form for ' + escapeHtml(eventName) + '</p>' +
      '</div>';

    var signatureHtml = getGmailSignatureHtml();
    if (signatureHtml) {
      htmlBody += '<br>' + signatureHtml;
    }

    createGmailDraft(subject, plainBody, htmlBody, pdfBlob);

    return jsonResponse({
      success: true,
      folderName: eventFolder.getName(),
      folderUrl: eventFolder.getUrl(),
      fileUrl: savedFile.getUrl(),
      signatureIncluded: Boolean(signatureHtml)
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function extractFolderId(input) {
  var str = String(input || '').trim();
  if (!str) return '';
  var folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  var idMatch = str.match(/[-\w]{25,}/);
  return idMatch ? idMatch[0] : str;
}

function getOrCreateSubfolder(parentFolder, folderName) {
  var existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(folderName);
}

function getGmailSignatureHtml() {
  try {
    if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Settings) {
      var res = Gmail.Users.Settings.SendAs.list('me');
      if (res && res.sendAs) {
        for (var i = 0; i < res.sendAs.length; i++) {
          if (res.sendAs[i].isDefault && res.sendAs[i].signature) {
            return res.sendAs[i].signature;
          }
        }
      }
    }
  } catch (e) {
    Logger.log('Gmail service signature lookup skipped: ' + e);
  }
  return '';
}

function createGmailDraft(subject, plainBody, htmlBody, pdfBlob) {
  // 1. If the Advanced Gmail API service is enabled, create a raw MIME draft so "To" can be completely blank
  if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Drafts) {
    try {
      var boundary = 'treastrack_boundary_' + Utilities.getUuid();
      var base64Pdf = Utilities.base64Encode(pdfBlob.getBytes());
      var safeFileName = pdfBlob.getName().replace(/"/g, '');

      var mimeLines = [
        'MIME-Version: 1.0',
        'Subject: =?UTF-8?B?' + Utilities.base64Encode(subject, Utilities.Charset.UTF_8) + '?=',
        'Content-Type: multipart/mixed; boundary="' + boundary + '"',
        '',
        '--' + boundary,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8),
        '',
        '--' + boundary,
        'Content-Type: application/pdf; name="' + safeFileName + '"',
        'Content-Disposition: attachment; filename="' + safeFileName + '"',
        'Content-Transfer-Encoding: base64',
        '',
        base64Pdf,
        '--' + boundary + '--'
      ];

      var rawMime = mimeLines.join('\r\n');
      var encodedRaw = Utilities.base64EncodeWebSafe(rawMime, Utilities.Charset.UTF_8);
      Gmail.Users.Drafts.create({ message: { raw: encodedRaw } }, 'me');
      return;
    } catch (mimeErr) {
      Logger.log('Advanced Gmail draft failed, falling back to GmailApp: ' + mimeErr);
    }
  }

  // 2. Fallback to standard GmailApp.createDraft
  try {
    GmailApp.createDraft('', subject, plainBody, {
      htmlBody: htmlBody,
      attachments: [pdfBlob]
    });
  } catch (emptyRecipErr) {
    // GmailApp.createDraft requires a non-empty recipient in some accounts; use the active user's email as placeholder
    var fallbackRecipient = Session.getActiveUser().getEmail() || 'recipient@example.com';
    GmailApp.createDraft(fallbackRecipient, subject, plainBody, {
      htmlBody: htmlBody,
      attachments: [pdfBlob]
    });
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
