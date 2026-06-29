// Generates the SOC Range document-template library (.docx) for CYBR 4350.
// Run from project root:  node build/gen-docs.mjs
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat
} from "docx";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "library/templates";
mkdirSync(OUT, { recursive: true });

const BLUE = "1F4E79", LIGHT = "D9E2F3", GRAY = "808080", LINE = "BFBFBF";
const CONTENT_W = 9360;

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

function run(t, o = {}) { return new TextRun({ text: t, ...o }); }
function p(children, o = {}) { return new Paragraph({ children: Array.isArray(children) ? children : [run(children)], ...o }); }

function title(t) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [run(t, { bold: true, size: 36, color: BLUE, font: "Arial" })]
  });
}
function subtitle(t) {
  return new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } },
    children: [run(t, { size: 20, color: GRAY, font: "Arial" })]
  });
}
function note(t) {
  return new Paragraph({
    spacing: { before: 120, after: 160 },
    shading: { fill: "FBF3D5", type: ShadingType.CLEAR },
    children: [run("How to use: ", { bold: true, italics: true, size: 18 }), run(t, { italics: true, size: 18 })]
  });
}
function h2(t) {
  return new Paragraph({
    spacing: { before: 220, after: 100 },
    children: [run(t, { bold: true, size: 24, color: BLUE, font: "Arial" })]
  });
}
function cell(content, { w, fill, bold, italic, color, align } = {}) {
  const kids = (Array.isArray(content) ? content : [content]).map(function (c) {
    return typeof c === "string"
      ? new Paragraph({ alignment: align, children: [run(c, { bold: bold, italics: italic, color: color, size: 20 })] })
      : c;
  });
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill: fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: kids
  });
}
// two-column metadata table: label | fill-in prompt
function metaTable(pairs) {
  const w1 = 2700, w2 = CONTENT_W - w1;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [w1, w2],
    rows: pairs.map(function (pr) {
      return new TableRow({ children: [
        cell(pr[0], { w: w1, fill: LIGHT, bold: true }),
        cell(pr[1] || "Click and type...", { w: w2, italic: true, color: GRAY })
      ]});
    })
  });
}
// full-width writing area with a prompt and blank room
function fillArea(prompt, lines) {
  lines = lines || 3;
  const kids = [new Paragraph({ children: [run(prompt, { italics: true, color: GRAY, size: 20 })] })];
  for (let i = 0; i < lines; i++) kids.push(new Paragraph({ children: [run("", { size: 20 })] }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({ borders, width: { size: CONTENT_W, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: kids })] })]
  });
}
// header row + data prompt rows for a structured table
function gridTable(headers, widths, sampleRows) {
  const rows = [new TableRow({ tableHeader: true, children: headers.map(function (h, i) { return cell(h, { w: widths[i], fill: BLUE, bold: true, color: "FFFFFF" }); }) })];
  (sampleRows || []).forEach(function (r) {
    rows.push(new TableRow({ children: r.map(function (c, i) { return cell(c, { w: widths[i], italic: true, color: GRAY }); }) }));
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: rows });
}
function bullets(items) {
  return items.map(function (t) { return new Paragraph({ numbering: { reference: "b", level: 0 }, children: [run(t, { size: 20 })] }); });
}
// screenshot drop zone: a shaded, bordered box with a clear prompt and room to paste an image
function shot(label, lines) {
  lines = lines || 6;
  const kids = [
    new Paragraph({ children: [run("Paste a screenshot here.", { bold: true, color: BLUE, size: 20 })] }),
    new Paragraph({ children: [run(label, { italics: true, color: GRAY, size: 18 })] })
  ];
  for (let i = 0; i < lines; i++) kids.push(new Paragraph({ children: [run("", { size: 20 })] }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      borders, width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { fill: "EEF3FB", type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: kids
    })] })]
  });
}

function buildDoc(t, children) {
  return new Document({
    numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] }] },
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, right: 1440, bottom: 1300, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("CYBR 4350 :: SOC Range", { size: 16, color: GRAY })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        tabStops: [{ type: "right", position: CONTENT_W }],
        children: [run("San Jacinto College \u00b7 CYBR 4350 Senior Project \u00b7 Prof. R. Virani \u00b7 Simulated data only", { size: 16, color: GRAY }),
          run("\tPage ", { size: 16, color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY })]
      })] }) },
      children: children
    }]
  });
}

