/* SOC Range :: library.data.js
 * Reference library content: document templates, incident playbooks/SOPs mapped
 * to scenarios, and the NIST publication shelf. NIST editions verified June 2026.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  // Downloadable Word templates. Files live in library/templates/.
  var TEMPLATES = [
    { file: "incident-report.docx", name: "Incident Report", kind: "Report",
      desc: "Formal record of an incident from detection through recovery. The capstone deliverable for most shifts." },
    { file: "post-incident-review.docx", name: "Post-Incident Review", kind: "Lessons learned",
      desc: "The blameless post-mortem. Metrics, what went well, what to fix, and action items." },
    { file: "executive-brief.docx", name: "Executive Brief", kind: "Leadership",
      desc: "One-page, jargon-free debrief for leadership. Business impact and the ask." },
    { file: "incident-ticket.docx", name: "Incident Ticket", kind: "Case record",
      desc: "The working case file an analyst maintains: triage notes, work log, escalation, resolution." },
    { file: "alert-triage-worksheet.docx", name: "Alert Triage Worksheet", kind: "Triage",
      desc: "Tier 1 first pass on a single alert. Five questions, a verdict, and a next action." },
    { file: "evidence-log.docx", name: "Chain of Custody and Evidence Log", kind: "Forensics",
      desc: "Keeps collected evidence defensible. Item inventory plus every custody transfer." },
    { file: "sitrep.docx", name: "Situation Report (SITREP)", kind: "Comms",
      desc: "Periodic status update during a live incident. Short, current, on a cadence." },
    { file: "root-cause-analysis.docx", name: "Root Cause Analysis", kind: "Analysis",
      desc: "Five-whys analysis to get past the symptom to the underlying cause." },
    { file: "risk-assessment-report.docx", name: "Risk Assessment Report", kind: "GRC · Risk",
      desc: "Scope, threats, and a risk register rated by likelihood and impact. The core GRC risk deliverable (NIST SP 800-30)." },
    { file: "business-impact-analysis.docx", name: "Business Impact Analysis (BIA)", kind: "GRC · Continuity",
      desc: "Impact over time, recovery objectives (RTO and RPO), and dependencies. Feeds the recovery plan (NIST SP 800-34)." },
    { file: "vendor-risk-assessment.docx", name: "Third-Party Vendor Risk Assessment", kind: "GRC · Vendor",
      desc: "HECVAT-based review of a vendor's security and compliance, with a residual-risk rating and a decision." },
    { file: "compliance-gap-assessment.docx", name: "Compliance Gap Assessment", kind: "GRC · Compliance",
      desc: "Requirement-by-requirement gap analysis for FERPA, GLBA, PCI, HIPAA, or NIST 800-171, with an owned remediation plan." },
    { file: "security-policy.docx", name: "Security Policy / Governance Document", kind: "GRC · Policy",
      desc: "Template for a policy, data classification scheme, or standard: purpose, statements, roles, and approval." },
    { file: "security-program-assessment.docx", name: "Security Program Assessment", kind: "GRC · Program",
      desc: "Maturity review of one program area (awareness, access, cloud posture, insurance, assets) against a benchmark." },
    { file: "breach-notification-determination.docx", name: "Breach Risk Determination and Notification", kind: "GRC · Notification",
      desc: "Risk-of-harm determination plus a notification matrix of who must be told, by when, under each law." },
    { file: "grc-executive-brief.docx", name: "GRC Executive Brief", kind: "GRC · Leadership",
      desc: "One-page, jargon-free debrief of an assessment for leadership. The brief you also present on camera." }
  ];

  // NIST shelf. Links go to the official CSRC landing pages, which stay current.
  var NIST = [
    { id: "csf2", code: "CSF 2.0", title: "Cybersecurity Framework 2.0",
      url: "https://www.nist.gov/cyberframework",
      desc: "The six Functions that organize a security program: Govern, Identify, Protect, Detect, Respond, Recover. The backbone the newer IR guidance is built on." },
    { id: "sp80061", code: "SP 800-61r3", title: "Incident Response Recommendations and Considerations",
      url: "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
      desc: "The current incident-response guidance (April 2025). Restructured as a CSF 2.0 Community Profile. Supersedes the classic Rev 2 handling guide." },
    { id: "sp80053", code: "SP 800-53r5", title: "Security and Privacy Controls (controls catalog)",
      url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
      desc: "The full controls catalog. The IR family of controls lives here, among twenty control families." },
    { id: "sp80053a", code: "SP 800-53A r5", title: "Assessing Security and Privacy Controls",
      url: "https://csrc.nist.gov/pubs/sp/800/53/a/r5/final",
      desc: "How to assess whether a control is actually working. Pairs with the catalog." },
    { id: "sp80030", code: "SP 800-30r1", title: "Guide for Conducting Risk Assessments",
      url: "https://csrc.nist.gov/pubs/sp/800/30/r1/final",
      desc: "How to assess risk: threat sources, likelihood, impact, and risk determination." },
    { id: "sp80037", code: "SP 800-37r2", title: "Risk Management Framework (RMF)",
      url: "https://csrc.nist.gov/pubs/sp/800/37/r2/final",
      desc: "The seven-step process for managing risk across a system lifecycle." },
    { id: "sp80086", code: "SP 800-86", title: "Integrating Forensic Techniques into Incident Response",
      url: "https://csrc.nist.gov/pubs/sp/800/86/final",
      desc: "Acquiring, examining, and preserving digital evidence during a response." },
    { id: "sp80092", code: "SP 800-92", title: "Guide to Computer Security Log Management",
      url: "https://csrc.nist.gov/pubs/sp/800/92/final",
      desc: "Log sources, retention, and analysis. Foundational for SIEM work." },
    { id: "sp800184", code: "SP 800-184", title: "Guide for Cybersecurity Event Recovery",
      url: "https://csrc.nist.gov/pubs/sp/800/184/final",
      desc: "Planning and executing recovery so you restore service without reinfection." },
    { id: "sp800150", code: "SP 800-150", title: "Guide to Cyber Threat Information Sharing",
      url: "https://csrc.nist.gov/pubs/sp/800/150/final",
      desc: "How to produce, consume, and share threat intelligence and indicators." },
    { id: "sp80034", code: "SP 800-34r1", title: "Contingency Planning Guide for Federal Information Systems",
      url: "https://csrc.nist.gov/pubs/sp/800/34/r1/final",
      desc: "Business impact analysis, recovery objectives (RTO and RPO), and contingency planning. The basis for BIA and DR work." },
    { id: "sp800171", code: "SP 800-171r3", title: "Protecting Controlled Unclassified Information",
      url: "https://csrc.nist.gov/pubs/sp/800/171/r3/final",
      desc: "The control set for safeguarding CUI in nonfederal systems. Relevant to federal research grants and student financial-aid data." }
  ];

  // Incident playbooks / SOPs, mapped to scenarios. Phases follow the lifecycle.
  function pb(id, title, appliesTo, summary, phases, nist) {
    return { id: id, title: title, appliesTo: appliesTo, summary: summary, phases: phases, nist: nist };
  }
  var PLAYBOOKS = [
    pb("brute-force", "Brute Force and Suspicious Logon", ["SC-T1-01"],
      "Repeated failed authentications, sometimes followed by a success. Confirm, scope, and lock out.",
      [["Detect", ["Confirm the alert against authentication logs (4625 failures, 4624 success).", "Identify the source IP and the targeted accounts."]],
       ["Analyze", ["Determine if any attempt succeeded (a 4624 after the failures).", "Check the source reputation and whether the account is privileged."]],
       ["Contain", ["Block the source IP at the firewall.", "Disable or force-reset any account that authenticated."]],
       ["Eradicate", ["Hunt for follow-on activity from the source or account.", "Remove any persistence created after the logon."]],
       ["Recover", ["Restore normal access for legitimate users.", "Confirm MFA and lockout policy are enforced."]],
       ["Improve", ["Tune the detection threshold.", "Recommend MFA and rate limiting where missing."]]],
      ["sp80061", "sp80092", "sp80053"]),
    pb("phishing", "Phishing and Suspicious Email", ["SC-T1-02"],
      "A suspicious message was delivered or reported. Separate delivery from compromise.",
      [["Detect", ["Pull the email headers and the sender domain.", "Check whether the message was delivered and to whom."]],
       ["Analyze", ["Compare the sender to the real domain. Look for lookalikes.", "Check for a click and any follow-on process or sign-in."]],
       ["Contain", ["Quarantine the message across mailboxes.", "Block the sender and any malicious URL or attachment hash."]],
       ["Eradicate", ["Reset credentials for anyone who entered them.", "Remove any dropped files or mail rules."]],
       ["Recover", ["Release falsely quarantined mail.", "Confirm affected users are back to normal."]],
       ["Improve", ["Feed indicators to the block lists.", "Flag the user group for targeted awareness training."]]],
      ["sp80061", "sp800150", "sp80053"]),
    pb("recon", "Reconnaissance and Port Scanning", ["SC-T1-06"],
      "External or internal scanning. Usually pre-attack noise, occasionally a foothold probing.",
      [["Detect", ["Confirm the scan pattern: many ports or hosts from one source.", "Note whether connections were allowed or blocked."]],
       ["Analyze", ["Internal source is more serious than external.", "Check if the source later touched a sensitive service."]],
       ["Contain", ["Block external scanners at the perimeter.", "Isolate an internal scanning host for investigation."]],
       ["Eradicate", ["If internal, find why that host is scanning. Treat as possibly compromised."]],
       ["Recover", ["Return the host to service once cleared."]],
       ["Improve", ["Confirm exposed services should be reachable.", "Recommend segmentation where scanning crossed zones."]]],
      ["sp80061", "sp80092"]),
    pb("ransomware", "Ransomware", ["SC-T2-01"],
      "Encryption activity, ransom notes, and likely prior access. Speed and isolation matter most.",
      [["Detect", ["Confirm mass file changes, ransom notes, or EDR alerts.", "Identify patient zero and the spread."]],
       ["Analyze", ["Trace initial access, the path to execution, and lateral movement.", "Identify the strain and any data theft before encryption."]],
       ["Contain", ["Isolate affected hosts on the network. Do not power off, preserve memory.", "Disable the accounts used to spread it and cut command and control."]],
       ["Eradicate", ["Remove the malware and persistence from every host.", "Reset all credentials that were exposed."]],
       ["Recover", ["Restore from clean, offline backups only.", "Verify integrity before reconnecting."]],
       ["Improve", ["Close the initial access vector.", "Test backup and recovery. Brief leadership."]]],
      ["sp80061", "sp800184", "sp80086", "sp80053"]),
    pb("ato", "Account Takeover", ["SC-T2-03", "SC-T1-05"],
      "Credentials phished or guessed, then used to sign in. Modern takeover may ride a stolen session.",
      [["Detect", ["Confirm an anomalous successful sign-in.", "Check geo, device, and whether MFA was satisfied."]],
       ["Analyze", ["Look for token theft signals: MFA satisfied yet impossible travel.", "Enumerate what the account accessed after sign-in."]],
       ["Contain", ["Revoke active sessions, not just the password.", "Disable the account or force re-registration of MFA."]],
       ["Eradicate", ["Remove cloud persistence: inbox rules, OAuth grants, app passwords.", "Reset credentials and rotate any exposed secrets."]],
       ["Recover", ["Restore the user with fresh credentials and MFA.", "Monitor the account closely for a period."]],
       ["Improve", ["Tighten conditional access.", "Add detection for impossible travel and risky OAuth consent."]]],
      ["sp80061", "sp80053", "sp80030"]),
    pb("exfil", "Data Exfiltration", ["SC-T2-05"],
      "Large or unusual outbound transfers, often over TLS. In healthcare, scope regulated data fast.",
      [["Detect", ["Confirm the volume and destination of the transfer.", "Identify the source host and the data store touched."]],
       ["Analyze", ["Sum bytes to the destination and check its reputation.", "Determine the data type. Name HIPAA exposure if PHI."]],
       ["Contain", ["Block the destination and isolate the source host.", "Suspend the account or process moving the data."]],
       ["Eradicate", ["Remove the tooling used to stage and move data.", "Close the access path that reached the data store."]],
       ["Recover", ["Return systems to service once clean.", "Begin breach notification process if required."]],
       ["Improve", ["Add egress monitoring and DLP where missing.", "Document the regulatory reporting decision."]]],
      ["sp80061", "sp800184", "sp80030", "sp80053"]),
    pb("c2", "Command and Control Beacon", ["SC-T3-01"],
      "A host calling home on a regular interval. A hunt as much as an alert.",
      [["Detect", ["Group outbound connections by destination.", "Look for regular timing to an unusual port or domain."]],
       ["Analyze", ["Confirm the beacon interval and the destination reputation.", "Identify the implant on the host."]],
       ["Contain", ["Block the command and control destination.", "Isolate the beaconing host."]],
       ["Eradicate", ["Remove the implant and its persistence.", "Hunt for the same beacon on other hosts."]],
       ["Recover", ["Rebuild or clean the host and return to service."]],
       ["Improve", ["Create a detection for the beacon pattern.", "Share the indicators."]]],
      ["sp80061", "sp80092", "sp800150"]),
    pb("lolbin", "Living-off-the-Land Activity", ["SC-T3-02"],
      "Abuse of built-in tools like PowerShell and certutil. Blends into normal admin noise.",
      [["Detect", ["Hunt for suspicious use of native binaries.", "Look at command lines, not just process names."]],
       ["Analyze", ["Decide if the usage is admin work or abuse.", "Trace what the command actually did."]],
       ["Contain", ["Isolate the host if abuse is confirmed.", "Disable the account running the commands."]],
       ["Eradicate", ["Remove dropped payloads and persistence."]],
       ["Recover", ["Return the host to service once cleared."]],
       ["Improve", ["Add command-line logging and detections for the technique.", "Restrict scripting where it is not needed."]]],
      ["sp80061", "sp80092", "sp80086"]),
    pb("cloud-exposure", "Cloud Data Exposure", ["SC-AE-01"],
      "A storage bucket or resource made public. Exposure can be instant and wide.",
      [["Detect", ["Confirm the configuration change from cloud audit logs.", "Identify the resource and who changed it."]],
       ["Analyze", ["Determine what data is exposed and for how long.", "Check access logs for who reached it."]],
       ["Contain", ["Revert the public setting immediately.", "Disable the credentials that made the change if suspicious."]],
       ["Eradicate", ["Review for other misconfigurations by the same principal.", "Rotate exposed keys and secrets."]],
       ["Recover", ["Confirm the resource is private and access is restored to the right principals."]],
       ["Improve", ["Add a guardrail or policy to block public exposure.", "Document any regulatory reporting decision."]]],
      ["sp80061", "sp80053", "sp80030", "sp800184"]),
    pb("aitm", "Adversary-in-the-Middle Token Theft", ["SC-AE-02"],
      "A proxy phish steals the session token, so MFA looks satisfied. Containment is session-based.",
      [["Detect", ["Confirm a sign-in where MFA passed but context is hostile.", "Look for an OAuth consent or new device just after."]],
       ["Analyze", ["Confirm token theft over password compromise.", "Map what the session did, including mail rules and grants."]],
       ["Contain", ["Revoke all sessions and refresh tokens.", "Remove malicious OAuth grants and inbox rules."]],
       ["Eradicate", ["Reset credentials and re-register MFA.", "Block the phishing infrastructure."]],
       ["Recover", ["Restore the user with clean session state.", "Monitor for re-entry."]],
       ["Improve", ["Move toward phishing-resistant MFA.", "Detect risky consent and token replay."]]],
      ["sp80061", "sp80053", "sp800150"]),
    pb("malware", "Malware Infection and Beacon", ["SC-T1-03"],
      "A document or download leads to code execution and a C2 beacon. Confirm the chain, then isolate.",
      [["Detect", ["Confirm the process chain from document to script to network.", "Find the periodic outbound beacon."]],
       ["Analyze", ["Identify the C2 destination and the payload hash.", "Determine what ran and whether it spread."]],
       ["Contain", ["Network-isolate the host, preserving memory.", "Block the C2 and the payload hash."]],
       ["Eradicate", ["Remove the malware and any persistence.", "Reset credentials used on the host."]],
       ["Recover", ["Rebuild or clean the host and return to service."]],
       ["Improve", ["Tune detection for the chain.", "Harden macro and script execution."]]],
      ["sp80061", "sp80092", "sp80086"]),
    pb("webapp", "Web Application Attack", ["SC-T1-04", "SC-T2-02"],
      "Injection or exploitation against a public web app, sometimes leading to a web shell.",
      [["Detect", ["Confirm the attack type from the web logs: injection, traversal, or upload.", "Check for a successful response or a spawned shell."]],
       ["Analyze", ["Determine what data or access was obtained.", "If a web shell exists, find the uploaded file."]],
       ["Contain", ["Block the source and add a WAF virtual patch.", "Isolate the server if a shell is active."]],
       ["Eradicate", ["Remove the web shell, fix the code, and rotate server secrets.", "Patch the entry vulnerability."]],
       ["Recover", ["Return the app to service once clean and patched."]],
       ["Improve", ["Add input validation and parameterized queries.", "Add detection for server processes spawning shells."]]],
      ["sp80061", "sp80053", "sp80030"]),
    pb("insider", "Insider Data Theft", ["SC-T2-04"],
      "A valid user abuses authorized access to collect and remove data. Response is technical, HR, and legal.",
      [["Detect", ["Confirm unusual bulk access by a legitimate account.", "Find the outbound upload to a personal destination."]],
       ["Analyze", ["Determine what data and how much. Name regulated data such as PHI.", "Assess intent and timing, for example a notice period."]],
       ["Contain", ["Disable the account and block the destination.", "Preserve all logs and evidence. Do not tip off the subject."]],
       ["Eradicate", ["Revoke access and recover or invalidate the data where possible."]],
       ["Recover", ["Restore normal operations and begin any required breach process."]],
       ["Improve", ["Add DLP and egress controls.", "Tighten access and offboarding procedures."]]],
      ["sp80061", "sp80030", "sp80053", "sp800184"]),
    pb("bec", "Business Email Compromise", ["SC-T2-06"],
      "A trusted mailbox is used to redirect a payment, often with an inbox rule hiding the fraud.",
      [["Detect", ["Confirm a payment or banking change request from a compromised mailbox.", "Find the concealing inbox rule."]],
       ["Analyze", ["Trace the account compromise and what the session did.", "Identify the fraudulent request and recipient."]],
       ["Contain", ["Alert finance to halt the payment and verify out of band.", "Revoke sessions and remove the inbox rule and OAuth grants."]],
       ["Eradicate", ["Reset credentials and re-register MFA.", "Block the attacker infrastructure."]],
       ["Recover", ["Confirm the payment was stopped and the account is clean."]],
       ["Improve", ["Require out-of-band verification for payment changes.", "Detect inbox-rule creation and risky consent."]]],
      ["sp80061", "sp80053", "sp800150"]),
    pb("cryptojacking", "Cryptojacking", ["SC-T2-07"],
      "An attacker uses a foothold to mine cryptocurrency, stealing compute. Still a compromise.",
      [["Detect", ["Confirm sustained high CPU plus mining-pool traffic.", "Identify the affected host and the pool destination."]],
       ["Analyze", ["Find the miner process and how it was deployed.", "Determine the entry path."]],
       ["Contain", ["Kill the miner and block the mining pool.", "Isolate the host if needed."]],
       ["Eradicate", ["Remove the miner and any persistence.", "Close the entry path."]],
       ["Recover", ["Return the host to service once clean."]],
       ["Improve", ["Add detection for mining ports and CPU anomalies.", "Harden the exposed service."]]],
      ["sp80061", "sp80092"]),
    pb("lateral", "Lateral Movement and Pass-the-Hash", ["SC-T3-03"],
      "An attacker reuses stolen hashes to move between systems toward the domain controller.",
      [["Detect", ["Hunt for NTLM network logons without a preceding interactive logon.", "Look for SMB admin share access from one pivot."]],
       ["Analyze", ["Identify the pivot host and the abused account.", "Scope which systems were reached."]],
       ["Contain", ["Isolate the pivot and reset the abused account.", "Rotate exposed credentials."]],
       ["Eradicate", ["Remove footholds on every reached host."]],
       ["Recover", ["Restore clean systems and monitor the accounts."]],
       ["Improve", ["Limit admin reuse and enable strong auth.", "Detect NTLM where Kerberos is expected."]]],
      ["sp80061", "sp80086", "sp80053"]),
    pb("ad-credential", "Active Directory Credential Attack", ["SC-T3-04"],
      "Service-ticket harvesting such as kerberoasting, leading to offline cracking and escalation.",
      [["Detect", ["Hunt for bursts of Kerberos service-ticket requests using weak RC4.", "Watch for privilege changes that follow."]],
       ["Analyze", ["Identify the targeted service accounts and the requesting source.", "Confirm any escalation, such as new Domain Admins."]],
       ["Contain", ["Reset affected service accounts with strong secrets.", "Remove any escalated group membership."]],
       ["Eradicate", ["Move service accounts to group managed service accounts and disable RC4."]],
       ["Recover", ["Validate the directory is clean and monitor closely."]],
       ["Improve", ["Audit service principals and ticket encryption.", "Detect RC4 ticket request bursts."]]],
      ["sp80061", "sp80053", "sp80030"]),
    pb("vuln-mgmt", "Exploited Vulnerability and Remediation", ["SC-AE-03"],
      "A known CVE on a public app is exploited. Contain, patch, then run the vulnerability program across the fleet.",
      [["Detect", ["Confirm exploitation from the request pattern and the server callback.", "Identify the affected asset and the CVE."]],
       ["Analyze", ["Determine post-exploit activity and scope.", "Assess how many assets share the vulnerability."]],
       ["Contain", ["Apply a virtual patch and isolate the host.", "Block the exploit source and the callback."]],
       ["Eradicate", ["Patch the software to remove the vulnerability.", "Remove any implant or persistence."]],
       ["Recover", ["Return patched assets to service and verify."]],
       ["Improve", ["Scan the fleet, prioritize by risk, and retest.", "Tighten patch SLAs and exposure monitoring."]]],
      ["sp80061", "sp80030", "sp80037", "sp80053"]),
    pb("persistence", "Persistence Mechanisms", ["SC-T1-08", "SC-T3-05"],
      "Scheduled tasks, registry Run keys, and similar footholds that re-execute attacker code.",
      [["Detect", ["Find task and Run-key creations with suspicious targets or triggers.", "Note hidden or encoded commands."]],
       ["Analyze", ["Tie each mechanism to a shared payload and callout.", "Scope how many hosts are affected."]],
       ["Contain", ["Remove the tasks and keys, and isolate hosts as needed.", "Block the callout."]],
       ["Eradicate", ["Find and remove the process that created the persistence.", "Sweep the fleet for the same pattern."]],
       ["Recover", ["Return clean hosts to service and reset affected credentials."]],
       ["Improve", ["Alert on task and Run-key creation.", "Baseline normal startup items."]]],
      ["sp80061", "sp80086", "sp80053"]),
    pb("supply-chain", "Software Supply Chain Compromise", ["SC-T2-12", "SC-AE-07"],
      "Malicious code arrives through a trusted update or build pipeline, so the blast radius is fleet-wide.",
      [["Detect", ["Spot a trusted updater or pipeline doing something unexpected, then calling out.", "Identify the affected component and version."]],
       ["Analyze", ["Scope every asset on the same component or pipeline.", "Determine what secrets the malicious step could reach."]],
       ["Contain", ["Isolate affected hosts, pin or roll back the component, and block the callout.", "Revert the pipeline change."]],
       ["Eradicate", ["Remove the implant and rotate all exposed secrets.", "Require signed, reviewed changes."]],
       ["Recover", ["Rebuild from a known-good source and verify."]],
       ["Improve", ["Add provenance and signing checks.", "Treat CI/CD as crown-jewel infrastructure."]]],
      ["sp80061", "sp80053", "sp800184"]),
    pb("ai-era", "AI-Era Threat", ["SC-AE-05"],
      "Attacks that abuse AI assistants, such as indirect prompt injection driving tool actions.",
      [["Detect", ["Find an assistant tool action that sends data outward.", "Locate the injected instruction in processed content."]],
       ["Analyze", ["Determine what data left and which tools were used.", "Assess the trust boundary that failed."]],
       ["Contain", ["Block the egress endpoint and restrict assistant tool permissions.", "Isolate untrusted content sources."]],
       ["Eradicate", ["Remove poisoned content and tighten tool scopes."]],
       ["Recover", ["Restore the assistant with least-privilege tools and an egress allowlist."]],
       ["Improve", ["Add input provenance, output filtering, and egress controls.", "Red-team the assistant against injection."]]],
      ["sp80061", "sp80053", "sp80030"]),
    pb("password-spray", "Password Spray and Credential Stuffing", ["SC-T1-13", "SC-AE-21"],
      "One password tried across many accounts, or reused breach credentials, to find a weak login without tripping lockout.",
      [["Detect", ["Confirm many accounts failing from one source in a short window.", "Note whether any single account then succeeded."]],
       ["Analyze", ["Check the source reputation and whether MFA was satisfied.", "Scope which accounts authenticated."]],
       ["Contain", ["Block the source and force-reset any account that signed in.", "Revoke active sessions for those accounts."]],
       ["Eradicate", ["Remove any persistence created after a successful login.", "Rotate exposed credentials."]],
       ["Recover", ["Restore normal access and monitor the affected accounts."]],
       ["Improve", ["Enforce MFA and smart lockout.", "Add detection for spray patterns and impossible travel."]]],
      ["sp80061", "sp80053", "sp80092"]),
    pb("dns-tunnel", "DNS Tunneling and Covert Channels", ["SC-T1-18", "SC-T3-10"],
      "High-entropy or high-volume DNS used to smuggle data or commands past egress controls.",
      [["Detect", ["Look for long, random TXT or subdomain queries to one domain.", "Note high query volume from one host."]],
       ["Analyze", ["Confirm the destination reputation and the encoded pattern.", "Identify the host and process making the queries."]],
       ["Contain", ["Block the domain at the resolver and isolate the host.", "Sinkhole the tunnel."]],
       ["Eradicate", ["Remove the implant driving the queries and its persistence."]],
       ["Recover", ["Return the host to service once clean."]],
       ["Improve", ["Force internal DNS through inspected resolvers.", "Alert on query entropy and volume."]]],
      ["sp80061", "sp80092", "sp800150"]),
    pb("mfa-attack", "MFA Fatigue and Push Bombing", ["SC-T1-24"],
      "Repeated MFA push prompts sent to wear a user down into approving one.",
      [["Detect", ["Confirm a burst of MFA prompts the user did not start.", "Check the source location and device."]],
       ["Analyze", ["Determine whether any prompt was approved.", "Look for a sign-in that followed an approval."]],
       ["Contain", ["Revoke sessions and require re-registration of MFA.", "Block the source."]],
       ["Eradicate", ["Remove any cloud persistence created after sign-in.", "Reset credentials."]],
       ["Recover", ["Restore the user with number-matching or phishing-resistant MFA."]],
       ["Improve", ["Enable number matching and prompt rate limits.", "Train users to deny and report unexpected prompts."]]],
      ["sp80061", "sp80053", "sp800150"]),
    pb("cloud-ransom", "Cloud Ransom and Backup Destruction", ["SC-T2-22", "SC-AE-20"],
      "An attacker with cloud credentials deletes backups and re-encrypts or holds data for ransom.",
      [["Detect", ["Confirm backup deletion or re-encryption events in the cloud audit log.", "Identify the principal and source IP."]],
       ["Analyze", ["Scope what was deleted or encrypted and whether copies survive.", "Determine how the credential was obtained."]],
       ["Contain", ["Disable the abused credential and revoke its sessions.", "Lock down the affected resources and KMS keys."]],
       ["Eradicate", ["Remove attacker IAM persistence and rotate all exposed keys.", "Restore key policies."]],
       ["Recover", ["Restore from immutable or cross-account backups.", "Verify integrity before reconnecting."]],
       ["Improve", ["Enable immutable backups and delete protection.", "Require MFA-delete and alert on backup changes."]]],
      ["sp80061", "sp800184", "sp80053", "sp80030"]),
    pb("deepfake", "Deepfake and Voice Social Engineering", ["SC-T2-24", "SC-T2-26"],
      "A cloned voice or video, or a convincing phone call, used to authorize a payment or reset access.",
      [["Detect", ["Confirm a high-impact action approved over voice or video.", "Note any out-of-band verification that was skipped."]],
       ["Analyze", ["Trace what was approved and by whom.", "Check for a fraudulent payment or an access change."]],
       ["Contain", ["Halt the payment and verify out of band.", "Reverse any access or MFA change made on the request."]],
       ["Eradicate", ["Revoke sessions and reset anything the request altered."]],
       ["Recover", ["Confirm funds are stopped and the account is clean."]],
       ["Improve", ["Require out-of-band callback for payments and access changes.", "Train staff that voice and video are not identity proof."]]],
      ["sp80061", "sp80053", "sp800150"]),
    pb("ai-injection", "Prompt Injection and Agentic Tool Abuse", ["SC-AE-08", "SC-AE-14", "SC-AE-15"],
      "Hidden instructions in content the AI assistant reads drive it to take harmful tool actions.",
      [["Detect", ["Find an assistant tool action that sent data out or changed state.", "Locate the injected instruction in the processed content."]],
       ["Analyze", ["Determine what data left and which tools were used.", "Identify the trust boundary that failed."]],
       ["Contain", ["Block the egress endpoint and restrict assistant tool permissions.", "Isolate the untrusted content source."]],
       ["Eradicate", ["Remove poisoned content and tighten tool scopes.", "Revoke any tokens the assistant exposed."]],
       ["Recover", ["Restore the assistant with least-privilege tools and an egress allowlist."]],
       ["Improve", ["Separate untrusted content from instructions.", "Add output filtering and human approval for sensitive tools."]]],
      ["sp80061", "sp80053", "sp80030"]),
    pb("ai-data-leak", "Shadow AI and Sensitive Data Leakage", ["SC-T1-22", "SC-AE-09"],
      "Staff paste regulated data into public AI tools, or an assistant sends it outside org control.",
      [["Detect", ["Confirm regulated data sent to a public AI service.", "Identify the user and the volume."]],
       ["Analyze", ["Determine the data type and the HIPAA exposure.", "Check whether it was a one-off or routine."]],
       ["Contain", ["Block the public AI endpoints and notify the user.", "Capture evidence of what was sent."]],
       ["Eradicate", ["Request deletion where possible and revoke any shared links."]],
       ["Recover", ["Begin the breach assessment if PHI left org control."]],
       ["Improve", ["Provide a sanctioned AI tool and clear policy.", "Add DLP rules for AI destinations."]]],
      ["sp80061", "sp80053", "sp800184", "sp80030"]),
    pb("ai-model", "AI Model Poisoning and Theft", ["SC-T3-18", "SC-AE-10", "SC-AE-11"],
      "An attacker poisons the data a model learns from, or scrapes the model itself through its API.",
      [["Detect", ["Spot anomalous ingestion into training or RAG data, or extraction-rate queries to the model API.", "Identify the source and the affected component."]],
       ["Analyze", ["Determine which documents or queries are malicious.", "Assess whether model outputs were steered or copied."]],
       ["Contain", ["Quarantine the poisoned data and rate-limit or block the scraper.", "Pin the model to a known-good version."]],
       ["Eradicate", ["Remove poisoned entries and re-index from a trusted source.", "Rotate API keys."]],
       ["Recover", ["Re-validate model outputs against a trusted baseline before reuse."]],
       ["Improve", ["Add provenance checks on training and RAG data.", "Throttle and authenticate inference, and watch for extraction patterns."]]],
      ["sp80061", "sp80053", "sp80030", "sp800150"]),

    // ---- Governance, Risk and Compliance (GRC) SOPs ----
    pb("risk-assessment", "Security Risk Assessment (SOP)", ["SC-GRC-01", "SC-GRC-15"],
      "Assess risk to a system or process: identify assets and threats, rate likelihood and impact, then recommend treatment. Follows NIST SP 800-30.",
      [["Scope", ["Define the system, data, and business process in scope.", "Identify the data types and any laws that apply, such as FERPA for student records."]],
       ["Identify", ["List assets, threat sources, and existing controls.", "Identify vulnerabilities and the threat events that could exploit them."]],
       ["Analyze", ["Rate likelihood and impact for each risk on a common scale.", "Determine the risk level from likelihood and impact."]],
       ["Treat", ["Recommend a response for each risk: mitigate, transfer, avoid, or accept.", "Tie each recommendation to a control and an owner."]],
       ["Report", ["Record results in a risk register with ratings and recommendations.", "Brief leadership and set a date to reassess."]]],
      ["sp80030", "sp80037", "sp80053", "sp80053a"]),
    pb("business-impact", "Business Impact Analysis (SOP)", ["SC-GRC-02"],
      "Determine how much a disruption to a process or system would hurt, and how fast it must be restored. Follows NIST SP 800-34.",
      [["Scope", ["Identify the process or system and the services it supports.", "Identify who depends on it, such as students at registration."]],
       ["Impact", ["Estimate the impact of an outage over time: operational, financial, legal, and reputational.", "Note legal or compliance impact, such as missed reporting deadlines."]],
       ["Objectives", ["Set the recovery time objective (RTO): how fast it must be back.", "Set the recovery point objective (RPO): how much data loss is tolerable."]],
       ["Dependencies", ["Map upstream and downstream dependencies and single points of failure.", "Identify the minimum resources needed to recover."]],
       ["Report", ["Prioritize systems for recovery based on impact and RTO.", "Feed the results into the disaster recovery and contingency plan."]]],
      ["sp80034", "sp800184", "sp80053"]),
    pb("vendor-risk", "Third-Party Vendor Risk Assessment (SOP)", ["SC-GRC-03", "SC-GRC-21"],
      "Evaluate the security and compliance risk a vendor introduces before and after onboarding. In higher education this uses the HECVAT questionnaire.",
      [["Intake", ["Identify the data the vendor will access and how it is shared.", "Classify the data and flag regulated types such as FERPA, GLBA, or HIPAA."]],
       ["Assess", ["Collect the vendor's HECVAT, SOC 2 report, and any certifications.", "Review their controls, breach history, and subcontractors."]],
       ["Contract", ["Confirm the contract has the right data-protection terms.", "For protected health information, confirm a business associate agreement (BAA) is in place."]],
       ["Decide", ["Rate the residual risk and recommend approve, approve with conditions, or reject.", "Document required remediations and their due dates."]],
       ["Monitor", ["Set a reassessment cadence and watch for vendor breach notices.", "Reassess immediately if the vendor reports an incident."]]],
      ["sp80030", "sp80053", "sp800150"]),
    pb("compliance-assessment", "Compliance Gap Assessment (SOP)", ["SC-GRC-04", "SC-GRC-05", "SC-GRC-06", "SC-GRC-13", "SC-GRC-19"],
      "Compare current practice against a regulation or standard and document the gaps and a remediation plan. Used for FERPA, GLBA, PCI, and HIPAA.",
      [["Scope", ["Identify the regulation in scope and the systems and offices it covers.", "Gather the relevant requirements as a checklist."]],
       ["Assess", ["Test each requirement against current practice and evidence.", "Mark each as met, partially met, or not met."]],
       ["Gaps", ["Document each gap with the requirement it fails and the risk it creates.", "Prioritize gaps by risk and effort."]],
       ["Plan", ["Assign an owner, a control, and a due date to each gap.", "Note any compensating controls already in place."]],
       ["Report", ["Summarize compliance status for leadership.", "Set the next assessment date and track remediation to closure."]]],
      ["sp80053a", "sp80053", "sp80030"]),
    pb("governance-policy", "Policy and Data Governance (SOP)", ["SC-GRC-07", "SC-GRC-14", "SC-GRC-20"],
      "Build or refresh a policy or governance scheme: classify data, set rules and retention, and get it approved and adopted.",
      [["Scope", ["Define the policy or scheme and who it covers.", "Identify the data types and the laws that constrain them, such as FERPA retention rules."]],
       ["Draft", ["Write the rules in plain language, with roles and responsibilities.", "Align to a recognized scheme or control family."]],
       ["Review", ["Circulate to stakeholders such as the registrar, legal, and IT.", "Reconcile conflicts and check it is enforceable."]],
       ["Approve", ["Route for sign-off by the data owner and leadership.", "Set an effective date and a review cycle."]],
       ["Adopt", ["Communicate and train staff on the change.", "Build a control or check to confirm the policy is followed."]]],
      ["sp80053", "sp80030", "csf2"]),
    pb("contingency-recovery", "Contingency and Recovery Planning (SOP)", ["SC-GRC-08", "SC-GRC-25"],
      "Plan or test how a critical service is restored after a disruption, prioritized by business impact. Follows NIST SP 800-34 and 800-184.",
      [["Scope", ["Identify the system and the services it supports.", "Pull the business impact analysis and its RTO and RPO."]],
       ["Assess", ["Review current backups, redundancy, and recovery procedures.", "Find gaps between the current state and the recovery objectives."]],
       ["Plan", ["Define recovery steps, roles, and the order systems come back.", "Confirm backups are offline and tested, not just scheduled."]],
       ["Test", ["Exercise the plan on paper or in a drill.", "Record what failed and how long recovery actually took."]],
       ["Improve", ["Close the gaps and update the plan.", "Set the next test date and brief leadership on residual risk."]]],
      ["sp80034", "sp800184", "sp80061"]),
    pb("incident-readiness", "Incident Readiness and Breach Notification (SOP)", ["SC-GRC-09", "SC-GRC-16", "SC-GRC-22", "SC-GRC-23", "SC-GRC-24"],
      "Prepare for, or respond to, an incident from the governance side: the plan, the roles, and the legal duty to notify.",
      [["Prepare", ["Confirm the incident response plan names roles, severities, and contacts.", "Identify the notification laws in play, such as FERPA, GLBA, HIPAA, and Texas breach law."]],
       ["Detect", ["Confirm what happened and what data was involved.", "Classify the data and decide if it is a reportable breach."]],
       ["Notify", ["Determine who must be told and by when under each applicable law.", "Draft the notification and route it through legal."]],
       ["Respond", ["Coordinate containment and evidence handling with the SOC.", "Document the timeline and decisions as you go."]],
       ["Improve", ["Run an after-action review and capture lessons.", "Update the plan and schedule the next tabletop."]]],
      ["sp80061", "sp800184", "sp80086"]),
    pb("security-program", "Security Program Assessment (SOP)", ["SC-GRC-10", "SC-GRC-11", "SC-GRC-12", "SC-GRC-17", "SC-GRC-18"],
      "Assess one area of the security program against a standard and recommend improvements: awareness, access, cloud posture, insurance readiness, or asset management.",
      [["Scope", ["Define the program area and the standard or control family to measure against.", "Identify the systems, accounts, or people in scope."]],
       ["Measure", ["Gather evidence: metrics, configurations, access lists, or inventories.", "Compare current state to the benchmark."]],
       ["Analyze", ["Identify gaps and rate them by risk and effort.", "Note quick wins and structural problems separately."]],
       ["Recommend", ["Propose specific, owned improvements with due dates.", "Tie each to a control and a measurable outcome."]],
       ["Report", ["Summarize the program's maturity for leadership.", "Set a cadence to remeasure and track progress."]]],
      ["sp80053", "sp80053a", "csf2"])
  ];

  // Additional new scenarios mapped to the nearest existing playbook.
  var EXTRA_PLAYBOOK = {
    "SC-T1-07": "malware", "SC-T1-09": "malware",
    "SC-T1-10": "ato", "SC-T1-12": "ato", "SC-T2-10": "ato",
    "SC-T1-11": "phishing",
    "SC-T2-08": "exfil", "SC-T2-11": "exfil", "SC-T3-07": "exfil",
    "SC-T2-09": "ransomware",
    "SC-T2-13": "webapp",
    "SC-T3-06": "ad-credential",
    "SC-T3-08": "cloud-exposure", "SC-AE-04": "cloud-exposure",
    "SC-AE-06": "bec",
    // ---- new scenarios mapped to the nearest existing playbook ----
    "SC-T1-14": "aitm", "SC-T1-15": "malware", "SC-T1-16": "ato", "SC-T1-17": "malware",
    "SC-T1-19": "recon", "SC-T1-20": "ato", "SC-T1-21": "phishing", "SC-T1-23": "exfil",
    "SC-T1-25": "malware", "SC-T1-26": "persistence", "SC-T1-27": "persistence",
    "SC-T2-14": "bec", "SC-T2-15": "aitm", "SC-T2-16": "ransomware", "SC-T2-17": "webapp",
    "SC-T2-18": "lateral", "SC-T2-19": "cryptojacking", "SC-T2-20": "malware", "SC-T2-21": "exfil",
    "SC-T2-23": "persistence", "SC-T2-25": "ato", "SC-T2-27": "exfil", "SC-T2-28": "webapp",
    "SC-T3-09": "c2", "SC-T3-11": "ad-credential", "SC-T3-12": "lateral", "SC-T3-13": "ad-credential",
    "SC-T3-14": "ad-credential", "SC-T3-15": "exfil", "SC-T3-16": "lolbin", "SC-T3-17": "supply-chain",
    "SC-T3-19": "cloud-exposure", "SC-T3-20": "cryptojacking", "SC-T3-21": "persistence",
    "SC-T3-22": "exfil", "SC-T3-23": "c2",
    "SC-AE-12": "deepfake", "SC-AE-13": "aitm", "SC-AE-16": "aitm", "SC-AE-17": "cloud-exposure",
    "SC-AE-18": "cloud-exposure", "SC-AE-19": "aitm", "SC-AE-22": "supply-chain"
  };

  // scenario id -> playbook id, for deep links from the workstation
  var SCN_PLAYBOOK = {};
  PLAYBOOKS.forEach(function (pbk) { pbk.appliesTo.forEach(function (sid) { SCN_PLAYBOOK[sid] = pbk.id; }); });
  Object.keys(EXTRA_PLAYBOOK).forEach(function (sid) { if (!SCN_PLAYBOOK[sid]) SCN_PLAYBOOK[sid] = EXTRA_PLAYBOOK[sid]; });

  // Worked examples. A fully filled-out, acceptable version of each template so
  // students can see the standard. Most are anchored to one coherent case,
  // SC-T1-01 Brute Force Against RDP, so the set reads like a real case file.
  // The SITREP uses the ransomware case, where a live cadence makes sense.
  // Section shapes: meta (label/value rows), p (paragraphs), ul (bullets),
  // table (headers + rows). All values are simulated for training.
  var EXAMPLES = {
    "incident-report.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Incident Report stands on its own. A future analyst who was not there can read it and know what happened, what was hit, how it was handled, and what to fix. Facts are cited by timestamp and evidence ID.",
      sections: [
        { meta: [
          ["Incident ID", "INC-2026-0418"],
          ["Scenario / Activity", "SC-T1-01 Brute Force Against RDP"],
          ["Analyst name", "A. Rivera (Tier 1)"],
          ["Date and time (UTC)", "2026-04-18 03:05"],
          ["Severity", "High"],
          ["Status", "Closed"]
        ]},
        { h: "1. Executive summary", p: [
          "An internet-exposed RDP service on the finance workstation FIN-WS-07 was brute forced from a single foreign IP address. After roughly 30 minutes of failed attempts the attacker authenticated successfully to the local Administrator account. The source was blocked, public RDP was removed, and the local Administrator credential was reset. No data access or lateral movement was observed before containment."
        ]},
        { h: "2. Detection", meta: [
          ["Detected by", "SIEM alert (account lockout rule) plus service desk report"],
          ["Detection time (UTC)", "2026-04-18 02:38"],
          ["Initial alert or trigger", "Repeated Windows 4625 failures against Administrator on FIN-WS-07"]
        ]},
        { h: "3. Incident timeline", table: {
          headers: ["Time (UTC)", "Source", "Event / action", "Evidence ref"],
          rows: [
            ["02:11:06", "Windows 4625", "First failed logon, Administrator, from 203.0.113.66", "E-01"],
            ["02:11:06 to 02:40", "Windows 4625", "Sustained failures at machine speed, over 600 attempts", "E-01"],
            ["02:38:22", "SIEM", "Lockout-threshold alert raised, ticket opened", "E-03"],
            ["02:41:09", "Windows 4624", "Successful logon, Administrator, from 203.0.113.66 (type 10, RDP)", "E-01"],
            ["02:52:40", "Firewall", "Source IP 203.0.113.66 blocked at perimeter", "E-02"],
            ["02:55:10", "Firewall", "Public RDP rule on FIN-WS-07 removed", "E-02"],
            ["03:01:00", "Endpoint", "Local Administrator password reset, sessions terminated", "E-04"]
          ]
        }},
        { h: "4. Affected systems and accounts", table: {
          headers: ["Asset / account", "Role", "Impact"],
          rows: [
            ["FIN-WS-07", "Finance workstation", "Compromised, Administrator logon achieved"],
            ["Local Administrator (FIN-WS-07)", "Local admin account", "Credential compromised, reset"],
            ["Perimeter firewall", "Network control", "Misconfigured rule corrected"]
          ]
        }},
        { h: "5. Indicators of compromise", table: {
          headers: ["Type", "Indicator", "Context"],
          rows: [
            ["IP", "203.0.113.66", "Brute force source, foreign ASN, flagged malicious in Threat Intel"],
            ["Account", "FIN-WS-07\\Administrator", "Targeted and compromised local account"],
            ["Port", "TCP 3389 (RDP)", "Exposed to the internet by a firewall misconfiguration"]
          ]
        }},
        { h: "6. Analysis", p: [
          "The pattern is a credential-access brute force. Over 600 failures from one external IP in under 30 minutes is far faster than human typing, which rules out a user typo storm. The single 4624 success after the failure run, from the same IP and over RDP logon type 10, confirms the attempt succeeded.",
          "Mapped to MITRE ATT&CK: External Remote Services (T1133) for the exposed RDP, Brute Force: Password Guessing (T1110.001) for the attack, and Valid Accounts: Local Accounts (T1078.003) for the successful logon. No follow-on discovery, persistence, or lateral movement was found in the logs reviewed, which suggests containment landed before the attacker acted on access."
        ]},
        { h: "7. Containment, eradication, and recovery", ul: [
          "Contain: blocked 203.0.113.66 at the perimeter firewall at 02:52 UTC.",
          "Contain: removed the public RDP rule exposing FIN-WS-07, closing the entry vector, at 02:55 UTC.",
          "Eradicate: reset the local Administrator password and terminated all active sessions on the host at 03:01 UTC.",
          "Eradicate: reviewed autoruns, scheduled tasks, and new accounts on FIN-WS-07. None were attacker-created.",
          "Recover: confirmed RDP is now reachable only through the VPN gateway and returned the workstation to service."
        ]},
        { h: "8. Root cause", p: [
          "A firewall change request opened TCP 3389 to the internet for FIN-WS-07 to support a vendor, and the rule was never reviewed or removed. Internet-exposed RDP with a local admin account and no gateway or MFA is the underlying weakness. The brute force was the symptom, not the cause."
        ]},
        { h: "9. Recommendations", ul: [
          "Place all RDP behind the VPN gateway with MFA. Never expose 3389 to the internet.",
          "Add a firewall change-review step so temporary rules expire and get audited.",
          "Enforce account lockout and alert on 4625 bursts from a single external source.",
          "Disable or rename local Administrator and use LAPS-managed unique passwords per host."
        ]}
      ]
    },

    "post-incident-review.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Post-Incident Review is blameless and specific. It measures the response with real numbers, names what worked and what did not, and turns each gap into an owned action item with a due date.",
      sections: [
        { meta: [
          ["Incident ID", "INC-2026-0418"],
          ["Review date", "2026-04-21"],
          ["Analyst", "A. Rivera"]
        ]},
        { h: "1. What happened", p: [
          "Exposed RDP on FIN-WS-07 was brute forced and the local Administrator account was compromised. The SOC blocked the source, removed the exposure, and reset the credential. Containment occurred about 14 minutes after the alert. No data access or spread was observed."
        ]},
        { h: "2. Timeline of the response", table: {
          headers: ["Time", "Who", "Action or decision"],
          rows: [
            ["02:38", "SIEM / Tier 1", "Lockout alert fired, ticket opened, triage started"],
            ["02:44", "Tier 1", "Confirmed brute force pattern and the 4624 success, escalated to Tier 2"],
            ["02:52", "Tier 2 / Network", "Blocked source IP at the perimeter"],
            ["02:55", "Network", "Removed the public RDP firewall rule"],
            ["03:01", "Tier 2", "Reset local Administrator, killed sessions, swept host for persistence"]
          ]
        }},
        { h: "3. Key metrics", meta: [
          ["Time to detect (MTTD)", "27 minutes from first failure to alert"],
          ["Time to respond (MTTR)", "6 minutes from alert to first containment action"],
          ["Time to contain", "14 minutes from alert (source blocked and exposure removed)"],
          ["Time to recover", "23 minutes from alert to host returned to service"]
        ]},
        { h: "4. What went well", ul: [
          "The lockout alert fired correctly and Tier 1 triaged it quickly.",
          "Tier 1 checked for a 4624 success rather than stopping at the failures, which set the correct severity.",
          "Network and SOC coordinated the firewall change without delay."
        ]},
        { h: "5. What did not go well", ul: [
          "RDP was exposed to the internet for weeks because a temporary firewall rule was never reviewed.",
          "There was no alert on a successful logon from an external IP, only on the failures.",
          "The local Administrator account shared a password pattern across finance hosts."
        ]},
        { h: "6. Action items", table: {
          headers: ["Action", "Owner", "Due date", "Status"],
          rows: [
            ["Move all RDP behind VPN gateway with MFA", "J. Okafor", "2026-05-02", "In progress"],
            ["Add expiry and review to firewall change process", "Network lead", "2026-05-09", "Open"],
            ["Create alert: external-source 4624 success", "M. Chen", "2026-04-28", "Open"],
            ["Roll out LAPS for local admin on finance hosts", "Endpoint team", "2026-05-16", "Open"]
          ]
        }},
        { h: "7. Process or control changes", p: [
          "Firewall changes now require an expiry date and a quarterly review. The detection library gains a rule for successful interactive or RDP logons from external addresses. Local administrator passwords on finance hosts move to LAPS so each host is unique."
        ]}
      ]
    },

    "executive-brief.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Executive Brief fits on one page and uses no jargon. A vice president reads it once and understands the business impact, the current status, and what you need from them.",
      sections: [
        { meta: [
          ["Incident ID", "INC-2026-0418"],
          ["Date", "2026-04-18"],
          ["Prepared for", "VP of Operations, CFO"],
          ["Prepared by", "SOC, M. Chen"],
          ["Overall risk", "High, now contained"]
        ]},
        { h: "Bottom line up front", p: [
          "An attacker on the internet guessed the password to a finance computer because remote access to it was left open to the public. We shut off the access, blocked the attacker, and changed the password the same night. We have no evidence that any patient or financial data was opened. The issue is contained."
        ]},
        { h: "Business impact", ul: [
          "Data or systems affected: one finance workstation. No shared drives or patient records were reached.",
          "Operational or financial impact: minimal. The computer was offline for about 20 minutes during cleanup.",
          "Regulatory or reporting implications: no HIPAA-reportable exposure identified. We documented the review in case that assessment changes."
        ]},
        { h: "Current status", p: [
          "Contained. The attacker is blocked, public remote access is removed, and the account password is reset. The computer is back in normal use and under closer monitoring."
        ]},
        { h: "What we are asking for", ul: [
          "Approval to require secure gateway access with a second factor for all remote connections, which prevents this class of attack.",
          "Support for a short review of firewall exceptions so temporary openings cannot be forgotten."
        ]},
        { h: "Next update", p: [
          "A closing note will follow once the remote-access change is complete, expected by May 2, unless new findings require an earlier update."
        ]}
      ]
    },

    "incident-ticket.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Incident Ticket reads like a live case file. Every action has a timestamped line in the work log, escalation is recorded, and the resolution states the outcome plainly.",
      sections: [
        { meta: [
          ["Ticket ID", "INC-2026-0418"],
          ["Opened (UTC)", "2026-04-18 02:38"],
          ["Analyst", "A. Rivera"],
          ["Priority", "P2"],
          ["Category", "Intrusion"],
          ["SLA due", "2026-04-18 06:38 (4h for P2)"]
        ]},
        { h: "Summary", p: [
          "Brute force against internet-exposed RDP on FIN-WS-07 with a confirmed successful Administrator logon."
        ]},
        { h: "Triage notes", p: [
          "Real, not noise. Over 600 Windows 4625 failures from 203.0.113.66 against the Administrator account in under 30 minutes, far above human speed. A 4624 success from the same IP at 02:41 confirms compromise. Priority is P2 because a single host is involved with no evidence yet of spread, but a successful admin logon raises it above routine. Escalating to Tier 2 for containment."
        ]},
        { h: "Work log", table: {
          headers: ["Time (UTC)", "Analyst", "Action / finding"],
          rows: [
            ["02:40", "A. Rivera", "Opened ticket from lockout alert, pulled auth logs for FIN-WS-07"],
            ["02:43", "A. Rivera", "Confirmed 4625 burst from 203.0.113.66, found 4624 success at 02:41"],
            ["02:44", "A. Rivera", "Confirmed IP flagged malicious in Threat Intel, escalated to Tier 2"],
            ["02:52", "M. Chen", "Blocked 203.0.113.66 at the perimeter firewall"],
            ["02:55", "M. Chen", "Removed public RDP rule on FIN-WS-07"],
            ["03:01", "M. Chen", "Reset local Administrator, ended sessions, swept for persistence (none found)"]
          ]
        }},
        { h: "Escalation", meta: [
          ["Escalated to", "M. Chen, Tier 2"],
          ["Escalation time", "2026-04-18 02:44 UTC"],
          ["Reason", "Confirmed successful admin logon from a known-malicious external IP"]
        ]},
        { h: "Resolution", meta: [
          ["Closed (UTC)", "2026-04-18 03:05"],
          ["Outcome", "True positive"],
          ["Summary", "Source blocked, exposure removed, credential reset. No data access or lateral movement observed. Follow-up actions tracked in the Post-Incident Review."]
        ]}
      ]
    },

    "alert-triage-worksheet.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Triage Worksheet is a fast, consistent first pass. It answers all five questions plainly, sets a defensible verdict, and ends with one clear next action.",
      sections: [
        { meta: [
          ["Alert ID", "ALRT-88431"],
          ["Alert time (UTC)", "2026-04-18 02:38"],
          ["Source / rule", "SIEM: account lockout threshold (4625 burst)"],
          ["Analyst", "A. Rivera"]
        ]},
        { h: "1. What fired", p: [
          "An account-lockout rule fired for the local Administrator account on FIN-WS-07, a finance workstation, after a burst of failed logons in a few minutes."
        ]},
        { h: "2. Five triage questions", ul: [
          "Source internal or external, and known? External. 203.0.113.66, a foreign ASN, flagged malicious in Threat Intel.",
          "Action allowed or blocked? The failures were blocked, but a later 4624 shows one attempt was allowed and succeeded.",
          "Rate or pattern normal for this host or user? No. Over 600 failures in under 30 minutes is machine speed, not a user.",
          "Any indicator match known-bad intel? Yes. The source IP is on the malicious list.",
          "Is there a benign explanation? No. The volume, the external source, and the success rule out a typo or a misconfigured service."
        ]},
        { h: "3. Verdict", meta: [
          ["Disposition", "True positive"],
          ["Severity", "High"],
          ["Confidence", "High"]
        ]},
        { h: "4. Next action", p: [
          "Open an incident and escalate to Tier 2 for containment. Justification: a confirmed successful Administrator logon from a known-malicious external IP is an active intrusion, not a Tier 1 close."
        ]}
      ]
    },

    "evidence-log.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Evidence Log keeps the case defensible. Every item is hashed when collected, and every handoff is recorded so there are no gaps in custody.",
      sections: [
        { meta: [
          ["Incident ID", "INC-2026-0418"],
          ["Collected by", "A. Rivera"],
          ["Date opened", "2026-04-18"]
        ]},
        { h: "Evidence items", table: {
          headers: ["Item ID", "Description", "Source", "Collected (UTC)", "Hash (SHA-256)"],
          rows: [
            ["E-01", "Security event log export (4625/4624)", "FIN-WS-07", "02:46", "9f2a7c1e...c7b1"],
            ["E-02", "Firewall log export, RDP and block events", "fw-perimeter-01", "02:58", "4d81be60...a02f"],
            ["E-03", "SIEM alert record and triage notes", "SIEM", "03:03", "b3c9f014...7e55"],
            ["E-04", "Endpoint autoruns and task snapshot", "FIN-WS-07", "03:06", "77a0d2cc...19f4"]
          ]
        }},
        { h: "Chain of custody", table: {
          headers: ["Item ID", "Released by", "Received by", "Date / time", "Purpose"],
          rows: [
            ["E-01", "A. Rivera", "M. Chen", "2026-04-18 02:59", "Tier 2 analysis"],
            ["E-02", "J. Okafor", "M. Chen", "2026-04-18 03:00", "Confirm block and exposure removal"],
            ["E-01..E-04", "M. Chen", "Evidence store (read-only)", "2026-04-18 03:20", "Retention and review"]
          ]
        }},
        { h: "Notes", p: [
          "All exports were hashed at collection with SHA-256 and copied to the read-only evidence share. Access is limited to the SOC incident role. Hashes were re-verified after transfer and matched. Hashes are shown truncated here for readability and stored in full in the evidence record."
        ]}
      ]
    },

    "sitrep.docx": {
      scenario: "SC-T2-01 · Ransomware Detonation and Containment",
      lede: "An acceptable SITREP is short, current, and stands on its own. It is sent on a set cadence during a live incident so leadership always has the latest picture without reading the whole history.",
      sections: [
        { meta: [
          ["Incident ID", "INC-2026-0502"],
          ["SITREP number", "2"],
          ["As of (UTC)", "2026-05-02 14:30"],
          ["Prepared by", "M. Chen, Incident Commander"],
          ["Current severity", "Critical"]
        ]},
        { h: "Current situation", p: [
          "Ransomware was detected on three hosts in the imaging department at 13:40. Encryption is confined to those hosts so far. All three are network-isolated and powered on to preserve memory. Patient care systems are not affected and remain online. We are tracing initial access and checking for spread."
        ]},
        { h: "Actions since last report", ul: [
          "Isolated the three affected hosts on the network without powering them off.",
          "Disabled the service account used to spread the malware and cut its command-and-control traffic.",
          "Confirmed offline backups for the affected shares are intact and recent."
        ]},
        { h: "Next steps", ul: [
          "Sweep the rest of the imaging VLAN for the same indicators.",
          "Identify patient zero and the initial access vector.",
          "Prepare clean restore from offline backup once hosts are cleared."
        ]},
        { h: "Blockers and needs", p: [
          "We need approval to keep the imaging VLAN segmented from the rest of the network for the next several hours while we sweep. This may delay some non-urgent imaging. No decision is needed on ransom. We do not pay and we have clean backups."
        ]},
        { h: "Next report at", p: [
          "2026-05-02 15:30 UTC, or sooner if the situation changes materially."
        ]}
      ]
    },

    "root-cause-analysis.docx": {
      scenario: "SC-T1-01 · Brute Force Against RDP",
      lede: "An acceptable Root Cause Analysis gets past the symptom to the real cause. The five-whys chain ends at something you can fix, and the corrective actions target that cause, not the alert.",
      sections: [
        { meta: [
          ["Incident ID", "INC-2026-0418"],
          ["Analyst", "M. Chen"],
          ["Date", "2026-04-21"]
        ]},
        { h: "Problem statement", p: [
          "An attacker on the public internet was able to brute force and log in to the local Administrator account of a finance workstation. Remote access to that host should never have been reachable from the internet."
        ]},
        { h: "Five whys", table: {
          headers: ["Step", "Question", "Answer"],
          rows: [
            ["Why 1", "Why did the incident occur?", "An attacker guessed the Administrator password over RDP."],
            ["Why 2", "Why was that possible?", "RDP on FIN-WS-07 was reachable from the internet."],
            ["Why 3", "And why was that?", "A temporary firewall rule opened TCP 3389 to the public for a vendor."],
            ["Why 4", "And why was that?", "The rule had no expiry and was never reviewed or removed."],
            ["Why 5", "Root cause?", "The firewall change process has no expiry or periodic review for exceptions."]
          ]
        }},
        { h: "Contributing factors", ul: [
          "People: the vendor access need was met with the fastest option rather than a gateway.",
          "Process: firewall exceptions are not time-boxed or audited.",
          "Technology: the host used a shared local admin password and there was no MFA on remote access."
        ]},
        { h: "Corrective actions", table: {
          headers: ["Action", "Type", "Owner", "Due"],
          rows: [
            ["Require expiry and quarterly review for firewall exceptions", "Preventive", "Network lead", "2026-05-09"],
            ["Move remote access behind VPN gateway with MFA", "Preventive", "J. Okafor", "2026-05-02"],
            ["Alert on successful external-source logons", "Detective", "M. Chen", "2026-04-28"],
            ["Adopt LAPS for unique local admin passwords", "Preventive", "Endpoint team", "2026-05-16"]
          ]
        }}
      ]
    },

    "risk-assessment-report.docx": {
      scenario: "SC-GRC-01 · Risk Assessment: Student Information System",
      lede: "An acceptable risk assessment scopes the system and its data, pairs threats with the weaknesses they exploit, and rates each risk by likelihood and impact. The risk register is what leadership acts on, and every risk has an owner and a treatment.",
      sections: [
        { meta: [
          ["Assessment / Activity", "Annual risk assessment, Banner SIS"],
          ["Scenario", "SC-GRC-01"],
          ["Analyst name", "A. Rivera"],
          ["Date (UTC)", "2026-05-04"],
          ["Systems / scope in scope", "Banner SIS: records, registration, grades"],
          ["Status", "Final"]
        ]},
        { h: "1. Scope and data", p: [
          "The Banner Student Information System holds student education records: enrollment, schedules, grades, and student IDs. Because these are education records, FERPA is the controlling regulation, and a privacy impact is part of every risk here. The assessment follows NIST SP 800-30."
        ]},
        { h: "2. Threats and vulnerabilities", table: {
          headers: ["Threat source", "Vulnerability it exploits", "Existing control"],
          rows: [
            ["Phishing actor targeting staff", "Banner accounts without MFA", "Email filtering only"],
            ["Over-privileged or compromised account", "Access far beyond job duties", "Annual manual review"],
            ["Vendor or integration compromise", "Standing API access to the SIS", "Contract terms only"]
          ]
        }},
        { h: "3. Risk register", table: {
          headers: ["Risk", "Likelihood", "Impact", "Risk level", "Treatment", "Owner"],
          rows: [
            ["Account takeover exposes student records", "High", "High", "High", "Mitigate: enforce MFA on all SIS accounts", "IT Security"],
            ["Excessive access widens a breach", "Medium", "High", "High", "Mitigate: least-privilege cleanup and recertification", "Registrar / IT"],
            ["Integration credential abused", "Low", "High", "Medium", "Mitigate: scope and rotate API credentials", "IT Security"],
            ["Unpatched SIS vulnerability", "Medium", "Medium", "Medium", "Mitigate: align patching to vendor SLAs", "IT Ops"]
          ]
        }},
        { h: "4. Recommendations", ul: [
          "Enforce MFA on every Banner account before the next term.",
          "Run a least-privilege cleanup and stand up quarterly access recertification.",
          "Scope and rotate the integration credentials, removing standing access where possible.",
          "Record all risks and treatments in the risk register and reassess annually."
        ]},
        { h: "5. Review and sign-off", meta: [
          ["Assessed by", "A. Rivera"],
          ["Reviewed by", "CISO"],
          ["Next reassessment date", "2027-05-01"]
        ]}
      ]
    },

    "business-impact-analysis.docx": {
      scenario: "SC-GRC-02 · Business Impact Analysis: LMS",
      lede: "A strong BIA turns a vague fear of downtime into numbers leadership can plan around: how bad the impact is over time, how fast the system must come back, and how much data loss is tolerable. Those numbers drive the recovery plan.",
      sections: [
        { meta: [
          ["Assessment / Activity", "Business impact analysis, Blackboard LMS"],
          ["Scenario", "SC-GRC-02"],
          ["Analyst name", "A. Rivera"],
          ["Date (UTC)", "2026-05-06"],
          ["Systems / scope in scope", "Blackboard LMS: courses, assignments, grades"],
          ["Status", "Final"]
        ]},
        { h: "1. Process or system and the services it supports", p: [
          "Blackboard runs every online course, assignment submission, and grade entry. Students, faculty, and the registrar all depend on it. Impact is highly time-dependent: an outage during finals or an assignment deadline is far worse than one over a holiday."
        ]},
        { h: "2. Impact over time", table: {
          headers: ["Outage duration", "Operational impact", "Financial impact", "Legal / compliance impact"],
          rows: [
            ["Up to 4 hours", "Submissions delayed, frustration", "Negligible", "None"],
            ["1 day", "Missed deadlines, makeup work", "Support cost", "Accommodation requests"],
            ["3+ days during finals", "Grades cannot post, term at risk", "Refund and reputational pressure", "Accreditation and reporting concerns"]
          ]
        }},
        { h: "3. Recovery objectives", meta: [
          ["Recovery time objective (RTO)", "4 hours during peak, 24 hours off-peak"],
          ["Recovery point objective (RPO)", "1 hour (hourly backups)"],
          ["Maximum tolerable downtime (MTD)", "48 hours"]
        ]},
        { h: "4. Dependencies and single points of failure", table: {
          headers: ["Dependency", "Type", "Single point of failure?"],
          rows: [
            ["Single sign-on (identity)", "Upstream", "Yes, no fallback login"],
            ["LMS database", "Internal", "Yes, single primary"],
            ["Content delivery / storage", "Vendor", "No, redundant"]
          ]
        }},
        { h: "5. Recovery priority and recommendation", p: [
          "The LMS is a tier-one system during academic peaks and belongs near the top of the recovery order. The hourly RPO requires verified hourly backups, and the SSO and database single points of failure should be addressed with a fallback login path and database redundancy. Feed these objectives into the disaster recovery plan."
        ]}
      ]
    },

    "vendor-risk-assessment.docx": {
      scenario: "SC-GRC-03 · Vendor Risk Assessment: Tutoring Platform",
      lede: "A solid vendor assessment starts with the data the vendor touches, leans on independent evidence like a SOC 2 and the HECVAT rather than marketing, and ends in a clear decision with conditions and a contract that makes the protections enforceable.",
      sections: [
        { meta: [
          ["Vendor name", "StudyBridge"],
          ["Product / service", "Online tutoring platform"],
          ["Assessor", "A. Rivera"],
          ["Date (UTC)", "2026-05-08"],
          ["Data the vendor will access", "Student names, enrollment, session notes (FERPA)"],
          ["Decision", "Approve with conditions"]
        ]},
        { h: "1. Data and purpose", p: [
          "StudyBridge would hold student names, course enrollment, and tutoring session notes to deliver online tutoring. These are education records, so FERPA applies and the vendor acts as a school official with a legitimate educational interest."
        ]},
        { h: "2. HECVAT review", table: {
          headers: ["Control area", "Vendor response", "Evidence", "Gap / risk"],
          rows: [
            ["MFA on administrative access", "Yes", "HECVAT, SOC 2", "None"],
            ["Encryption in transit", "Yes (TLS 1.2+)", "SOC 2", "None"],
            ["Encryption at rest", "No", "HECVAT", "High: student data unprotected at rest"],
            ["Breach notification commitment", "Within 30 days", "Draft contract", "Medium: too slow, tighten to 72 hours"],
            ["Subprocessor disclosure", "Provided", "HECVAT", "Low: review the analytics subprocessor"]
          ]
        }},
        { h: "3. Documentation reviewed", meta: [
          ["HECVAT received", "Yes (Full)"],
          ["SOC 2 report", "Type II, current"],
          ["Business associate agreement (if PHI)", "Not needed, no PHI"]
        ]},
        { h: "4. Residual risk and recommendation", p: [
          "Residual risk is Medium, driven by the lack of encryption at rest and a slow breach-notification term. Recommendation: approve with conditions. Do not go live until encryption at rest is enabled and the contract is amended to a 72-hour breach-notification window with FERPA school-official terms."
        ]},
        { h: "5. Required remediations", table: {
          headers: ["Remediation", "Owner", "Due date"],
          rows: [
            ["Enable encryption at rest for student data", "StudyBridge", "Before go-live"],
            ["Amend contract: 72-hour breach notice, FERPA terms", "Procurement / Legal", "Before signing"],
            ["Review analytics subprocessor and document", "A. Rivera", "2026-05-22"]
          ]
        }}
      ]
    },

    "compliance-gap-assessment.docx": {
      scenario: "SC-GRC-04 · FERPA Compliance Gap Assessment",
      lede: "A good gap assessment is honest measurement: each requirement marked met, partial, or not met against real evidence, and every gap turned into an owned, dated remediation prioritized by risk.",
      sections: [
        { meta: [
          ["Regulation / standard", "FERPA"],
          ["Scope (systems / offices)", "Registrar, faculty, Banner SIS"],
          ["Assessor", "A. Rivera"],
          ["Date (UTC)", "2026-05-11"],
          ["Overall status", "Partial"]
        ]},
        { h: "1. Scope", p: [
          "This assessment covers how the college handles student education records under FERPA, across the registrar, faculty practice, and the Banner SIS. It focuses on directory information, consent, and disclosure."
        ]},
        { h: "2. Requirements assessment", table: {
          headers: ["Requirement", "Status", "Evidence", "Gap"],
          rows: [
            ["Annual FERPA notification to students", "Met", "Catalog, student email", "None"],
            ["Directory information defined with opt-out", "Partial", "Policy exists", "Opt-out not consistently honored"],
            ["No disclosure of records without consent", "Not met", "Hallway grade posting found", "Grades posted by student ID"],
            ["Access limited to legitimate educational interest", "Partial", "Banner roles", "Over-broad access in some roles"]
          ]
        }},
        { h: "3. Gaps and remediation", table: {
          headers: ["Gap", "Risk", "Remediation", "Owner", "Due"],
          rows: [
            ["Grades posted by identifier", "High", "Stop the practice, train faculty", "Dean of faculty", "2026-05-25"],
            ["Opt-out not honored", "Medium", "Enforce opt-out before any disclosure", "Registrar", "2026-06-01"],
            ["Over-broad SIS access", "Medium", "Least-privilege review", "IT / Registrar", "2026-06-15"]
          ]
        }},
        { h: "4. Compliance summary", p: [
          "The college meets FERPA on notification but falls short on directory-information opt-outs and on a disclosure practice, posting grades by identifier. With the three remediations above closed, the program would move from Partial to substantially compliant. Reassess in one year."
        ]}
      ]
    },

    "security-policy.docx": {
      scenario: "SC-GRC-07 · Data Classification Scheme",
      lede: "A usable policy has a few clear levels, concrete college examples, and handling rules people can actually follow. It is reviewed by the offices that handle the data, approved with an effective date, and made real through training and a check.",
      sections: [
        { meta: [
          ["Policy title", "Data Classification and Handling Policy"],
          ["Owner", "CISO"],
          ["Effective date", "2026-06-01"],
          ["Review cycle", "Annual"],
          ["Version", "1.0"],
          ["Approved by", "Cabinet"]
        ]},
        { h: "1. Purpose and scope", p: [
          "This policy gives the college a common way to classify data by sensitivity so it is handled and protected consistently. It applies to all staff, faculty, and systems that create, store, or share college data."
        ]},
        { h: "2. Policy statements", ul: [
          "1. All college data is classified as Public, Internal, or Restricted.",
          "2. Restricted data includes student education records (FERPA), financial aid data (GLBA), payment card data (PCI), and any protected health information (HIPAA).",
          "3. Restricted data must be encrypted at rest and in transit, with access limited to a documented need.",
          "4. Internal data is for college use and is not shared publicly without owner approval.",
          "5. Data is labeled at its highest applicable level and handled accordingly."
        ]},
        { h: "3. Roles and responsibilities", table: {
          headers: ["Role", "Responsibility"],
          rows: [
            ["Data owner", "Assigns classification and approves access"],
            ["Data custodian (IT)", "Implements the handling and security controls"],
            ["All users", "Label and handle data per its classification"]
          ]
        }},
        { h: "4. Definitions", ul: [
          "Public: approved for release to anyone, for example the course catalog.",
          "Internal: routine college data not intended for the public.",
          "Restricted: regulated or highly sensitive data whose exposure causes harm."
        ]},
        { h: "5. Enforcement and exceptions", p: [
          "Violations are handled under existing staff and student conduct policies. Exceptions require written approval from the data owner and the CISO and are time-limited and reviewed."
        ]},
        { h: "6. Approval and acknowledgment", table: {
          headers: ["Role", "Name", "Date"],
          rows: [
            ["Policy owner (CISO)", "R. Virani", "2026-05-28"],
            ["Leadership approver", "Cabinet", "2026-05-30"]
          ]
        }}
      ]
    },

    "security-program-assessment.docx": {
      scenario: "SC-GRC-12 · Cloud Security Posture: Microsoft 365",
      lede: "A program assessment measures one area against a benchmark with real evidence, separates quick wins from structural problems, and recommends specific owned fixes prioritized by risk. Here the benchmark is the CIS Microsoft 365 benchmark.",
      sections: [
        { meta: [
          ["Program area", "Cloud posture, Microsoft 365 tenant"],
          ["Benchmark / standard", "CIS Microsoft 365 Benchmark"],
          ["Assessor", "A. Rivera"],
          ["Date (UTC)", "2026-05-13"],
          ["Maturity rating", "Developing"]
        ]},
        { h: "1. Scope and benchmark", p: [
          "This assessment measures the college Microsoft 365 tenant (identity, email, files) against the CIS Microsoft 365 benchmark, focusing on MFA, legacy authentication, admin roles, sharing defaults, and audit logging."
        ]},
        { h: "2. Measurements", table: {
          headers: ["Metric / control", "Current state", "Benchmark", "Gap"],
          rows: [
            ["MFA coverage", "68% of accounts", "100%", "32% uncovered"],
            ["Legacy authentication", "Enabled", "Disabled", "Bypasses MFA entirely"],
            ["Global admins", "19", "Fewer than 5, plus break-glass", "Admin sprawl"],
            ["External sharing default", "Anyone with the link", "Restricted", "Open sharing"],
            ["Unified audit log", "On", "On", "None"]
          ]
        }},
        { h: "3. Findings", table: {
          headers: ["Finding", "Risk", "Effort to fix"],
          rows: [
            ["Legacy auth allows MFA bypass", "High", "Low"],
            ["MFA not enforced for all users", "High", "Medium"],
            ["Excessive global admins", "Medium", "Low"]
          ]
        }},
        { h: "4. Recommendations", table: {
          headers: ["Recommendation", "Owner", "Due", "Expected outcome"],
          rows: [
            ["Disable legacy authentication", "M365 admin", "2026-05-20", "MFA can no longer be bypassed"],
            ["Enforce MFA for all users via conditional access", "M365 admin", "2026-05-27", "100% MFA coverage"],
            ["Reduce global admins, add break-glass accounts", "IT Security", "2026-05-30", "Smaller attack surface"]
          ]
        }},
        { h: "5. Maturity summary", p: [
          "The tenant is at a Developing maturity. The highest-value action is disabling legacy authentication and enforcing MFA, which together close the most dangerous gap, MFA bypass. Remeasure after the changes and quarterly thereafter."
        ]}
      ]
    },

    "breach-notification-determination.docx": {
      scenario: "SC-GRC-24 · Stolen Laptop: Risk Determination",
      lede: "Not every lost device is a reportable breach, but every one needs a documented determination. Encryption is usually the deciding fact, and the analysis, not a guess, is what protects the institution. A low-risk finding is documented, never hidden.",
      sections: [
        { meta: [
          ["Incident / activity", "Stolen advisor laptop with student PII"],
          ["Data involved", "Spreadsheet of ~120 student records (names, IDs)"],
          ["Assessor", "A. Rivera"],
          ["Date (UTC)", "2026-05-15"],
          ["Determination", "Low risk (safe harbor)"]
        ]},
        { h: "1. What happened and data involved", p: [
          "An advisor's laptop was stolen from a vehicle. It held a local spreadsheet of roughly 120 student records (names and student IDs). Endpoint logs afterward show failed login attempts from an unfamiliar location, with no confirmed successful logon."
        ]},
        { h: "2. Risk determination", p: [
          "The laptop had full-disk encryption (BitLocker) enabled and verified in the asset record, so a thief cannot read the stored data without the credentials. The post-theft logs show only failed access attempts, with no evidence of successful access or data acquisition. The data is moderately sensitive (FERPA education records) but was not readable.",
          "Weighing encryption, the absence of confirmed access, and the data sensitivity, the risk of harm is low. Full-disk encryption provides a reasonable basis for a safe-harbor determination."
        ]},
        { h: "3. Notification matrix", table: {
          headers: ["Who to notify", "Legal basis", "Deadline", "Method", "Responsible"],
          rows: [
            ["Internal: CISO, registrar", "Internal policy", "Same day", "Incident record", "Analyst"],
            ["Affected students", "FERPA / Texas law", "Not required given encryption", "N/A", "Registrar"],
            ["Law enforcement", "Theft report", "Filed", "Police report", "Advisor"]
          ]
        }},
        { h: "4. Decision and rationale", p: [
          "Because the device was encrypted and there is no evidence the data was accessed, this is a documented low-risk determination and does not trigger student notification under the encryption safe harbor. The determination and its basis are recorded in the incident file."
        ]},
        { h: "5. Approval", meta: [
          ["Reviewed by (legal)", "General Counsel"],
          ["Approved by", "CISO"],
          ["Date", "2026-05-16"]
        ]}
      ]
    },

    "grc-executive-brief.docx": {
      scenario: "SC-GRC-01 · Risk Assessment Executive Brief",
      lede: "An acceptable executive brief fits on one page, uses no jargon, and gives leadership the risk and the ask in the first few lines. It is the same story you tell on camera in the presentation video.",
      sections: [
        { meta: [
          ["Assessment", "Annual risk assessment, Banner SIS"],
          ["Date", "2026-05-04"],
          ["Prepared for", "President's Cabinet"],
          ["Prepared by", "A. Rivera, Security Analyst"],
          ["Overall risk", "High"]
        ]},
        { h: "Bottom line up front", p: [
          "The Student Information System holds FERPA-protected records and carries High risk, driven mainly by accounts without multi-factor authentication. Enforcing MFA would remove most of that risk at low cost. We recommend approving MFA enforcement before the next term."
        ]},
        { h: "Key findings", ul: [
          "Banner accounts are not protected by MFA, making account takeover the top risk.",
          "Access has grown beyond job duties, which would widen any breach.",
          "Integration credentials have standing access with limited oversight."
        ]},
        { h: "Recommendation and the ask", ul: [
          "Approve enforcing MFA on all SIS accounts before the next term.",
          "Approve a least-privilege cleanup and quarterly access recertification.",
          "Resource: brief IT staff time and a short communication to users."
        ]},
        { h: "Cost and effort", p: [
          "MFA is already licensed, so the cost is mainly staff time and user communication. The risk of not acting is a FERPA breach of student records, with the associated notification, reputational, and regulatory consequences."
        ]},
        { h: "Next steps", p: [
          "On approval, IT enforces MFA over a two-week rollout. Leadership receives a completion report and the updated risk register at the end of the term."
        ]}
      ]
    }
  };

  SOC.library = {
    TEMPLATES: TEMPLATES, NIST: NIST, PLAYBOOKS: PLAYBOOKS, EXAMPLES: EXAMPLES,
    nistById: function (id) { for (var i = 0; i < NIST.length; i++) if (NIST[i].id === id) return NIST[i]; return null; },
    exampleFor: function (file) { return EXAMPLES[file] || null; },
    playbookForScenario: function (sid) { return SCN_PLAYBOOK[sid] || null; }
  };
})();
