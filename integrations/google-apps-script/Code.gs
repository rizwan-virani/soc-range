/****************************************************************************
 * SOC Range :: Class Leaderboard backend (Google Apps Script)
 *
 * This script turns a free Google Sheet into the shared store for the class
 * leaderboard. Students never see a key. You own all the data in your Sheet.
 *
 * ONE-TIME SETUP (about five minutes)
 * 1. Create a Google Sheet. Name it whatever you like.
 * 2. In the Sheet menu, choose Extensions, then Apps Script.
 * 3. Delete the sample code, paste this whole file, and Save.
 * 4. (Optional) Set SECRET below to a phrase, and put the SAME phrase in
 *    js/leaderboard.js. This signs submissions so the URL alone cannot be
 *    used to spoof scores. Leave it blank for an open board.
 * 5. Click Deploy, then New deployment. Choose type Web app.
 *      Description: SOC Range leaderboard
 *      Execute as:  Me
 *      Who has access: Anyone
 *    Click Deploy, authorize when asked, and copy the Web app URL. It ends
 *    in /exec.
 * 6. Paste that /exec URL into ENDPOINT in js/leaderboard.js, then redeploy
 *    your GitHub Pages site.
 *
 * UPDATING THIS SCRIPT LATER
 * After editing, Deploy, then Manage deployments, edit the existing one, and
 * set Version to New version. Keep the same URL so you do not have to change
 * the site.
 *
 * RESETTING THE BOARD
 * Delete the rows in the "Leaderboard" tab, or delete the tab. It rebuilds.
 ****************************************************************************/

var SECRET = ""; // optional, must match SECRET in js/leaderboard.js
var SHEET_NAME = "Leaderboard";
var HEADERS = ["Handle", "Section", "XP", "Rank", "Shifts", "Flags", "Detect", "Response", "Badges", "Streak", "Updated"];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hmacHex_(secret, msg) {
  var raw = Utilities.computeHmacSha256Signature(msg, secret);
  return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? "0" + v : v; }).join("");
}

function rowsToObjects_(sh) {
  var values = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue;
    out.push({
      handle: r[0], section: r[1], xp: Number(r[2]) || 0, rank: r[3],
      scenarios: Number(r[4]) || 0, flags: Number(r[5]) || 0, detect: Number(r[6]) || 0,
      response: Number(r[7]) || 0, badges: Number(r[8]) || 0, streak: Number(r[9]) || 0, updated: r[10]
    });
  }
  out.sort(function (a, b) { return b.xp - a.xp; });
  return out;
}

function doGet(e) {
  try {
    var sh = getSheet_();
    var rows = rowsToObjects_(sh);
    var n = e && e.parameter && e.parameter.n ? parseInt(e.parameter.n, 10) : 100;
    return json_({ ok: true, rows: rows.slice(0, n) });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var handle = String(data.handle || "").trim().slice(0, 24);
    if (!handle) return json_({ ok: false, error: "Missing handle." });

    if (SECRET) {
      var expect = hmacHex_(SECRET, handle + "|" + (data.xp || 0) + "|" + (data.ts || 0));
      if (expect !== data.sig) return json_({ ok: false, error: "Bad signature." });
    }

    var xp = Number(data.xp) || 0;
    var sh = getSheet_();
    var values = sh.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase() === handle.toLowerCase()) { rowIndex = i + 1; break; }
    }

    var record = [
      handle, String(data.section || "").slice(0, 16), xp, String(data.rank || ""),
      Number(data.scenarios) || 0, Number(data.flags) || 0, Number(data.detect) || 0,
      Number(data.response) || 0, Number(data.badges) || 0, Number(data.streak) || 0,
      new Date().toISOString()
    ];

    if (rowIndex === -1) {
      sh.appendRow(record);
    } else {
      var existingXp = Number(values[rowIndex - 1][2]) || 0;
      if (xp >= existingXp) sh.getRange(rowIndex, 1, 1, record.length).setValues([record]);
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