const ID_BLOCK = [
  ["Incident ID", ""], ["Scenario / Activity", ""], ["Analyst name", ""],
  ["Date and time (UTC)", ""], ["Severity", "Critical / High / Medium / Low"], ["Status", "Open / In progress / Closed"]
];

// Identity block for the GRC (Governance, Risk and Compliance) assessment templates.
const GRC_ID = [
  ["Assessment / Activity", ""], ["Scenario", ""], ["Analyst name", ""],
  ["Date (UTC)", ""], ["Systems / scope in scope", ""], ["Status", "Draft / Final"]
];

const DOCS = {};

// 1. Incident Report
DOCS["incident-report"] = buildDoc("Incident Report", [
  title("Incident Report"),
  subtitle("Formal record of a security incident, from detection through recovery"),
  note("Complete every section. Write for a future analyst who was not there. State facts, cite evidence by timestamp, and keep opinions in the Analysis section. Paste your screenshots into the boxes provided. This maps to the CySA+ V4 Incident Response and Reporting domains and the NIST SP 800-61r3 lifecycle."),
  metaTable(ID_BLOCK),
  h2("1. Executive summary"),
  fillArea("Two or three sentences a manager can read in ten seconds. What happened, what was affected, and current status.", 3),
  h2("2. Detection"),
  metaTable([["Detected by", "SIEM alert / hunt / user report / other"], ["Detection time (UTC)", ""], ["Initial alert or trigger", ""]]),
  shot("The alert or trigger as it appeared, for example the SIEM alert or the first failed-logon events."),
  h2("3. Incident timeline"),
  gridTable(["Time (UTC)", "Source", "Event / action", "Evidence ref"], [1700, 1700, 4060, 1900],
    [["02:17:43", "Windows 4624", "Successful logon after brute force", "evt-001"]]),
  shot("Key log evidence that backs your timeline, with timestamps and the important fields visible."),
  h2("4. Affected systems and accounts"),
  gridTable(["Asset / account", "Role", "Impact"], [3120, 3120, 3120], [["host-1234", "Workstation", "Compromised"]]),
  h2("5. Indicators of compromise"),
  gridTable(["Type", "Indicator", "Context"], [2200, 3960, 3200], [["IP", "203.0.113.66", "Brute force source"]]),
  h2("6. Analysis"),
  fillArea("What the attacker did and why you assess it that way. Map actions to MITRE ATT&CK tactics and techniques.", 5),
  shot("The smoking-gun evidence behind your analysis, for example the successful logon or the malicious indicator."),
  h2("7. Containment, eradication, and recovery"),
  fillArea("Actions taken, in order, with times. What stopped the bleeding, what removed the threat, and how service was restored.", 5),
  h2("8. Root cause"),
  fillArea("The underlying weakness that allowed this. Not the symptom, the cause.", 3),
  h2("9. Recommendations"),
  ...bullets(["Recommendation 1", "Recommendation 2", "Recommendation 3"])
]);

// 2. Post-Incident Review (Lessons Learned)
DOCS["post-incident-review"] = buildDoc("Post-Incident Review", [
  title("Post-Incident Review"),
  subtitle("Lessons-learned and continuous-improvement record (the post-mortem)"),
  note("Run this after the incident is closed. This is your own review of the incident, not a group meeting. Keep it blameless and focus on what the process did well and where it can improve. NIST SP 800-61r3 folds this into continuous Improvement under the Identify function."),
  metaTable([["Incident ID", ""], ["Review date", ""], ["Analyst", ""]]),
  h2("1. What happened"),
  fillArea("A short, neutral recap of the incident and the response.", 3),
  h2("2. Timeline of the response"),
  gridTable(["Time", "Who", "Action or decision"], [1900, 2200, 5260], [["02:25", "Tier 1", "Escalated to Tier 2"]]),
  shot("Optional: a screenshot of the timeline or metrics you are citing."),
  h2("3. Key metrics"),
  metaTable([["Time to detect (MTTD)", ""], ["Time to respond (MTTR)", ""], ["Time to contain", ""], ["Time to recover", ""]]),
  h2("4. What went well"),
  ...bullets(["Item 1", "Item 2"]),
  h2("5. What did not go well"),
  ...bullets(["Item 1", "Item 2"]),
  h2("6. Action items"),
  gridTable(["Action", "Owner", "Due date", "Status"], [4060, 2100, 1700, 1500], [["Tune detection rule", "Name", "Date", "Open"]]),
  h2("7. Process or control changes"),
  fillArea("Changes to playbooks, detections, training, or controls that this incident justifies.", 4)
]);

