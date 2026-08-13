// Use a project-specific name because Apps Script shares global scope across
// every .gs file. The existing project also contains a "Transfer" file with
// its own CONFIG constant, and duplicate global const declarations stop the
// whole web app from compiling.
const FIRE_AUDIT_CONFIG = {
    SPREADSHEET_ID: '1DfTDbzTZjibf34yBQMtl01eYWr9o7NwkiE4h7qRzJro',
    DROPDOWN_SHEET: 'DROPDOWN',
    AUDIT_SHEET: 'AUDIT DATA',
    PDF_SHEET: 'PDF REPORTS',
    DAILY_SHEET: 'Daily Task',
    LOGO_SHEET: 'LOGO',
    DEFAULT_LOGO_URL: 'https://drive.google.com/file/d/1zTH4FqVM7xA40ZmKPVQ8H1udz6MHj5bX/view?usp=sharing',
    LOGO_FALLBACK_URL: 'https://res.cloudinary.com/dsvyn62lc/image/upload/q_auto/v1776405935/trio_group_logo-removebg-preview_ymc7fs.png',
    FILE_FOLDER_NAME: 'Fire Safety Audit Attachments'
    };

const CACHE_KEYS = {
  PDF_LIST: 'fireAudit:recentPdfs:v1',
  REPORT_DATA: 'fireAudit:reportData:v1'
};

