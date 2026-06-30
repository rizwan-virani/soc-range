/* SOC Range :: state.js
 * Durable shift state in localStorage, plus signed completion codes a student
 * can paste into Blackboard. The course secret lives client-side, so codes are a
 * low-stakes integrity signal, not a cryptographic guarantee. Rotate per term.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  var COURSE_ID = "BAT-CYBR-CAP";
  var COURSE_SECRET = "sjc-bvhn-2026-rotate-me"; // change every term
  var SCHEMA = 1;

  function keyFor(studentId, scenarioId) {
    return "soc." + COURSE_ID + "." + studentId + "." + scenarioId;
  }

  function load(studentId, scenarioId) {
    try {
      var raw = localStorage.getItem(keyFor(studentId, scenarioId));
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (st.schemaVersion !== SCHEMA) st = migrate(st);
      return st;
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    state.lastSavedAt = Date.now();
    try {
      localStorage.setItem(keyFor(state.studentId, state.scenarioId), JSON.stringify(state));
      return true;
    } catch (e) {
      return false; // storage full or disabled; caller keeps in-memory copy
    }
  }

  function migrate(old) {
    old.schemaVersion = SCHEMA;
    return old;
  }

  function freshState(studentId, scenario) {
    return {
      schemaVersion: SCHEMA,
      studentId: studentId,
      scenarioId: scenario.id,
      seed: scenario.seed,
      startedAt: Date.now(),
      lastSavedAt: Date.now(),
      status: "in_progress",
      tickets: [],
      timeline: [],
      pinned: [],
      notes: "",
      playbook: {},
      answers: {},
      iocsFound: [],
      findings: {},
      intelRevealed: false,
      hintsUsed: 0,
      score: null
    };
  }

  // Base32 (Crockford) for human-typable codes.
  function toBase32(bytes) {
    var alpha = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    var out = "", bits = 0, val = 0;
    for (var i = 0; i < bytes.length; i++) {
      val = (val << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        out += alpha[(val >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += alpha[(val << (5 - bits)) & 31];
    return out;
  }

  async function completionCode(scenarioId, studentId, score) {
    var canonical = [scenarioId, studentId.trim().toLowerCase(), String(score)].join("|");
    var keyData = new TextEncoder().encode(COURSE_SECRET);
    var key = await crypto.subtle.importKey("raw", keyData,
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    var sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical));
    var bytes = new Uint8Array(sig).slice(0, 6);
    var code = toBase32(bytes);
    return scenarioId + "-" + code.slice(0, 4) + "-" + code.slice(4, 8);
  }

  async function verifyCode(scenarioId, studentId, score, code) {
    var expected = await completionCode(scenarioId, studentId, score);
    return expected.toUpperCase() === String(code).trim().toUpperCase();
  }

  SOC.state = {
    COURSE_ID: COURSE_ID,
    load: load, save: save, freshState: freshState,
    completionCode: completionCode, verifyCode: verifyCode
  };
})();
