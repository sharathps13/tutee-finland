/**
 * Tutee Connect — website leads → Google Sheets + email.
 *
 * Paste this into the Apps Script project bound to the "Website Leads"
 * spreadsheet (Extensions → Apps Script). Setup steps are in
 * apps-script/README.md next to this file.
 *
 * The landing page never calls this script directly. The form posts to the
 * site's own /api/enquiry function, which forwards the lead here with a shared
 * token, so the web-app URL and token stay out of the browser.
 *
 * Each lead becomes one row in the "Finland Leads" tab, with the same columns
 * as the sheet: Date, Time, Full Name, Phone Number, Email, State, Shortlisted
 * Universities, Course, Lead Source, Preferred Call Time. It is also emailed,
 * neatly formatted, to business@tuteeconnect.com with Reply-To set to the student.
 */

var MAIL_TO = 'business@tuteeconnect.com';
var TIME_ZONE = 'Asia/Kolkata';
var DEFAULT_TAB = 'Finland Leads';
var HEADERS = ['Date', 'Time', 'Full Name', 'Phone Number', 'Email', 'State',
  'Shortlisted Universities', 'Course', 'Lead Source', 'Preferred Call Time'];
var WIDTHS = [100, 90, 180, 150, 230, 150, 320, 240, 260, 190];
var HEADER_BG = '#0b3d3a';

/** Run once from the editor: creates and formats the Finland Leads tab. */
function setupFinlandLeads() {
  var sheet = getLeadsSheet_(DEFAULT_TAB);
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  return 'Ready: ' + sheet.getName();
}

/** Run once from the editor to store the shared token (paste your own value). */
function setToken() {
  var token = 'PASTE-A-LONG-RANDOM-TOKEN-HERE';
  if (/PASTE/.test(token)) throw new Error('Replace the placeholder with your own token first.');
  PropertiesService.getScriptProperties().setProperty('LEADS_TOKEN', token);
  return 'Token saved.';
}

/** Web-app entry point: the site's /api/enquiry function POSTs JSON here. */
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return reply_(false, 'Bad JSON'); }

  var token = PropertiesService.getScriptProperties().getProperty('LEADS_TOKEN');
  if (!token || body.token !== token) return reply_(false, 'Unauthorised');

  var lead = normalise_(body);
  if (!lead.name || !lead.email) return reply_(false, 'Missing name or email');

  var now = new Date();
  var row = [
    Utilities.formatDate(now, TIME_ZONE, 'dd/MM/yyyy'),
    Utilities.formatDate(now, TIME_ZONE, 'hh:mm a'),
    lead.name, lead.phone, lead.email, lead.state, lead.shortlist,
    lead.course, lead.source, lead.callTime
  ].map(safeCell_);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    getLeadsSheet_(lead.tab).appendRow(row);
  } finally {
    lock.releaseLock();
  }

  var mailed = true;
  try { sendLeadEmail_(lead, row); } catch (err) { mailed = false; console.error('mail failed: ' + err); }
  return reply_(true, 'Saved', { mailed: mailed });
}

/** Health check, so the setup can be tested from a browser. */
function doGet() {
  return reply_(true, 'Tutee Connect leads endpoint is running.');
}

/* ------------------------------------------------------------- helpers */

function normalise_(b) {
  var s = function (v, n) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 300); };
  var country = s(b.country, 40);
  return {
    tab: country ? country + ' Leads' : DEFAULT_TAB,
    country: country,
    name: s(b.name, 120),
    phone: s(b.phone, 40),
    email: s(b.email, 200),
    state: s(b.state, 80) || '—',
    shortlist: s(b.shortlist, 1500) || '—',
    course: s(b.course, 300) || '—',
    source: s(b.lead_source, 300) || 'Website',
    callTime: s(b.call_time, 80) || 'Not specified',
    interest: s(b.destination, 600),
    page: s(b.page, 200)
  };
}

/** Text that starts with = + - @ would be read as a formula (a "+91 …" phone
 *  number included), so it is stored as plain text. */
function safeCell_(v) {
  var t = String(v == null ? '' : v);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

/** The leads tab, created and formatted on first use. */
function getLeadsSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;

  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setBackground(HEADER_BG).setFontColor('#ffffff').setFontWeight('bold')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
  WIDTHS.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).setNumberFormat('@').setVerticalAlignment('top').setWrap(true);
  sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
  var extra = sheet.getMaxColumns() - HEADERS.length;
  if (extra > 0) sheet.deleteColumns(HEADERS.length + 1, extra);
  return sheet;
}

function sendLeadEmail_(lead, row) {
  var rows = HEADERS.map(function (h, i) { return [h, String(row[i]).replace(/^'/, '')]; });
  if (lead.interest) rows.push(['Interested In', lead.interest]);
  if (lead.page) rows.push(['Submitted From', lead.page]);

  var cells = rows.map(function (r, i) {
    return '<tr>' +
      '<td style="padding:10px 14px;border-bottom:1px solid #e6ece9;background:' + (i % 2 ? '#ffffff' : '#f6f9f8') + ';font-weight:600;color:#0b3d3a;white-space:nowrap;vertical-align:top;width:190px">' + esc_(r[0]) + '</td>' +
      '<td style="padding:10px 14px;border-bottom:1px solid #e6ece9;background:' + (i % 2 ? '#ffffff' : '#f6f9f8') + ';color:#1f2937;vertical-align:top">' + esc_(r[1]) + '</td>' +
      '</tr>';
  }).join('');

  var title = (lead.country || 'Finland') + ' Landing Page';
  var html =
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937">' +
      '<div style="background:' + HEADER_BG + ';color:#ffffff;padding:18px 22px;border-radius:12px 12px 0 0">' +
        '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">New lead · ' + esc_(title) + '</div>' +
        '<div style="font-size:20px;font-weight:700;margin-top:4px">' + esc_(lead.name) + '</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e6ece9;border-top:0">' + cells + '</table>' +
      '<p style="font-size:12px;color:#6b7280;margin:14px 2px">Reply to this email to answer ' + esc_(lead.name) + ' directly. ' +
        'This lead is also saved in the "' + esc_(lead.tab) + '" tab of Website Leads.</p>' +
    '</div>';

  var text = ['New lead · ' + title, ''].concat(rows.map(function (r) { return r[0] + ': ' + r[1]; })).join('\n');

  MailApp.sendEmail({
    to: MAIL_TO,
    replyTo: lead.email,
    name: 'Tutee Connect Website',
    subject: 'New ' + (lead.country || 'Finland') + ' Lead – ' + lead.name,
    htmlBody: html,
    body: text
  });
}

function esc_(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function reply_(ok, message, extra) {
  var out = { success: ok, message: message };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
