/* SOC Range :: tour.js
 * Launcher orientation. Defines the steps and hands them to the shared
 * orientation engine (js/orient.js). Auto-offered once per browser, and
 * replayable from the "Take the 60-second tour" button.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});
  if (!SOC.orient) return;

  var STEPS = [
    { sel: null,
      title: "Welcome to SOC Range",
      body: "This is a hands-on Security Operations Center. You work realistic incidents for a simulated healthcare network, then write the deliverables a real analyst produces. Take a quick lap and you will know where everything lives." },
    { sel: "#signinCard",
      title: "1. Sign in first",
      body: "Type your name or student ID and click Save. Your name signs the completion code you turn in to Blackboard, so enter it the same way every time. Progress saves to this browser." },
    { sel: "#trainingGrid",
      title: "2. Warm up in the labs",
      body: "New to the tools? Start here. Write Sigma rules in the Detection Lab, make calls under a timer in the Live Response Simulator, run real SPL in the Splunk Lab, or grab points in the CTF arena." },
    { sel: "#tiers",
      title: "3. Run a graded shift",
      body: "The main event. One hundred incidents across four tiers. Tap a tier to open its shifts. Tier 1 is triage and the best place to begin. Each shift opens the analyst workstation with a CISO briefing." },
    { sel: "#dp-ref",
      title: "Deliverables and worked examples",
      body: "Every shift asks for written deliverables. The Reference, profile and tools section holds the Word templates, the playbooks, a worked example of each deliverable, your analyst profile, and the instructor console." },
    { sel: null,
      title: "One thing this is not",
      body: "It is not a real network and not a hacking tool. Everything is simulated for defensive training. The in-app work is step one of five. The written report, post-mortem, executive brief, and video debrief are the rest. You are ready. Pick a Tier 1 shift and start." }
  ];

  function init() {
    SOC.orient.attach({ id: "tour.v1", buttonId: "tourBtn", autoOnce: true, steps: STEPS });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Back-compat shim for anything that called SOC.tour previously.
  SOC.tour = { start: function () { SOC.orient.start({ id: "tour.v1", steps: STEPS }); }, end: function () { SOC.orient.end(); } };
})();