// 3. Executive Brief
DOCS["executive-brief"] = buildDoc("Executive Brief", [
  title("Executive Brief"),
  subtitle("One-page incident debrief for leadership and non-technical stakeholders"),
  note("Keep it to one page. No jargon. A vice president should understand the business impact and the ask without a glossary. This is the CySA+ V4 Reporting and Communication skill in practice."),
  metaTable([["Incident ID", ""], ["Date", ""], ["Prepared for", ""], ["Prepared by", ""], ["Overall risk", "Critical / High / Medium / Low"]]),
  h2("Bottom line up front"),
  fillArea("In plain English: what happened, what it means for the business, and what you need from leadership.", 3),
  h2("Business impact"),
  ...bullets(["Data or systems affected", "Operational or financial impact", "Regulatory or reporting implications (for healthcare, name HIPAA exposure)"]),
  h2("Current status"),
  fillArea("Contained or ongoing. What is being done right now.", 2),
  h2("What we are asking for"),
  ...bullets(["Decision or approval needed", "Resources needed"]),
  h2("Next update"),
  fillArea("When leadership will hear from you next.", 1)
]);

// 4. Incident Ticket / Case Record
DOCS["incident-ticket"] = buildDoc("Incident Ticket", [
  title("Incident Ticket / Case Record"),
  subtitle("The working case file a SOC analyst maintains through an incident"),
  note("This mirrors a ticket in a SOAR or ticketing system. Update it as you work. Every action gets a timestamped line in the work log."),
  metaTable([["Ticket ID", ""], ["Opened (UTC)", ""], ["Analyst", ""], ["Priority", "P1 / P2 / P3 / P4"], ["Category", "Malware / Phishing / Intrusion / Data loss / Policy / Other"], ["SLA due", ""]]),
  h2("Summary"),
  fillArea("One line describing the case.", 1),
  h2("Triage notes"),
  fillArea("Initial assessment. Is it real, what is the scope, what is the priority and why.", 3),
  h2("Work log"),
  gridTable(["Time (UTC)", "Analyst", "Action / finding"], [1900, 1900, 5560], [["02:30", "Initials", "Pulled firewall logs for host"]]),
  shot("A screenshot from your investigation, for example the logs or tool output you cited in the work log."),
  h2("Escalation"),
  metaTable([["Escalated to", ""], ["Escalation time", ""], ["Reason", ""]]),
  h2("Resolution"),
  metaTable([["Closed (UTC)", ""], ["Outcome", "True positive / False positive / Benign"], ["Summary", ""]])
]);

// 5. Alert Triage Worksheet
DOCS["alert-triage-worksheet"] = buildDoc("Alert Triage Worksheet", [
  title("Alert Triage Worksheet"),
  subtitle("Tier 1 first-pass assessment of a single alert"),
  note("Use this to decide fast and consistently: real or noise, how urgent, and what next. Aim to finish in a few minutes per alert."),
  metaTable([["Alert ID", ""], ["Alert time (UTC)", ""], ["Source / rule", ""], ["Analyst", ""]]),
  h2("1. What fired"),
  fillArea("Describe the alert in your own words. What rule, what host, what user.", 2),
  shot("The alert as it appeared in the console."),
  h2("2. Five triage questions"),
  ...bullets([
    "Is the source internal or external, and is it known?",
    "Was the action allowed or blocked?",
    "Is the rate or pattern normal for this host or user?",
    "Does any indicator match known-bad threat intel?",
    "Is there a benign explanation that fully accounts for it?"
  ]),
  h2("3. Verdict"),
  metaTable([["Disposition", "True positive / False positive / Needs investigation"], ["Severity", "Critical / High / Medium / Low"], ["Confidence", "High / Medium / Low"]]),
  h2("4. Next action"),
  fillArea("Close as benign, escalate to Tier 2, or open an incident. Justify in one line.", 2)
]);