const CACHE_TTL_SECONDS = 60;

    function doGet(e) {
    const parameters = (e && e.parameter) || {};
    const action = String(parameters.action || '').trim();
    const callback = String(parameters.callback || '').trim();

    if (action === 'dropdowns') {
    try {
        return jsonResponse(getDropdownData(), callback);
    } catch (error) {
        return jsonResponse({
        factories: [],
        extinguisherTypes: [],
        error: error.message || String(error)
        }, callback);
    }
}

if (action === 'recentPdfs') {
    return jsonResponse(getRecentPdfs());
}

if (action === 'reportData') {
    return jsonResponse(getReportData());
}

if (action === 'markDone') {
    const rowIndex = parseInt(e.parameter.rowIndex, 10);
    markReportDone(rowIndex);
    return jsonResponse({ ok: true });
}

if (action === 'submitCount') {
    return jsonResponse({ count: getSubmittedCount() });
}

if (action === 'dailyStats') {
    return jsonResponse(getDailyStats());
}

if (action === 'dailyTaskData') {
    return jsonResponse(getDailyTaskData());
}

if (action === 'dailyStats') {
    return jsonResponse(getDailyStats());
}

if (action === 'mailRecipients') {
    return jsonResponse(getMailRecipients());
}

    return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Fire Safety Audit')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    function doPost(e) {
    try {
        const payload = parsePayload(e);
        
        if (payload.action === 'deletePdf') {
            return jsonResponse(deletePdfById(payload.pdfId));
        }

        if (payload.action === 'dailyTask') {
            return jsonResponse({ ok: true, message: 'Daily task recorded successfully.', result: saveDailyTask(payload) });
        }

        if (payload.action === 'dailyTaskUpdate') {
            return jsonResponse({ ok: true, message: 'Daily task updated successfully.', result: updateDailyTaskExtra(payload) });
        }

        if (payload.action === 'sendObservationMail') {
            return jsonResponse(sendObservationMailGas(payload));
        }

        const result = saveAudit(payload);
        return jsonResponse({ ok: true, message: 'Audit submitted successfully.', result });
    } catch (error) {
        return jsonResponse({ ok: false, message: error.message || String(error) });
    }
    }

    function getDropdownData() {
    const sheet = getSheetByLooseName(getSpreadsheet(), FIRE_AUDIT_CONFIG.DROPDOWN_SHEET);
    if (!sheet) {
        throw new Error(`Dropdown sheet "${FIRE_AUDIT_CONFIG.DROPDOWN_SHEET}" was not found.`);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) {
        return { factories: [], extinguisherTypes: [] };
    }

    const values = sheet.getRange(1, 1, lastRow, Math.max(2, sheet.getLastColumn())).getDisplayValues();
    const headers = values[0].map(value => String(value || '').trim().toLowerCase());
    const factoryColumn = headers.findIndex(value => /factory|unit|location/.test(value));
    const extinguisherColumn = headers.findIndex(value => /extinguisher|fire\s*type|type/.test(value));
    const hasHeader = factoryColumn !== -1 || extinguisherColumn !== -1;
    const rows = hasHeader ? values.slice(1) : values;
    const factoryIndex = factoryColumn === -1 ? 0 : factoryColumn;
    const extinguisherIndex = extinguisherColumn === -1 ? 1 : extinguisherColumn;

    return {
        factories: uniqueClean(rows.map(row => row[factoryIndex])),
        extinguisherTypes: uniqueClean(rows.map(row => row[extinguisherIndex]))
    };
    }

    function getSubmittedCount() {
    const sheet = getSpreadsheet().getSheetByName(FIRE_AUDIT_CONFIG.AUDIT_SHEET);
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    return lastRow > 1 ? lastRow - 1 : 0;
    }

    function submitAudit(payload) {
    return saveAudit(payload);
    }

    function saveAudit(payload) {
    if (!payload || !payload.basicDetails) {
        throw new Error('Invalid audit data.');
    }

    const ss = getSpreadsheet();
    const sheet = getOrCreateSheet(ss, FIRE_AUDIT_CONFIG.AUDIT_SHEET);
    const now = new Date();
    const attachmentLinks = saveAttachments(payload.attachments || [], payload.basicDetails);
    const pdfFile = createAuditPdf(payload, attachmentLinks, now);

savePdfRecord(pdfFile, payload, now);

const rowObject = buildAuditRow(payload, attachmentLinks, now);
    rowObject['PDF Report'] = pdfFile.getUrl();

    ensureHeaders(sheet, Object.keys(rowObject));
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(header => rowObject[header] || '');
    sheet.appendRow(row);

    return {
        timestamp: now,
        attachmentCount: attachmentLinks.length,
        row: sheet.getLastRow(),
        pdfUrl: pdfFile.getUrl(),
        pdfDownloadUrl: getDriveDownloadUrl(pdfFile.getId()),
        pdfBase64: Utilities.base64Encode(pdfFile.getBlob().getBytes()),
        pdfName: pdfFile.getName()
    };
    }

    function buildAuditRow(payload, attachmentLinks, timestamp) {
    const basic = payload.basicDetails || {};
    const risk = payload.riskObservation || {};
    const finalAssessment = payload.finalAssessment || {};
    const flattened = flattenObject(payload);

    return Object.assign({
        Timestamp: timestamp,
        'Factory Name': basic.factoryName || '',
        Location: basic.location || '',
        'Audit Date': basic.auditDate || '',
        'Inspector Name': basic.inspectorName || '',
        Department: basic.department || '',
        'Overall Fire Safety Status': finalAssessment.overallStatus || '',
        'Immediate Action Required': finalAssessment.immediateActionRequired || '',
        'Any Fire Hazards Identified': risk.fireHazardsIdentified || '',
        'High Risk Areas': risk.highRiskAreas || '',
        'Suggestion For Improvement': risk.suggestionForImprovement || '',
        'Attachment Links': attachmentLinks.join('\n'),
        'Full Audit JSON': JSON.stringify(payload)
    }, flattened);
    }

    function saveAttachments(files, basicDetails) {
    if (!files.length) return [];

    const folder = getOrCreateFolder(FIRE_AUDIT_CONFIG.FILE_FOLDER_NAME);
    const label = [
        basicDetails.factoryName || 'Factory',
        basicDetails.auditDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    ].join('_').replace(/[^\w.-]+/g, '_');

    return files.map((file, index) => {
        if (!file || !file.data || !file.name) return '';

        const bytes = Utilities.base64Decode(file.data);
        const blob = Utilities.newBlob(bytes, file.mimeType || 'application/octet-stream', `${label}_${index + 1}_${file.name}`);
        const created = folder.createFile(blob);
        return created.getUrl();
    }).filter(Boolean);
    }

    function createAuditPdf(payload, attachmentLinks, timestamp) {
    const basic = payload.basicDetails || {};
    const folder = getOrCreateFolder(FIRE_AUDIT_CONFIG.FILE_FOLDER_NAME);
    const reportName = [
        'Fire Safety Audit',
        basic.factoryName || 'Factory',
        basic.auditDate || Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    ].join(' - ').replace(/[\\/:*?"<>|]+/g, '-');
    const html = buildAuditPdfHtml(payload, attachmentLinks, timestamp);
    const blob = Utilities.newBlob(html, MimeType.HTML, `${reportName}.html`)
        .getAs(MimeType.PDF)
        .setName(`${reportName}.pdf`);
    return folder.createFile(blob);
    }

    function buildAuditPdfHtml(payload, attachmentLinks, timestamp) {
    const logoSrc = getLogoDataUrl();
    const basic = payload.basicDetails || {};
    const risk = payload.riskObservation || {};
    const finalAssessment = payload.finalAssessment || {};
    const generatedAt = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'dd MMM yyyy, hh:mm:ss a');
    const title = 'Factory Fire Safety & Maintenance Audit Report';

    return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 28px; }
        * { box-sizing: border-box; }
        body {
        margin: 0;
        color: #172129;
        font-family: Verdana, Geneva, sans-serif;
        font-size: 10px;
        line-height: 1.45;
        background: #ffffff;
        }
        .report-shell {
        border-top: 10px solid #137969;
        border-radius: 16px 16px 0 0;
        padding: 32px 28px 0;
        }
        .hero-frame {
        display: table;
        width: 100%;
        border: 3px solid #000000;
        background: #ffffff;
        }
        .logo-cell {
        display: table-cell;
        width: 22%;
        padding: 14px;
        border-right: 2px solid #000000;
        text-align: center;
        vertical-align: middle;
        }
        .title-cell {
        display: table-cell;
        width: 78%;
        padding: 20px 22px;
        vertical-align: middle;
        }
        .logo-box-report {
        display: inline-block;
        width: 126px;
        height: 126px;
        padding: 18px;
        border: 1px solid #c9ddd6;
        border-radius: 14px;
        background: #ffffff;
        }
        .logo {
        max-width: 90px;
        max-height: 90px;
        object-fit: contain;
        }
        .eyebrow {
        margin: 0 0 14px;
        color: #137969;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 4px;
        text-transform: uppercase;
        }
        h1 {
        margin: 0;
        color: #172129;
        font-size: 26px;
        line-height: 1.1;
        letter-spacing: 0;
        }
        .generated {
        margin-top: 12px;
        color: #536a62;
        font-size: 12px;
        font-weight: bold;
        }
        .summary-grid {
        display: table;
        width: 100%;
        border-spacing: 10px 14px;
        margin: 12px -10px 4px;
        table-layout: fixed;
        }
        .summary-card {
        display: table-cell;
        width: 25%;
        padding: 12px 16px;
        border: 1px solid #cfe0da;
        border-left: 6px solid #137969;
        border-radius: 10px;
        background: #ffffff;
        vertical-align: middle;
        }
        .summary-card.status-good { border-left-color: #d56d50; }
        .summary-card.action { border-left-color: #cf9840; }
        .summary-card.date { border-left-color: #4e936b; }
        .summary-card.factory { border-left-color: #4d9ad0; }
        .summary-value {
        display: block;
        color: #172129;
        font-size: 16px;
        line-height: 1.1;
        font-weight: bold;
        word-wrap: break-word;
        }
        .summary-label {
        display: block;
        margin-top: 8px;
        color: #5c716a;
        font-size: 10px;
        font-weight: bold;
        }
        .section {
        margin-top: 14px;
        page-break-inside: avoid;
        }
        .section h2 {
        margin: 0;
        padding: 12px 16px;
        color: #183d35;
        background: #ffffff;
        border: 1px solid #cfe0da;
        border-left: 7px solid #137969;
        border-radius: 10px;
        font-size: 14px;
        letter-spacing: 0;
        }
        table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border: 1px solid #dce7eb;
        margin-top: 8px;
        }
        th, td {
        border: 1px solid #dce7eb;
        padding: 7px 8px;
        vertical-align: top;
        word-wrap: break-word;
        }
        th {
        width: 30%;
        color: #34434d;
        background: #eef7f7;
        text-align: left;
        font-weight: bold;
        }
        td { background: #ffffff; }
        tr:nth-child(even) td { background: #fbfdff; }
        .check-table th { width: auto; }
        .check-table .sl { width: 6%; text-align: center; }
        .check-table .question { width: 38%; }
        .check-table .status-col { width: 12%; text-align: center; }
        .yes { color: #1f7a41; font-weight: bold; }
        .no { color: #b62626; font-weight: bold; }
        .muted { color: #65717b; }
        .footer {
        margin-top: 18px;
        padding-top: 10px;
        border-top: 1px solid #dce7eb;
        color: #65717b;
        font-size: 9px;
        text-align: center;
        }
        .signature-section {
        margin-top: 36px;
        page-break-inside: avoid;
        }
        .signature-grid {
        display: table;
        width: 100%;
        table-layout: fixed;
        border-spacing: 20px 0;
        margin: 0 -20px;
        }
        .signature-box {
        display: table-cell;
        width: 50%;
        padding-top: 44px;
        vertical-align: bottom;
        }
        .signature-line {
        border-top: 1px solid #172129;
        padding-top: 8px;
        color: #172129;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        }
    </style>
    </head>
    <body>
    <div class="report-shell">
        <div class="hero-frame">
        <div class="logo-cell">
            <div class="logo-box-report">
            ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="Logo">` : ''}
            </div>
        </div>
        <div class="title-cell">
            <div class="eyebrow">Audit Report</div>
            <h1>${escapeHtml(title)}</h1>
            <div class="generated">Generated on ${escapeHtml(generatedAt)}</div>
        </div>
        </div>

        <div class="summary-grid">
        <div class="summary-card status-good">
            <span class="summary-value">${escapeHtml(finalAssessment.overallStatus || '-')}</span>
            <span class="summary-label">Overall Status</span>
        </div>
        <div class="summary-card action">
            <span class="summary-value">${escapeHtml(finalAssessment.immediateActionRequired || '-')}</span>
            <span class="summary-label">Immediate Action</span>
        </div>
        <div class="summary-card date">
            <span class="summary-value">${escapeHtml(formatDateShortForReport(basic.auditDate))}</span>
            <span class="summary-label">Audit Date</span>
        </div>
        <div class="summary-card factory">
            <span class="summary-value">${escapeHtml(basic.factoryName || '-')}</span>
            <span class="summary-label">Factory</span>
        </div>
        </div>
    </div>

    ${buildKeyValueSection('Basic Details', basic)}
    ${buildChecklistSections(payload)}
    ${buildKeyValueSection('Risk Observation', risk)}
    ${buildKeyValueSection('Final Assessment', finalAssessment)}
    ${buildAttachmentSection(attachmentLinks)}
    ${buildSignatureSection()}

    <div class="footer"></div>
    </body>
    </html>`;
    }

    function buildKeyValueSection(title, data) {
    const rows = Object.keys(data || {})
        .filter(key => !isEmptyValue(data[key]))
        .map(key => `<tr><th>${escapeHtml(humanizeKey(key))}</th><td>${escapeHtml(formatReportValue(data[key], key))}</td></tr>`)
        .join('');

    if (!rows) return '';
    return `<div class="section"><h2>${escapeHtml(title)}</h2><table>${rows}</table></div>`;
    }

    function buildChecklistSections(payload) {
    const skip = ['basicDetails', 'riskObservation', 'finalAssessment', 'attachments'];
    return Object.keys(payload || {})
        .filter(sectionKey => !skip.includes(sectionKey) && payload[sectionKey] && typeof payload[sectionKey] === 'object')
        .map(sectionKey => buildChecklistSection(sectionKey, payload[sectionKey]))
        .filter(Boolean)
        .join('');
    }

    function buildChecklistSection(sectionKey, sectionData) {
    const rows = Object.keys(sectionData || {}).map((itemKey, index) => {
        const item = sectionData[itemKey] || {};
        const status = item.available || '';
        const details = Object.keys(item)
        .filter(key => key !== 'available' && !isEmptyValue(item[key]))
        .map(key => `<strong>${escapeHtml(humanizeKey(key))}:</strong> ${escapeHtml(formatReportValue(item[key], key))}`)
        .join('<br>');

        return `<tr>
        <td class="sl">${index + 1}</td>
        <td class="question">${escapeHtml(humanizeKey(itemKey))}</td>
        <td class="status-col ${String(status).toUpperCase() === 'YES' ? 'yes' : String(status).toUpperCase() === 'NO' ? 'no' : ''}">${escapeHtml(status || '-')}</td>
        <td>${details || '<span class="muted">-</span>'}</td>
        </tr>`;
    }).join('');

    if (!rows) return '';
    return `<div class="section">
        <h2>${escapeHtml(humanizeKey(sectionKey))}</h2>
        <table class="check-table">
        <tr><th class="sl">#</th><th class="question">Checkpoint</th><th class="status-col">Status</th><th>Details</th></tr>
        ${rows}
        </table>
    </div>`;
    }

    function buildAttachmentSection(attachmentLinks) {
    if (!attachmentLinks || !attachmentLinks.length) return '';
    const rows = attachmentLinks.map((link, index) => `<tr><th>Attachment ${index + 1}</th><td>${escapeHtml(link)}</td></tr>`).join('');
    return `<div class="section"><h2>Attachments</h2><table>${rows}</table></div>`;
    }

    function buildSignatureSection() {
    return `<div class="signature-section">
        <div class="signature-grid">
        <div class="signature-box">
            <div class="signature-line">Auditor Signature</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Authorized Signature</div>
        </div>
        </div>
    </div>`;
    }

    function getLogoDataUrl() {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(FIRE_AUDIT_CONFIG.LOGO_SHEET);

    const sheetLogoUrl = sheet ? sheet.getRange('A1').getDisplayValue() : '';
    const logoUrls = uniqueClean([
        sheetLogoUrl,
        FIRE_AUDIT_CONFIG.DEFAULT_LOGO_URL,
        FIRE_AUDIT_CONFIG.LOGO_FALLBACK_URL
    ]).map(normalizeImageUrl);
    let blob = null;

    for (let i = 0; i < logoUrls.length; i += 1) {
        blob = getImageBlobFromUrl(logoUrls[i]);
        if (blob) break;
    }

    if (!blob) return '';

    return `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
    }

    function getImageBlobFromUrl(url) {
    const driveFileId = extractDriveFileId(url);
    const candidates = driveFileId
        ? [
            getDriveDownloadUrl(driveFileId),
            getDriveThumbnailUrl(driveFileId),
            url
        ]
        : [url];

    if (driveFileId) {
        try {
        const driveBlob = DriveApp.getFileById(driveFileId).getBlob();
        const preparedDriveBlob = prepareImageBlob(driveBlob);
        if (preparedDriveBlob) return preparedDriveBlob;
        } catch (error) {
        // Public URL fallback below.
        }
    }

    for (let i = 0; i < candidates.length; i += 1) {
        try {
        const response = UrlFetchApp.fetch(candidates[i], {
            followRedirects: true,
            muteHttpExceptions: true
        });
        const blob = response.getBlob();
        const preparedBlob = prepareImageBlob(blob);
        if (preparedBlob) return preparedBlob;
        } catch (error) {
        // Try next candidate.
        }
    }

    return null;
    }

    function isImageBlob(blob) {
    return blob && String(blob.getContentType() || '').indexOf('image/') === 0;
    }

    function prepareImageBlob(blob) {
    if (!blob) return null;
    if (isImageBlob(blob)) return blob;

    const name = String(blob.getName() || '').toLowerCase();
    if (name.endsWith('.png')) return blob.setContentType('image/png');
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return blob.setContentType('image/jpeg');
    if (name.endsWith('.gif')) return blob.setContentType('image/gif');

    return null;
    }

    function getDriveImageBlob(fileId) {
    return UrlFetchApp.fetch(getDriveDownloadUrl(fileId), {
        followRedirects: true,
        muteHttpExceptions: true
    }).getBlob();
    }

    function getDriveThumbnailUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
    }

    function normalizeImageUrl(url) {
    if (!url) return '';
    if (url.indexOf('res.cloudinary.com') === -1) return url;
    return url
        .replace('/f_auto/', '/')
        .replace('/q_auto/f_auto/', '/q_auto/')
        .replace('/f_auto/q_auto/', '/q_auto/');
    }

    function getDriveDownloadUrl(fileId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    }

    function extractDriveFileId(url) {
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/,
        /open\?id=([a-zA-Z0-9_-]+)/
    ];
    for (let i = 0; i < patterns.length; i += 1) {
        const match = String(url).match(patterns[i]);
        if (match && match[1]) return match[1];
    }
    return '';
    }

    function formatDateForReport(value) {
    if (!value) return 'Audit Date';
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd MMM yyyy');
    }

    function formatDateShortForReport(value) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd-MM-yyyy');
    }

    function formatReportValue(value, key) {
    if (Array.isArray(value)) return value.map(item => formatReportValue(item, key)).join(', ');
    if (isDateField(key)) return formatDateShortForReport(value);
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value || '');
    }

    function isDateField(key) {
    return /date/i.test(String(key || ''));
    }

    function humanizeKey(key) {
    return String(key || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function isEmptyValue(value) {
    return value === null || value === undefined || String(value).trim() === '';
    }

    function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function parsePayload(e) {
    if (!e || !e.postData || !e.postData.contents) {
        throw new Error('No payload received.');
    }
    return JSON.parse(e.postData.contents);
    }

    function ensureHeaders(sheet, desiredHeaders) {
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, desiredHeaders.length).setValues([desiredHeaders]);
        sheet.setFrozenRows(1);
        return;
    }

    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(Boolean);
    const missing = desiredHeaders.filter(header => !currentHeaders.includes(header));
    if (!missing.length) return;

    sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
    }

    function getSpreadsheet() {
    if (FIRE_AUDIT_CONFIG.SPREADSHEET_ID) {
        return SpreadsheetApp.openById(FIRE_AUDIT_CONFIG.SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
    }

    function getOrCreateSheet(ss, name) {
    return ss.getSheetByName(name) || ss.insertSheet(name);
    }

    // Sheet tab names are often edited by hand. Make dropdown lookup tolerant
    // of differences such as "Dropdown", "DROP DOWN", or trailing spaces.
    function getSheetByLooseName(ss, name) {
    const expected = normalizeSheetName(name);
    return ss.getSheets().find(sheet => normalizeSheetName(sheet.getName()) === expected) || null;
    }

    function normalizeSheetName(name) {
    return String(name || '').replace(/[\s_-]+/g, '').toLowerCase();
    }

    function getOrCreateFolder(name) {
    const folders = DriveApp.getFoldersByName(name);
    return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
    }

    function uniqueClean(values) {
    return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
    }

    function flattenObject(value, prefix, output) {
    const result = output || {};
    Object.keys(value || {}).forEach(key => {
        if (key === 'attachments') return;

        const nextValue = value[key];
        const nextKey = prefix ? `${prefix}.${key}` : key;

        if (nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
        flattenObject(nextValue, nextKey, result);
        return;
        }

        result[nextKey] = Array.isArray(nextValue) ? JSON.stringify(nextValue) : nextValue;
    });
    return result;
    }

    function jsonResponse(data, callback) {
    const json = JSON.stringify(data);
    // JSONP is used only by the separately hosted static frontend as a
    // fallback when a browser/network blocks a cross-origin Apps Script fetch.
    // Restrict the callback name so request data can never become executable.
    if (/^[A-Za-z_$][0-9A-Za-z_$]{0,100}$/.test(String(callback || ''))) {
        return ContentService
        .createTextOutput(`${callback}(${json});`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
        .createTextOutput(json)
        .setMimeType(ContentService.MimeType.JSON);
    }
    function savePdfRecord(file, payload, timestamp) {

  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, FIRE_AUDIT_CONFIG.PDF_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Factory',
      'PDF Name',
      'View URL',
      'Download URL'
    ]);
  }

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  const basic = payload.basicDetails || {};

  sheet.appendRow([
    timestamp,
    basic.factoryName || '',
    file.getName(),
    file.getUrl(),
    getDriveDownloadUrl(file.getId())
  ]);

  CacheService.getScriptCache().remove(CACHE_KEYS.PDF_LIST);
}

function deletePdfById(pdfId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(FIRE_AUDIT_CONFIG.PDF_SHEET);

    if (!sheet || sheet.getLastRow() < 2) {
      return { ok: false, message: 'No PDFs found.' };
    }

    const rowNumber = parseInt(pdfId, 10);
    if (isNaN(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return { ok: false, message: 'Invalid PDF ID.' };
    }

    sheet.deleteRow(rowNumber);
    CacheService.getScriptCache().remove(CACHE_KEYS.PDF_LIST);
    return { ok: true, message: 'PDF deleted successfully.' };
  } catch (error) {
    return { ok: false, message: error.message || 'Error deleting PDF.' };
  }
}

function getRecentPdfs() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEYS.PDF_LIST);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      cache.remove(CACHE_KEYS.PDF_LIST);
    }
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(FIRE_AUDIT_CONFIG.PDF_SHEET);

  if (!sheet || sheet.getLastRow() < 2) {
    try {
      cache.put(CACHE_KEYS.PDF_LIST, JSON.stringify([]), CACHE_TTL_SECONDS);
    } catch (error) {
      // CacheService is optional; an empty result is still valid.
    }
    return [];
  }

  const lastRow = sheet.getLastRow();
  const values = sheet
    .getRange(2, 1, lastRow - 1, 5)
    .getValues();

  const result = values
    .reverse()
    .map((row, index) => {
      const actualRowNumber = lastRow - index;
      return {
        id: String(actualRowNumber),
        timestamp: row[0],
        factory: row[1],
        name: row[2],
        viewUrl: row[3],
        downloadUrl: row[4]
      };
    })
    .slice(0, 20);

  try {
    cache.put(CACHE_KEYS.PDF_LIST, JSON.stringify(result), CACHE_TTL_SECONDS);
  } catch (error) {
    // CacheService has a size limit; the PDF list still works without cache.
  }
  return result;
}
// ── Daily Task: sign in / sign out log (wired into doPost above) ──
function dailyTask(payload) {
  return saveDailyTask(payload);
}

function saveDailyTask(payload) {
  if (!payload || !payload.unit || !payload.floor || !payload.observationArea || !payload.priority) {
    throw new Error('Unit, Floor, Observation Area, and Priority are all required.');
  }

  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, FIRE_AUDIT_CONFIG.DAILY_SHEET);
  const now = new Date();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Unit',
      'Floor',
      'Observation Area',
      'Priority',
      'Sign In Time',
      'Sign Out Time',
      'Duration',
      'Attachments',
      'Remarks',
      'Action',
      'Action Timestamp'
    ]);
    sheet.setFrozenRows(1);
  } else {
    ensureDailyAttachmentsHeader(sheet);
    ensureDailyExtraHeaders(sheet);
  }

  const attachmentLinks = saveDailyAttachments(payload.attachments || [], payload.unit, now);

  const newRow = sheet.getLastRow() + 1;

  // IMPORTANT: force columns F/G/H (Sign In Time, Sign Out Time, Duration)
  // to Plain Text BEFORE writing. Otherwise Sheets auto-detects strings like
  // "12-08-2026 16:40:50" or "00:00:09" as real date/time values and
  // silently rewrites them — which is why they were showing up as garbled
  // "Sat Dec 30 1899 00:00:09 GMT+0521" style values later.
  sheet.getRange(newRow, 6, 1, 3).setNumberFormat('@');

  sheet.getRange(newRow, 1, 1, 9).setValues([[
    now,
    payload.unit,
    payload.floor,
    payload.observationArea,
    payload.priority,
    String(payload.signInTime || ''),
    String(payload.signOutTime || ''),
    String(payload.duration || ''),
    attachmentLinks.join('\n')
  ]]);

  return {
    timestamp: now,
    row: newRow,
    attachmentCount: attachmentLinks.length
  };
}

// Adds an "Attachments" header to Daily Task sheets that were created
// before this feature existed, so old sheets don't break.
function ensureDailyAttachmentsHeader(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf('Attachments') === -1) {
    sheet.getRange(1, lastCol + 1).setValue('Attachments');
  }
}

// Adds "Remarks" (col J), "Action" (col K) and "Action Timestamp" (col L)
// headers to Daily Task sheets that were created before this feature
// existed, so old sheets/rows don't break.
function ensureDailyExtraHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, 12).getValues()[0];
  const wanted = [
    { col: 10, label: 'Remarks' },
    { col: 11, label: 'Action' },
    { col: 12, label: 'Action Timestamp' }
  ];
  wanted.forEach(function (item) {
    if (String(headers[item.col - 1] || '').trim() !== item.label) {
      sheet.getRange(1, item.col).setValue(item.label);
    }
  });
}

// Saves Daily Task photo attachments to Drive (same folder as audit
// attachments) and returns their shareable view links.
function saveDailyAttachments(files, unit, timestamp) {
  if (!files || !files.length) return [];

   const folder = getOrCreateFolder(FIRE_AUDIT_CONFIG.FILE_FOLDER_NAME);
  const label = [
    'DailyTask',
    unit || 'Factory',
    Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss')
  ].join('_').replace(/[^\w.-]+/g, '_');

  return files.map((file, index) => {
    if (!file || !file.data || !file.name) return '';
    const bytes = Utilities.base64Decode(file.data);
    const blob = Utilities.newBlob(bytes, file.mimeType || 'image/jpeg', `${label}_${index + 1}_${file.name}`);
    const created = folder.createFile(blob);
    created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return created.getUrl();
  }).filter(Boolean);
}

// Reads every row from the "Daily Task" sheet — used by both the report
// view (filterable table) and getDailyStats() below (today's summary).
function getDailyTaskData() {
  const ss = getSpreadsheet();
   const sheet = ss.getSheetByName(FIRE_AUDIT_CONFIG.DAILY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 12);
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const tz = Session.getScriptTimeZone();

  return values
    .map((row, idx) => {
      const rawTimestamp = row[0];
      let isoDate = '', dateDisplay = '';
      if (rawTimestamp instanceof Date && !isNaN(rawTimestamp.getTime())) {
        isoDate = Utilities.formatDate(rawTimestamp, tz, 'yyyy-MM-dd');
        dateDisplay = Utilities.formatDate(rawTimestamp, tz, 'dd-MM-yyyy');
      }
      const attachmentsRaw = String(row[8] || '').trim();
      const actionRaw = row[10];
      const actionDone = actionRaw === true ||
        String(actionRaw).trim().toUpperCase() === 'TRUE' ||
        String(actionRaw).trim().toUpperCase() === 'DONE';
      return {
        rowIndex: idx + 2,
        isoDate: isoDate,
        date: dateDisplay,
        unit: String(row[1] || '').trim(),
        floor: String(row[2] || '').trim(),
        observationArea: String(row[3] || '').trim(),
        priority: String(row[4] || '').trim(),
        signInTime: formatDailyTextCell(row[5], tz),
        signOutTime: formatDailyTextCell(row[6], tz),
        duration: formatDailyDurationCell(row[7], tz),
        attachments: attachmentsRaw ? attachmentsRaw.split('\n').filter(Boolean) : [],
        remarks: String(row[9] || '').trim(),
        actionDone: actionDone,
        actionTimestamp: formatDailyTextCell(row[11], tz)
      };
    })
    .filter(r => r.unit || r.floor || r.observationArea);
}

// ── Daily Task report: Remarks / Action(tick) / Action Timestamp ──
// Wired into doPost above (payload.action === 'dailyTaskUpdate'). Also
// exposed as a bare function so it works under google.script.run too.
function dailyTaskUpdate(payload) {
  return updateDailyTaskExtra(payload);
}

function updateDailyTaskExtra(payload) {
  if (!payload || !payload.rowIndex) {
    throw new Error('rowIndex is required.');
  }
  const rowIndex = parseInt(payload.rowIndex, 10);
  if (!rowIndex || rowIndex < 2) {
    throw new Error('Invalid rowIndex.');
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(FIRE_AUDIT_CONFIG.DAILY_SHEET);
  if (!sheet) throw new Error('Daily Task sheet not found.');
  if (rowIndex > sheet.getLastRow()) throw new Error('Row no longer exists.');

  ensureDailyAttachmentsHeader(sheet);
  ensureDailyExtraHeaders(sheet);

  if (payload.remarks !== undefined) {
    sheet.getRange(rowIndex, 10).setValue(String(payload.remarks || ''));
  }

  let actionTimestamp = '';
  if (payload.actionDone !== undefined) {
    const isDone = !!payload.actionDone;
    sheet.getRange(rowIndex, 11).setValue(isDone);
    if (isDone) {
      const tz = Session.getScriptTimeZone();
      actionTimestamp = Utilities.formatDate(new Date(), tz, 'd MMM, yyyy HH:mm:ss');
      sheet.getRange(rowIndex, 12).setValue(actionTimestamp);
    } else {
      sheet.getRange(rowIndex, 12).setValue('');
    }
  }

  return { rowIndex: rowIndex, actionTimestamp: actionTimestamp };
}

// Sign In / Sign Out cells should be plain text now, but old rows saved
// before the fix may still be real Date objects (Sheets auto-converted
// them). Handle both so old data displays correctly too.
function formatDailyTextCell(value, tz) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz, 'd MMM, yyyy HH:mm:ss');
  }
  return String(value || '').trim();
}

// Duration cells that got auto-converted by Sheets become a "time of day"
// value anchored to Sheets' epoch (Dec 30, 1899) — pull out just the
// HH:mm:ss part instead of the raw (and garbled) Date string.
function formatDailyDurationCell(value, tz) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz, 'HH:mm:ss');
  }
  return String(value || '').trim();
}

// Today's summary shown in the Daily Task header (factories visited + total time worked).
function getDailyStats() {
  const tz = Session.getScriptTimeZone();
  const todayIso = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const todaysRows = getDailyTaskData().filter(r => r.isoDate === todayIso);

  const factories = new Set(todaysRows.map(r => r.unit).filter(Boolean));
  const totalSeconds = todaysRows.reduce((sum, r) => sum + parseDurationStringToSeconds(r.duration), 0);

  return {
    factoriesVisited: factories.size,
    totalTime: formatSecondsAsClock(totalSeconds)
  };
}

function parseDurationStringToSeconds(duration) {
  const parts = String(duration || '').split(':').map(Number);
  if (parts.length !== 3 || parts.some(function (n) { return isNaN(n); })) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatSecondsAsClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// ── Report Dashboard: data + mark-done handlers (wired into doGet above) ──

function getReportData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEYS.REPORT_DATA);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      cache.remove(CACHE_KEYS.REPORT_DATA);
    }
  }

  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName('REPORT');

  if (!sheet || sheet.getLastRow() < 2) return [];

  const lastRow = sheet.getLastRow();

  // Read columns A–H (8 columns).
  // A=Audit Date, B=Unit, C=Location, D=File Link, E=Remarks,
  // F=STATUS, G=DONE marker (write-only, not displayed), H=Actual Date
  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

  const tz = Session.getScriptTimeZone();

  const result = values
    .map((row, idx) => {
      const rawDate = row[0];
      let isoDate = '', auditDate = '';

      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        isoDate   = Utilities.formatDate(rawDate, tz, 'yyyy-MM-dd');
        auditDate = Utilities.formatDate(rawDate, tz, 'dd-MM-yyyy');
      } else if (rawDate) {
        isoDate   = String(rawDate).trim();
        auditDate = String(rawDate).trim();
      }

      // Column H: Actual Date — stamped automatically when checkbox is clicked
      const rawActual = row[7];
      let actualDate = '';
      if (rawActual instanceof Date && !isNaN(rawActual.getTime())) {
        actualDate = Utilities.formatDate(rawActual, tz, 'dd-MM-yyyy');
      } else if (rawActual) {
        actualDate = String(rawActual).trim();
      }

      return {
        rowIndex   : idx + 2,                             // actual sheet row (header = row 1)
        auditDate  : auditDate,
        isoDate    : isoDate,
        unit       : String(row[1] || '').trim(),
        location   : String(row[2] || '').trim(),
        fileLink   : String(row[3] || '').trim(),
        remarks    : String(row[4] || '').trim(),
        status     : String(row[5] || '').trim(),
        isDone     : String(row[6] || '').trim().toUpperCase() === 'DONE',  // col G
        actualDate : actualDate                           // col H
      };
    })
    .filter(r => r.auditDate || r.unit || r.status);     // skip fully empty rows

  // The dashboard filters locally, so cache the compact JSON response.
  // This avoids repeatedly reopening and scanning the spreadsheet while the
  // user changes filters or the dashboard performs a background refresh.
  try {
    cache.put(CACHE_KEYS.REPORT_DATA, JSON.stringify(result), CACHE_TTL_SECONDS);
  } catch (error) {
    // CacheService has a size limit; the dashboard still works without cache.
  }

  return result;
}

function markReportDone(rowIndex) {
  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName('REPORT');
  if (!sheet) throw new Error('REPORT sheet not found');

  const tz        = Session.getScriptTimeZone();
  const now       = new Date();
  const timestamp = Utilities.formatDate(now, tz, 'dd-MM-yyyy');   // e.g. 26-05-26

  sheet.getRange(rowIndex, 7).setValue('DONE');       // col G — internal DONE marker
  sheet.getRange(rowIndex, 8).setValue(timestamp);    // col H — Actual Date (visible)
  CacheService.getScriptCache().remove(CACHE_KEYS.REPORT_DATA);
}

// ─── Mail Recipients: reads email IDs from DROPDOWN sheet Column C ───────────
function getMailRecipients() {
  const ss = getSpreadsheet();
  const sheet = getSheetByLooseName(ss, FIRE_AUDIT_CONFIG.DROPDOWN_SHEET);
  if (!sheet) return { emails: [], fromAddress: getSendingAddress() };

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return { emails: [], fromAddress: getSendingAddress() };

  // Column C = index 3. Read from row 1 to lastRow.
  const values = sheet.getRange(1, 3, lastRow, 1).getValues();

  const emails = uniqueClean(
    values
      .map(function(row) { return String(row[0] || '').trim(); })
      .filter(function(v) {
        // Basic email validation: must contain @ and a dot after @
        return v && EMAIL_PATTERN.test(v);
      })
  );

  return { emails: emails, fromAddress: getSendingAddress() };
}

// The Gmail address mail actually sends from — always the account that owns
///runs this script (i.e. whichever Google account this Apps Script project
// was written and deployed under). No alias configuration needed.
function getSendingAddress() {
  try {
    return Session.getEffectiveUser().getEmail() || '';
  } catch (error) {
    return '';
  }
}

// ─── Send observation mail via GmailApp (server-side) ────────────────────────
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Splits a comma-separated address string into a clean, de-duplicated list,
// validating every individual address. Supports both the old single-address
// format and the new multi-select (comma-separated) format from the client.
function parseRecipientList(value, label) {
  const parts = String(value || '')
    .split(',')
    .map(function (part) { return part.trim(); })
    .filter(Boolean);

  const seen = {};
  const unique = [];
  parts.forEach(function (part) {
    const key = part.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      unique.push(part);
    }
  });

  unique.forEach(function (address) {
    if (!EMAIL_PATTERN.test(address)) {
      throw new Error(`"${address}" is not a valid ${label} email address.`);
    }
  });

  return unique;
}

function sendObservationMailGas(payload) {
  const subject = String(payload.subject || 'Fire Audit Observation').trim();
  const body    = String(payload.body    || '').trim();
  const htmlBody = String(payload.htmlBody || body).trim();

  const toList = parseRecipientList(payload.to, 'To');
  const ccList = parseRecipientList(payload.cc, 'CC');

  if (!toList.length) throw new Error('At least one recipient (To) email address is required.');

  const to = toList.join(',');
  const cc = ccList.join(',');

  const options = {
    name: 'Fire Audit System',
    htmlBody: htmlBody,
    noReply: false
  };

  if (cc) options.cc = cc;

  const attachments = buildMailAttachments(payload.attachments);
  if (attachments.length) options.attachments = attachments;

  // GmailApp always sends from the Google account that owns/runs this
  // script — whichever Gmail account this Apps Script project was written
  // in. No "from" or alias override needed.
  GmailApp.sendEmail(to, subject, body, options);

  return { ok: true, message: 'Mail sent successfully.' };
}

// Converts the client's base64 attachment payloads (the same shape used for
// Daily Task photo attachments) into Blobs GmailApp can attach to the mail.
function buildMailAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];

  return rawAttachments
    .filter(function (file) { return file && file.data && file.name; })
    .map(function (file) {
      const bytes = Utilities.base64Decode(file.data);
      return Utilities.newBlob(bytes, file.mimeType || 'application/octet-stream', file.name);
    });
}
