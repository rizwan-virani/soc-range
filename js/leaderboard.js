/* SOC Range :: leaderboard.js
 * Class leaderboard client. Posts a student's score to a shared store and
 * reads it back to draw the board. The shared store is a Google Apps Script
 * Web App bound to a Google Sheet (free, no API key on the student side).
 *
 * If no endpoint is configured, the board runs in local preview mode: scores
 * stay in this browser only, so the page still works for a demo.
 *
 * --------------------------------------------------------------------------
 * INSTRUCTOR CONFIG. Edit the three values below, then redeploy the site.
 *   ENDPOINT : the /exec URL of your deployed Apps Script Web App.
 *   SECRET   : optional. If set, must match the SECRET in Code.gs. It signs
 *              submissions so casual editing of the URL does not spoof scores.
 *              This deters tampering, it does not make it impossible. Grade on
 *              the verified completion codes, not the board.
 *   SECTION  : optional default section or class period label, e.g. "Fall-AM".
 * --------------------------------------------------------------------------
 */
(function () {
  var SOC = self.SOC || (self.SOC = {});

  var CONFIG = {
    ENDPOINT: "",          // e.g. "https://script.google.com/macros/s/AKfy.../exec"
    SECRET: "",            // optional shared secret, must match Code.gs
    SECTION: ""            // optional default section label
  };

  var LOCAL_KEY = "soc.leaderboard.local.v1";
  var HANDLE_KEY = "soc.leaderboard.handle";

  function configured() { return !!CONFIG.ENDPOINT; }

  function getHandle() {
    var h = "";
    try { h = (localStorage.getItem(HANDLE_KEY) || "").trim(); } catch (e) {}
    if (!h) { try { h = (localStorage.getItem("soc.analyst") || "").trim(); } catch (e) {} }
    return h;
  }
  function setHandle(h) { try { localStorage.setItem(HANDLE_KEY, String(h || "").trim()); } catch (e) {} }
  function getSection() {
    var s = "";
    try { s = (localStorage.getItem("soc.leaderboard.section") || "").trim(); } catch (e) {}
    return s || CONFIG.SECTION || "";
  }
  function setSection(s) { try { localStorage.setItem("soc.leaderboard.section", String(s || "").trim()); } catch (e) {} }

  function countPrefix(flags, prefix) {
    var n = 0;
    for (var i = 0; i < flags.length; i++) if (String(flags[i]).indexOf(prefix) === 0) n++;
    return n;
  }

  // Build the score payload from the gamification profile.
  function snapshot() {
    var p = (SOC.gam && SOC.gam.get()) || { xp: 0, scenarios: {}, flags: [], badges: [], streak: { best: 0 } };
    var flags = p.flags || [];
    var detect = countPrefix(flags, "detect:");
    var response = countPrefix(flags, "response:");
    var splunk = countPrefix(flags, "splunk:");
    var ctf = flags.length - detect - response - splunk;
    var rank = (SOC.gam && SOC.gam.rankFor) ? SOC.gam.rankFor(p.xp).title : "";
    return {
      handle: getHandle(),
      section: getSection(),
      xp: p.xp || 0,
      rank: rank,
      scenarios: Object.keys(p.scenarios || {}).length,
      flags: flags.length,
      detect: detect,
      response: response,
      splunk: splunk,
      ctf: ctf < 0 ? 0 : ctf,
      badges: (p.badges || []).length,
      streak: (p.streak && p.streak.best) || 0,
      ts: Date.now()
    };
  }

  // HMAC-SHA256 hex, used only if a SECRET is configured.
  function hmacHex(secret, msg) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      .then(function (key) { return crypto.subtle.sign("HMAC", key, enc.encode(msg)); })
      .then(function (sig) {
        return Array.prototype.map.call(new Uint8Array(sig), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
  }

  function canonical(s) { return s.handle + "|" + s.xp + "|" + s.ts; }

  // ---- local fallback board ----
  function localAll() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch (e) { return {}; }
  }
  function localUpsert(s) {
    var all = localAll();
    var key = (s.handle || "anon").toLowerCase();
    var prev = all[key];
    if (!prev || s.xp >= prev.xp) all[key] = { handle: s.handle, section: s.section, xp: s.xp, rank: s.rank,
      scenarios: s.scenarios, flags: s.flags, detect: s.detect, badges: s.badges, streak: s.streak, updated: new Date().toISOString() };
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function localRows() {
    var all = localAll(), out = [];
    for (var k in all) if (all.hasOwnProperty(k)) out.push(all[k]);
    return out;
  }

  // ---- submit ----
  function submit() {
    var s = snapshot();
    if (!s.handle) return Promise.resolve({ ok: false, error: "Set a display name first." });
    localUpsert(s); // always keep a local copy
    if (!configured()) return Promise.resolve({ ok: true, local: true });

    var send = function () {
      // text/plain body keeps this a simple request, so no CORS preflight.
      return fetch(CONFIG.ENDPOINT, { method: "POST", body: JSON.stringify(s) })
        .then(function (r) { return r.json(); })
        .then(function (j) { return j && j.ok ? { ok: true } : { ok: false, error: (j && j.error) || "Server rejected the score." }; })
        .catch(function (e) { return { ok: false, error: "Could not reach the leaderboard. Saved locally.", network: true }; });
    };

    if (CONFIG.SECRET) {
      return hmacHex(CONFIG.SECRET, canonical(s)).then(function (sig) { s.sig = sig; return send(); });
    }
    return send();
  }

  // ---- fetch board ----
  function fetchTop(n) {
    n = n || 100;
    if (!configured()) return Promise.resolve({ ok: true, local: true, rows: sortRows(localRows()).slice(0, n) });
    var url = CONFIG.ENDPOINT + (CONFIG.ENDPOINT.indexOf("?") >= 0 ? "&" : "?") + "action=top&n=" + n;
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) { return { ok: true, rows: sortRows((j && j.rows) || []).slice(0, n) }; })
      .catch(function (e) { return { ok: true, fallback: true, rows: sortRows(localRows()).slice(0, n) }; });
  }

  function sortRows(rows) {
    return rows.slice().sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); });
  }

  SOC.leaderboard = {
    configured: configured,
    getHandle: getHandle, setHandle: setHandle,
    getSection: getSection, setSection: setSection,
    snapshot: snapshot, submit: submit, fetchTop: fetchTop, sortRows: sortRows
  };
})();