// 6. Chain of Custody & Evidence Log
DOCS["evidence-log"] = buildDoc("Chain of Custody and Evidence Log", [
  title("Chain of Custody and Evidence Log"),
  subtitle("Record that keeps collected evidence defensible"),
  note("Every piece of evidence gets a row, and every transfer of that evidence gets a custody entry. Gaps in custody can make evidence unusable. Hash files when you collect them."),
  metaTable([["Incident ID", ""], ["Collected by", ""], ["Date opened", ""]]),
  h2("Evidence items"),
  gridTable(["Item ID", "Description", "Source", "Collected (UTC)", "Hash (SHA-256)"], [1300, 2660, 1800, 1700, 1900],
    [["E-01", "Firewall log export", "fw-01", "02:40", "abc123..."]]),
  shot("A screenshot of a key evidence item, for example a log export or the hash output you recorded."),
  h2("Chain of custody"),
  gridTable(["Item ID", "Released by", "Received by", "Date / time", "Purpose"], [1300, 2015, 2015, 2015, 2015],
    [["E-01", "Analyst A", "Analyst B", "02:55", "Analysis"]]),
  h2("Notes"),
  fillArea("Storage location, access controls, and any integrity checks performed.", 3)
]);

// 7. Situation Report (SITREP)
DOCS["sitrep"] = buildDoc("Situation Report (SITREP)", [
  title("Situation Report (SITREP)"),
  subtitle("Periodic status update during an active incident"),
  note("Send on a set cadence during a live incident, for example every 30 or 60 minutes. Short, current, and consistent. Each SITREP stands on its own."),
  metaTable([["Incident ID", ""], ["SITREP number", ""], ["As of (UTC)", ""], ["Prepared by", ""], ["Current severity", "Critical / High / Medium / Low"]]),
  h2("Current situation"),
  fillArea("What is true right now. One short paragraph.", 2),
  shot("Optional: a screenshot that shows the current state, for example a dashboard or an alert count."),
  h2("Actions since last report"),
  ...bullets(["Action 1", "Action 2"]),
  h2("Next steps"),
  ...bullets(["Next step 1", "Next step 2"]),
  h2("Blockers and needs"),
  fillArea("Anything slowing the response or any decision needed.", 2),
  h2("Next report at"),
  fillArea("Time of the next SITREP.", 1)
]);

// 8. Root Cause Analysis (RCA)
DOCS["root-cause-analysis"] = buildDoc("Root Cause Analysis", [
  title("Root Cause Analysis"),
  subtitle("Structured analysis of why the incident was possible"),
  note("Get past the symptom to the real cause. The five-whys method below is a fast way to do it. The fix should target the root, not the symptom."),
  metaTable([["Incident ID", ""], ["Analyst", ""], ["Date", ""]]),
  h2("Problem statement"),
  fillArea("State the failure plainly. What should not have been able to happen, but did.", 2),
  h2("Five whys"),
  gridTable(["Step", "Question", "Answer"], [1200, 3680, 4480],
    [["Why 1", "Why did the incident occur?", ""], ["Why 2", "Why was that possible?", ""], ["Why 3", "And why was that?", ""], ["Why 4", "And why was that?", ""], ["Why 5", "Root cause?", ""]]),
  shot("Evidence that supports your root cause, for example the misconfiguration or the log that proves it."),
  h2("Contributing factors"),
  ...bullets(["People", "Process", "Technology"]),
  h2("Corrective actions"),
  gridTable(["Action", "Type", "Owner", "Due"], [4060, 1900, 1900, 1500], [["Fix", "Preventive / Detective", "Name", "Date"]])
]);

// ---- Governance, Risk and Compliance (GRC) templates ----

