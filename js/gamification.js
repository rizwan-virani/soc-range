/* SOC Range :: gamification.js
 * XP, ranks, daily streaks, badges, and a local profile. Fully client-side,
 * so it works on GitHub Pages with no backend. A live class leaderboard needs
 * shared storage, which the README covers as an optional upgrade.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});
  var KEY = "soc.gamification.v1";

  // Rank ladder. Index maps to a title once XP crosses the threshold.
  var RANKS = [
    { at: 0, title: "Recruit" },
    { at: 100, title: "SOC Analyst I" },
    { at: 300, title: "SOC Analyst II" },
    { at: 650, title: "Senior Analyst" },
    { at: 1100, title: "Threat Hunter" },
    { at: 1700, title: "Incident Lead" },
    { at: 2500, title: "SOC Lead" },
    { at: 3600, title: "Defense Architect" }
  ];

  // Badge catalog. `test` receives the profile and returns true when earned.
  var BADGES = [
    { id: "first_shift", name: "First Shift", icon: "▣", test: function (p) { return countScn(p) >= 1; } },
    { id: "first_blood_ctf", name: "First Flag", icon: "⚑", test: function (p) { return p.flags.length >= 1; } },
    { id: "ransomware", name: "Ransomware Contained", icon: "✸", test: function (p) { return p.scenarios["SC-T2-01"] != null; } },
    { id: "hunter", name: "Threat Hunter", icon: "◎", test: function (p) { return p.scenarios["SC-T3-01"] != null || p.scenarios["SC-T3-02"] != null; } },
    { id: "cloud_id", name: "Cloud and Identity", icon: "☁", test: function (p) { return p.scenarios["SC-AE-01"] != null || p.scenarios["SC-AE-02"] != null; } },
    { id: "perfect", name: "Flawless Shift", icon: "★", test: function (p) { return Object.keys(p.scenarios).some(function (k) { return p.scenarios[k] >= 95; }); } },
    { id: "five_flags", name: "Flag Runner", icon: "⚐", test: function (p) { return p.flags.length >= 5; } },
    { id: "ten_flags", name: "CTF Operator", icon: "⛿", test: function (p) { return p.flags.length >= 10; } },
    { id: "streak5", name: "5-Day Streak", icon: "♦", test: function (p) { return p.streak.best >= 5; } },
    { id: "all_tiers", name: "Full Spectrum", icon: "❖", test: function (p) { return hasTiers(p); } },
    { id: "grc_analyst", name: "GRC Analyst", icon: "§", test: function (p) { return Object.keys(p.scenarios).some(function (k) { return k.indexOf("SC-GRC") === 0; }); } }
  ];

  function countScn(p) { return Object.keys(p.scenarios).length; }
  function hasTiers(p) {
    var t = { T1: 0, T2: 0, T3: 0, AE: 0 };
    Object.keys(p.scenarios).forEach(function (id) {
      if (id.indexOf("SC-T1") === 0) t.T1 = 1;
      else if (id.indexOf("SC-T2") === 0) t.T2 = 1;
      else if (id.indexOf("SC-T3") === 0) t.T3 = 1;
      else if (id.indexOf("SC-AE") === 0) t.AE = 1;
    });
    return t.T1 && t.T2 && t.T3 && t.AE;
  }

  function fresh() {
    return { xp: 0, scenarios: {}, flags: [], badges: [],
      streak: { count: 0, best: 0, lastDay: null }, history: [] };
  }
  function load() {
    try { var r = localStorage.getItem(KEY); return r ? JSON.parse(r) : fresh(); }
    catch (e) { return fresh(); }
  }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }

  function rankFor(xp) {
    var r = RANKS[0], i;
    for (i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].at) r = RANKS[i];
    return r;
  }
  function nextRank(xp) {
    for (var i = 0; i < RANKS.length; i++) if (xp < RANKS[i].at) return RANKS[i];
    return null;
  }

  function dayStamp(d) { d = d || new Date(); return d.toISOString().slice(0, 10); }

  function touchStreak(p) {
    var today = dayStamp();
    if (p.streak.lastDay === today) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    p.streak.count = (p.streak.lastDay === dayStamp(y)) ? p.streak.count + 1 : 1;
    p.streak.best = Math.max(p.streak.best || 0, p.streak.count);
    p.streak.lastDay = today;
  }

  function recheckBadges(p) {
    var earned = [];
    BADGES.forEach(function (b) {
      if (p.badges.indexOf(b.id) < 0 && b.test(p)) { p.badges.push(b.id); earned.push(b); }
    });
    return earned;
  }

  function addXp(p, amount, reason) {
    p.xp += amount;
    p.history.unshift({ at: Date.now(), xp: amount, reason: reason });
    if (p.history.length > 100) p.history.pop();
  }

  // Public API -----------------------------------------------------------
  var api = {
    RANKS: RANKS, BADGES: BADGES,
    get: load,
    badgeById: function (id) { for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) return BADGES[i]; return null; },
    rankFor: rankFor, nextRank: nextRank,

    completeScenario: function (id, score) {
      var p = load();
      touchStreak(p);
      var prev = p.scenarios[id] || 0;
      if (score > prev) p.scenarios[id] = score;
      addXp(p, Math.round(score * 1.5), "Shift " + id + " scored " + score + "%");
      var nb = recheckBadges(p);
      save(p);
      return { profile: p, newBadges: nb };
    },

    captureFlag: function (challengeId, points) {
      var p = load();
      touchStreak(p);
      if (p.flags.indexOf(challengeId) >= 0) return { profile: p, newBadges: [], already: true };
      p.flags.push(challengeId);
      addXp(p, points, "Captured flag " + challengeId);
      var nb = recheckBadges(p);
      save(p);
      return { profile: p, newBadges: nb };
    },

    touch: function () { var p = load(); touchStreak(p); save(p); return p; }
  };

  SOC.gam = api;
})();
