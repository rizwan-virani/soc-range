/* SOC Range :: certs.data.js
 * CompTIA alignment. Maps every scenario and CTF challenge to CySA+ V4
 * (CS0-004) and Security+ (SY0-701) domains, and computes a readiness score
 * from the local gamification profile. Domain weights verified June 2026.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  // CySA+ V4 (CS0-004) domains and official weights.
  var CYSA = {
    code: "CS0-004",
    domains: [
      { id: "SO", name: "Security Operations", weight: 34 },
      { id: "VM", name: "Vulnerability Management", weight: 26 },
      { id: "IR", name: "Incident Response and Management", weight: 24 },
      { id: "RC", name: "Reporting and Communication", weight: 16 }
    ]
  };

  // Security+ SY0-701 domains and weights, used at the foundation tier.
  var SECPLUS = {
    code: "SY0-701",
    domains: [
      { id: "GSC", name: "General Security Concepts", weight: 12 },
      { id: "TVM", name: "Threats, Vulnerabilities, and Mitigations", weight: 22 },
      { id: "ARC", name: "Security Architecture", weight: 18 },
      { id: "OPS", name: "Security Operations", weight: 28 },
      { id: "GOV", name: "Security Program Management and Oversight", weight: 20 }
    ]
  };

  // Career pathway, current as of 2026 (CASP+ was renamed SecurityX in 2024).
  var PATHWAY = [
    { id: "secplus", name: "Security+", code: "SY0-701", note: "Foundation" },
    { id: "cysa", name: "CySA+", code: "CS0-004", note: "This capstone targets here" },
    { id: "securityx", name: "SecurityX", code: "CAS-005", note: "Expert level (formerly CASP+)" }
  ];

  // DoD 8140 / DCWF roles CySA+ supports.
  var DCWF = ["Cyber Defense Analyst (511)", "Incident Responder (531)"];

  // Scenario -> CySA domains, and -> Security+ domains.
  var SCN_CYSA = {
    "SC-T1-01": ["SO", "IR"], "SC-T1-02": ["SO"], "SC-T1-06": ["SO"],
    "SC-T2-01": ["SO", "IR", "RC"], "SC-T2-03": ["SO", "IR"], "SC-T2-05": ["IR", "RC"],
    "SC-T3-01": ["SO"], "SC-T3-02": ["SO"], "SC-AE-01": ["SO", "IR", "RC"], "SC-AE-02": ["SO", "IR"],
    "SC-T1-03": ["SO", "IR"], "SC-T1-04": ["SO", "VM"], "SC-T1-05": ["SO", "IR"],
    "SC-T2-02": ["SO", "IR"], "SC-T2-04": ["IR", "RC"], "SC-T2-06": ["IR", "RC"],
    "SC-T2-07": ["SO", "IR"], "SC-T3-03": ["SO"], "SC-T3-04": ["SO", "IR"],
    "SC-AE-03": ["VM", "IR", "RC"],
    "SC-T1-07": ["SO", "IR"], "SC-T1-08": ["SO"], "SC-T1-09": ["SO", "IR"], "SC-T1-10": ["SO"],
    "SC-T1-11": ["SO"], "SC-T1-12": ["SO", "IR"],
    "SC-T2-08": ["SO", "IR"], "SC-T2-09": ["IR", "RC"], "SC-T2-10": ["SO", "IR"], "SC-T2-11": ["IR", "RC"],
    "SC-T2-12": ["SO", "IR", "VM"], "SC-T2-13": ["SO", "IR"],
    "SC-T3-05": ["SO"], "SC-T3-06": ["SO", "IR"], "SC-T3-07": ["SO", "IR"], "SC-T3-08": ["SO"],
    "SC-AE-04": ["SO", "IR", "RC"], "SC-AE-05": ["SO", "IR"], "SC-AE-06": ["IR", "RC"], "SC-AE-07": ["SO", "IR", "VM"]
  };
  var SCN_SECPLUS = {
    "SC-T1-01": ["OPS", "TVM"], "SC-T1-02": ["TVM", "OPS"], "SC-T1-06": ["OPS"],
    "SC-T2-01": ["OPS", "TVM"], "SC-T2-03": ["OPS", "ARC"], "SC-T2-05": ["OPS", "GOV"],
    "SC-T3-01": ["OPS"], "SC-T3-02": ["OPS", "TVM"], "SC-AE-01": ["OPS", "GOV"], "SC-AE-02": ["OPS", "ARC"],
    "SC-T1-03": ["OPS", "TVM"], "SC-T1-04": ["OPS", "TVM"], "SC-T1-05": ["OPS"],
    "SC-T2-02": ["OPS", "ARC"], "SC-T2-04": ["OPS", "GOV"], "SC-T2-06": ["OPS", "GOV"],
    "SC-T2-07": ["OPS"], "SC-T3-03": ["OPS", "ARC"], "SC-T3-04": ["OPS", "ARC"],
    "SC-AE-03": ["OPS", "TVM", "GOV"],
    "SC-T1-07": ["OPS", "TVM"], "SC-T1-08": ["OPS"], "SC-T1-09": ["OPS"], "SC-T1-10": ["OPS", "ARC"],
    "SC-T1-11": ["OPS", "TVM"], "SC-T1-12": ["OPS"],
    "SC-T2-08": ["OPS"], "SC-T2-09": ["OPS", "GOV"], "SC-T2-10": ["OPS", "ARC"], "SC-T2-11": ["OPS", "GOV"],
    "SC-T2-12": ["OPS", "TVM", "ARC"], "SC-T2-13": ["OPS", "TVM"],
    "SC-T3-05": ["OPS"], "SC-T3-06": ["OPS", "ARC"], "SC-T3-07": ["OPS"], "SC-T3-08": ["OPS", "ARC"],
    "SC-AE-04": ["OPS", "GOV"], "SC-AE-05": ["OPS", "ARC"], "SC-AE-06": ["OPS", "GOV"], "SC-AE-07": ["OPS", "ARC", "TVM"]
  };

  // Compute readiness per CySA domain from a gamification profile and the
  // scenario + CTF libraries. Returns {SO:{pct,done,total}, ...} and overall.
  function readiness(profile, scenarios, ctf) {
    var bucket = {};
    CYSA.domains.forEach(function (d) { bucket[d.id] = { vals: [], done: 0, total: 0 }; });

    (scenarios || []).forEach(function (s) {
      var doms = SCN_CYSA[s.id] || [];
      var score = profile.scenarios[s.id];
      doms.forEach(function (d) {
        bucket[d].total += 1;
        bucket[d].vals.push(score != null ? score : 0);
        if (score != null) bucket[d].done += 1;
      });
    });
    (ctf || []).forEach(function (c) {
      (c.cysa || []).forEach(function (d) {
        if (!bucket[d]) return;
        var solved = profile.flags.indexOf(c.id) >= 0;
        bucket[d].total += 1;
        bucket[d].vals.push(solved ? 100 : 0);
        if (solved) bucket[d].done += 1;
      });
    });

    var out = {}, overall = 0, wsum = 0;
    CYSA.domains.forEach(function (d) {
      var b = bucket[d.id];
      var pct = b.vals.length ? Math.round(b.vals.reduce(function (a, v) { return a + v; }, 0) / b.vals.length) : 0;
      out[d.id] = { pct: pct, done: b.done, total: b.total };
      overall += pct * d.weight; wsum += d.weight;
    });
    out.overall = wsum ? Math.round(overall / wsum) : 0;
    return out;
  }

  SOC.certs = {
    CYSA: CYSA, SECPLUS: SECPLUS, PATHWAY: PATHWAY, DCWF: DCWF,
    scenarioCysa: function (id) { return SCN_CYSA[id] || []; },
    scenarioSecplus: function (id) { return SCN_SECPLUS[id] || []; },
    domainName: function (id) {
      var all = CYSA.domains.concat(SECPLUS.domains);
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].name;
      return id;
    },
    readiness: readiness
  };
})();