// 9. Risk Assessment Report
DOCS["risk-assessment-report"] = buildDoc("Risk Assessment Report", [
  title("Risk Assessment Report"),
  subtitle("Security risk assessment following NIST SP 800-30"),
  note("Scope the system and its data, identify threats against vulnerabilities, rate each risk by likelihood and impact, then recommend an owned treatment. The risk register is the deliverable leadership acts on. Name the laws that apply, for example FERPA for student records. This maps to NIST SP 800-30 and the RMF (SP 800-37)."),
  metaTable(GRC_ID),
  h2("1. Scope and data"),
  fillArea("The system or process assessed, the data it holds, and the laws that apply (FERPA, GLBA, HIPAA, PCI).", 3),
  h2("2. Threats and vulnerabilities"),
  gridTable(["Threat source", "Vulnerability it exploits", "Existing control"], [3120, 3120, 3120],
    [["Phishing actor", "Accounts without MFA", "Email filtering only"]]),
  h2("3. Risk register"),
  gridTable(["Risk", "Likelihood", "Impact", "Risk level", "Treatment", "Owner"], [2460, 1300, 1300, 1300, 1600, 1400],
    [["Account takeover of the SIS", "High", "High", "High", "Mitigate: enforce MFA", "IT Security"]]),
  h2("4. Recommendations"),
  ...bullets(["Recommendation 1", "Recommendation 2", "Recommendation 3"]),
  h2("5. Review and sign-off"),
  metaTable([["Assessed by", ""], ["Reviewed by", ""], ["Next reassessment date", ""]])
]);

// 10. Business Impact Analysis (BIA)
DOCS["business-impact-analysis"] = buildDoc("Business Impact Analysis", [
  title("Business Impact Analysis (BIA)"),
  subtitle("Impact and recovery objectives following NIST SP 800-34"),
  note("Estimate how much a disruption hurts over time, set recovery objectives, and map dependencies. The results feed the disaster recovery plan and set the recovery priority. RTO is how fast you must restore; RPO is how much data loss is tolerable."),
  metaTable(GRC_ID),
  h2("1. Process or system and the services it supports"),
  fillArea("What the system does and who depends on it, for example students during registration.", 3),
  h2("2. Impact over time"),
  gridTable(["Outage duration", "Operational impact", "Financial impact", "Legal / compliance impact"], [1860, 2500, 2500, 2500],
    [["4 hours", "Grades cannot post", "Minimal", "None yet"], ["3 days", "Registration halts", "Refund pressure", "Reporting deadlines at risk"]]),
  h2("3. Recovery objectives"),
  metaTable([["Recovery time objective (RTO)", ""], ["Recovery point objective (RPO)", ""], ["Maximum tolerable downtime (MTD)", ""]]),
  h2("4. Dependencies and single points of failure"),
  gridTable(["Dependency", "Type", "Single point of failure?"], [3120, 3120, 3120], [["Single sign-on", "Upstream", "Yes"]]),
  h2("5. Recovery priority and recommendation"),
  fillArea("Where this system sits in the recovery order and why, and the minimum resources needed to recover it.", 4)
]);

// 11. Third-Party Vendor Risk Assessment (HECVAT)
DOCS["vendor-risk-assessment"] = buildDoc("Third-Party Vendor Risk Assessment", [
  title("Third-Party Vendor Risk Assessment"),
  subtitle("Vendor security review using the HECVAT"),
  note("Assess the security and compliance risk a vendor introduces before signing, and again after any breach. Use the HECVAT questionnaire backed by the vendor's SOC 2 report. For protected health information, confirm a business associate agreement (BAA) is in place."),
  metaTable([["Vendor name", ""], ["Product / service", ""], ["Assessor", ""], ["Date (UTC)", ""], ["Data the vendor will access", ""], ["Decision", "Approve / Approve with conditions / Reject"]]),
  h2("1. Data and purpose"),
  fillArea("What data the vendor will access, why, and which regulations apply (FERPA, GLBA, HIPAA).", 3),
  h2("2. HECVAT review"),
  gridTable(["Control area", "Vendor response", "Evidence", "Gap / risk"], [2200, 2400, 2200, 2560],
    [["MFA on admin access", "Yes", "HECVAT 2.x", "None"], ["Encryption at rest", "No", "-", "High: data unprotected"]]),
  shot("The cover or a key page of the vendor's SOC 2 report or completed HECVAT."),
  h2("3. Documentation reviewed"),
  metaTable([["HECVAT received", "Yes / No"], ["SOC 2 report", "Type I / Type II / None"], ["Business associate agreement (if PHI)", "In place / Not needed / Missing"]]),
  h2("4. Residual risk and recommendation"),
  fillArea("Your residual risk rating and recommendation: approve, approve with conditions, or reject. Justify it.", 3),
  h2("5. Required remediations"),
  gridTable(["Remediation", "Owner", "Due date"], [4560, 2400, 2400], [["Enable encryption at rest before go-live", "Vendor", "Date"]])
]);

