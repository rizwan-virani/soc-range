/* SOC Range :: intel.js
 * Analyst Academy content. The teaching scaffolding a new SOC analyst needs
 * before and during shifts. Pure data, rendered by app.js.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  SOC.academy = {
    intro: "A Security Operations Center defends an organization by watching, deciding, and acting. Your job on shift is to turn a flood of raw events into a small number of correct decisions. Read this before your first shift, and come back any time.",
    sections: [
      {
        title: "The three SOC tiers",
        body: "Tier 1 triages alerts and decides what is real and what to escalate. Tier 2 owns incidents end to end, runs playbooks, and contains threats. Tier 3 hunts for threats that no alert caught. You will practice all three. Knowing which hat you are wearing changes how you work."
      },
      {
        title: "The alert lifecycle",
        body: "Every alert moves through detect, triage, investigate, contain, eradicate, recover, and review. A common mistake is jumping to containment before understanding scope. Another is closing an alert as a false positive without checking for a quiet success buried in the noise."
      },
      {
        title: "Triage: signal from noise",
        body: "Most events are benign. Build a habit: identify the source, find the rate and the pattern, check whether the action was allowed or denied, and ask what would have to be true for this to be malicious. A single failed login is nothing. A thousand at machine speed from one foreign IP is a brute force."
      },
      {
        title: "Reading the five log sources",
        body: "Windows Event Logs carry logon and process events such as 4624 success, 4625 failure, and 4688 process creation. Syslog covers Linux and appliances. Firewall logs show the five-tuple and an allow or deny verdict. CloudTrail records AWS and identity API calls. Web logs show method, path, and status. Pivoting between them is how you build a story."
      },
      {
        title: "MITRE ATT&CK as a shared language",
        body: "ATT&CK names what attackers do, organized by tactic, the goal, and technique, the method. When you map activity to ATT&CK, you communicate precisely and you anticipate the next step. A beacon is T1071 Command and Control. Mass encryption is T1486 Impact."
      },
      {
        title: "Correlation and pivoting",
        body: "Real intrusions touch many systems. The same attacker IP, file hash, or account appears across the SIEM, the network map, and the intel feed. Follow one indicator across all four screens. When the story connects, you have your scope."
      },
      {
        title: "Severity and escalation",
        body: "Severity reflects impact and confidence. Escalate when you see confirmed malicious activity, evidence of success such as a 4624 after a brute force, or anything touching regulated data. When in doubt, escalate with what you know. A clear, early handoff beats a perfect late one."
      },
      {
        title: "Containment without destroying evidence",
        body: "Network-isolate a host rather than powering it off, which preserves memory. Cut command and control. Disable accounts and revoke sessions. Capture indicators before you clean. Recover only from backups the attacker could not reach, and only after eradication."
      },
      {
        title: "Identity is the new perimeter",
        body: "Modern attacks steal sessions, not just passwords. Adversary-in-the-middle phishing can defeat ordinary MFA by replaying a stolen token. A password reset alone is not containment. You must revoke sessions and remove cloud persistence such as inbox rules and OAuth grants. Phishing-resistant MFA is the durable fix."
      },
      {
        title: "Documentation and the post-mortem",
        body: "If it is not written down, it did not happen. Note every action with a timestamp as you work. Your post-mortem should give a CISO a clean timeline, the root cause, the indicators, what you did, and what should change. Writing well is a core analyst skill, not an afterthought."
      }
    ],
    glossary: [
      ["IOC", "Indicator of Compromise. An observable tied to malicious activity, such as an IP, domain, or file hash."],
      ["C2", "Command and Control. The channel an attacker uses to control a compromised host."],
      ["Beacon", "A regular check-in from an implant to its C2, recognizable by its timing."],
      ["LOLBin", "Living off the Land Binary. A trusted built-in tool abused by an attacker to avoid malware."],
      ["AiTM", "Adversary-in-the-Middle. A proxy phishing attack that can steal a post-MFA session token."],
      ["Lateral movement", "Moving from one compromised host to others, often via SMB or remote services."],
      ["Exfiltration", "Unauthorized transfer of data out of the network, often hidden inside encrypted traffic."],
      ["PHI", "Protected Health Information. Patient data whose exposure triggers HIPAA obligations."]
    ]
  };
})();