// 12. Compliance Gap Assessment
DOCS["compliance-gap-assessment"] = buildDoc("Compliance Gap Assessment", [
  title("Compliance Gap Assessment"),
  subtitle("FERPA, GLBA, PCI-DSS, HIPAA, or NIST 800-171"),
  note("Compare current practice to a regulation or standard, mark each requirement met, partially met, or not met, and turn every gap into an owned, dated remediation. Name the regulation in scope at the top. This maps to NIST SP 800-53A assessment method."),
  metaTable([["Regulation / standard", ""], ["Scope (systems / offices)", ""], ["Assessor", ""], ["Date (UTC)", ""], ["Overall status", "Compliant / Partial / Non-compliant"]]),
  h2("1. Scope"),
  fillArea("The regulation in scope, the systems and offices it covers, and the requirements assessed.", 3),
  h2("2. Requirements assessment"),
  gridTable(["Requirement", "Status", "Evidence", "Gap"], [2700, 1500, 2300, 2860], [["Encryption of covered data", "Not met", "-", "Data stored in clear"]]),
  shot("Evidence supporting a status, for example a configuration screen or a policy excerpt."),
  h2("3. Gaps and remediation"),
  gridTable(["Gap", "Risk", "Remediation", "Owner", "Due"], [2460, 1300, 2400, 1700, 1500], [["No encryption at rest", "High", "Enable disk encryption", "IT", "Date"]]),
  h2("4. Compliance summary"),
  fillArea("Overall compliance status, the most serious gaps, and the reassessment date.", 3)
]);

// 13. Security Policy / Governance Document
DOCS["security-policy"] = buildDoc("Security Policy", [
  title("Security Policy / Governance Document"),
  subtitle("Policy, data classification scheme, or standard"),
  note("Write rules in plain language, with clear roles and enforceable statements. Route for review and approval, set an effective date and a review cycle, and plan how staff will be trained and the policy enforced."),
  metaTable([["Policy title", ""], ["Owner", ""], ["Effective date", ""], ["Review cycle", "Annual / Biennial"], ["Version", ""], ["Approved by", ""]]),
  h2("1. Purpose and scope"),
  fillArea("Why this policy exists and who and what it covers.", 3),
  h2("2. Policy statements"),
  fillArea("The rules themselves, in plain, specific, enforceable language. Number them.", 6),
  h2("3. Roles and responsibilities"),
  gridTable(["Role", "Responsibility"], [3120, 6240], [["Data owner", "Approves access and classification"]]),
  h2("4. Definitions"),
  fillArea("Define any terms a reader needs, for example each data classification level.", 3),
  h2("5. Enforcement and exceptions"),
  fillArea("Consequences for violations and the process to request an exception.", 3),
  h2("6. Approval and acknowledgment"),
  gridTable(["Role", "Name", "Date"], [3120, 3120, 3120], [["Policy owner", "", ""], ["Leadership approver", "", ""]])
]);

// 14. Security Program Assessment
DOCS["security-program-assessment"] = buildDoc("Security Program Assessment", [
  title("Security Program Assessment"),
  subtitle("Maturity review of one program area"),
  note("Measure one area of the security program against a benchmark with real evidence, identify the gaps, and recommend specific owned improvements. Use this for awareness, access governance, cloud posture, insurance readiness, or asset management."),
  metaTable([["Program area", ""], ["Benchmark / standard", ""], ["Assessor", ""], ["Date (UTC)", ""], ["Maturity rating", "Initial / Developing / Defined / Managed"]]),
  h2("1. Scope and benchmark"),
  fillArea("The program area assessed and the standard or benchmark you measured against.", 3),
  h2("2. Measurements"),
  gridTable(["Metric / control", "Current state", "Benchmark", "Gap"], [2700, 2300, 1800, 2560], [["MFA coverage", "68% of accounts", "100%", "32% uncovered"]]),
  shot("Evidence behind a measurement, for example a configuration export, dashboard, or access list."),
  h2("3. Findings"),
  gridTable(["Finding", "Risk", "Effort to fix"], [4560, 2400, 2400], [["Legacy authentication enabled", "High", "Low"]]),
  h2("4. Recommendations"),
  gridTable(["Recommendation", "Owner", "Due", "Expected outcome"], [3060, 1700, 1500, 3100], [["Disable legacy authentication", "IT", "Date", "MFA cannot be bypassed"]]),
  h2("5. Maturity summary"),
  fillArea("Overall maturity, the highest-value improvement, and the date to remeasure.", 3)
]);

// 15. Breach Risk Determination and Notification
DOCS["breach-notification-determination"] = buildDoc("Breach Risk Determination and Notification", [
  title("Breach Risk Determination and Notification"),
  subtitle("Risk-of-harm analysis and notification decision"),
  note("Not every incident is a reportable breach, but every one needs a documented determination. Weigh encryption, evidence of access, and data sensitivity, then map who must be notified, by when, under each law. Document the decision, never hide it."),
  metaTable([["Incident / activity", ""], ["Data involved", ""], ["Assessor", ""], ["Date (UTC)", ""], ["Determination", "Reportable breach / Low risk (safe harbor) / Not a breach"]]),
  h2("1. What happened and data involved"),
  fillArea("The incident, the data potentially exposed, and how much of it.", 3),
  h2("2. Risk determination"),
  fillArea("Weigh the facts: was the data encrypted or otherwise unreadable, is there evidence of access or acquisition, and how sensitive is it. State your conclusion.", 5),
  h2("3. Notification matrix"),
  gridTable(["Who to notify", "Legal basis", "Deadline", "Method", "Responsible"], [2200, 2000, 1600, 1700, 1860],
    [["Affected students", "FERPA / state law", "Without undue delay", "Letter / email", "Registrar"]]),
  h2("4. Decision and rationale"),
  fillArea("The final decision and the reasoning behind it.", 3),
  h2("5. Approval"),
  metaTable([["Reviewed by (legal)", ""], ["Approved by", ""], ["Date", ""]])
]);

// 16. GRC Executive Brief
DOCS["grc-executive-brief"] = buildDoc("GRC Executive Brief", [
  title("GRC Executive Brief"),
  subtitle("One-page assessment debrief for leadership"),
  note("Keep it to one page and free of jargon. Leadership should grasp the risk and your recommendation without a glossary. This is the deliverable you also present on camera."),
  metaTable([["Assessment", ""], ["Date", ""], ["Prepared for", ""], ["Prepared by", ""], ["Overall risk", "Critical / High / Medium / Low"]]),
  h2("Bottom line up front"),
  fillArea("In plain English: what you assessed, the headline finding, and what you recommend.", 3),
  h2("Key findings"),
  ...bullets(["Finding 1", "Finding 2", "Finding 3"]),
  h2("Recommendation and the ask"),
  ...bullets(["What you recommend", "Decision or approval needed", "Resources needed"]),
  h2("Cost and effort"),
  fillArea("Rough cost and effort of acting, and the risk of not acting.", 2),
  h2("Next steps"),
  fillArea("What happens next and when leadership will hear from you again.", 2)
]);

let n = 0;
const names = {
  "incident-report": "Incident Report",
  "post-incident-review": "Post-Incident Review (Lessons Learned)",
  "executive-brief": "Executive Brief",
  "incident-ticket": "Incident Ticket (Case Record)",
  "alert-triage-worksheet": "Alert Triage Worksheet",
  "evidence-log": "Chain of Custody and Evidence Log",
  "sitrep": "Situation Report (SITREP)",
  "root-cause-analysis": "Root Cause Analysis",
  "risk-assessment-report": "Risk Assessment Report",
  "business-impact-analysis": "Business Impact Analysis (BIA)",
  "vendor-risk-assessment": "Third-Party Vendor Risk Assessment (HECVAT)",
  "compliance-gap-assessment": "Compliance Gap Assessment",
  "security-policy": "Security Policy / Governance Document",
  "security-program-assessment": "Security Program Assessment",
  "breach-notification-determination": "Breach Risk Determination and Notification",
  "grc-executive-brief": "GRC Executive Brief"
};
const tasks = Object.keys(DOCS).map(function (k) {
  return Packer.toBuffer(DOCS[k]).then(function (buf) { writeFileSync(OUT + "/" + k + ".docx", buf); n++; });
});
Promise.all(tasks).then(function () { console.log("Wrote " + n + " templates to " + OUT); console.log(JSON.stringify(names, null, 0)); });
