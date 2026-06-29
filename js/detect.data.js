/* SOC Range :: detect.data.js
 * Detection Engineering Lab activities. Each one asks the student to write a
 * Sigma rule that catches a specific attack behavior in a scenario's logs
 * without firing on the benign noise around it. Graded fully in the browser.
 *
 * a(id, title, scenarioId, points, targetTemplates, prompt, hint, solution, explain)
 */
(function () {
  var SOC = self.SOC || (self.SOC = {});
  var A = [];
  function a(id, title, scenarioId, points, targets, prompt, hint, solution, explain) {
    A.push({ id: id, title: title, scenarioId: scenarioId, points: points, targets: targets,
      prompt: prompt, hint: hint, solution: solution, explain: explain });
  }

  a("det-01", "Hidden scheduled task", "SC-T1-08", 10, ["sched_task"],
    "A scheduled task was created to run a hidden PowerShell payload. Write a Sigma rule that flags the task-creation event without alerting on normal logons.",
    "Windows logs the creation of a scheduled task as Event ID 4698. Benign noise never uses that ID.",
    "title: Suspicious scheduled task created\nlogsource:\n  product: windows\ndetection:\n  selection:\n    EventID: 4698\n  condition: selection",
    "Event ID 4698 marks scheduled-task creation. A bare task is not always evil, but it is rare enough that alerting on creation and reviewing is sound, and the noise here never uses 4698 so precision stays perfect.");

  a("det-02", "Security tooling disabled", "SC-T1-09", 10, ["defender_off"],
    "Defender real-time protection was turned off on a host. Write a rule that detects the tamper.",
    "Defender records protection state changes as Event ID 5001. Try matching that, then tighten with the command line.",
    "title: Defender real-time protection disabled\nlogsource:\n  product: windows\ndetection:\n  selection:\n    EventID: 5001\n  cmd:\n    raw|contains: Set-MpPreference\n  condition: selection and cmd",
    "Defense evasion is a strong early signal. Event 5001 plus the Set-MpPreference command line catches the scripted tamper with zero false positives.");

  a("det-03", "SQL injection on the portal", "SC-T1-04", 10, ["web_sqli"],
    "An attacker is probing the patient portal with SQL injection. Write a rule that catches the injection attempts in the web logs.",
    "The web events tag the attack type in a field, and the request contains a UNION SELECT.",
    "title: SQL injection attempt\nlogsource:\n  product: web\ndetection:\n  selection:\n    attack: sqli\n  condition: selection",
    "Matching the normalized attack field is cleaner than chasing payload strings. Benign web traffic has no attack tag, so precision is perfect.");

  a("det-04", "Large data exfiltration", "SC-T2-09", 15, ["exfil_https"],
    "Before the ransomware fired, a very large outbound transfer left the network. Write a rule that flags only the bulk transfer, not ordinary traffic.",
    "Normal firewall noise has no byte count. The exfiltration event does, and it is huge. Use a numeric threshold.",
    "title: Large outbound transfer\nlogsource:\n  product: firewall\ndetection:\n  selection:\n    bytes|gt: 50000000\n  condition: selection",
    "Threshold detection is a core technique. Fifty megabytes in one flow is well above normal, and the benign noise carries no byte field, so nothing else matches.");

  a("det-05", "C2 beaconing", "SC-T2-12", 15, ["c2_beacon"],
    "A host is beaconing to command and control on a regular interval. Write a rule that flags the beacon traffic.",
    "The beacon events name the C2 in the message and note the regular interval in the raw log.",
    "title: Periodic C2 beacon\nlogsource:\n  product: firewall\ndetection:\n  selection:\n    message|contains: C2\n  condition: selection",
    "Real beacon detection keys on periodicity. Here the message names the suspected C2, which separates it cleanly from ordinary allowed traffic.");

  a("det-06", "Encoded PowerShell cradle", "SC-T1-08", 10, ["ps_encoded"],
    "A PowerShell download cradle ran on a workstation. Write a rule that detects the script-block execution.",
    "PowerShell script-block logging is Event ID 4104. The cradle uses DownloadString.",
    "title: PowerShell download cradle\nlogsource:\n  product: windows\ndetection:\n  selection:\n    EventID: 4104\n  cradle:\n    raw|contains: DownloadString\n  condition: selection and cradle",
    "Script-block logging (4104) plus the DownloadString call pinpoints the cradle. Combining two conditions with and is how you keep a rule specific.");

  a("det-07", "DNS tunneling", "SC-T2-08", 15, ["dns_tunnel"],
    "Data is leaving over DNS as high-entropy TXT queries. Write a rule that flags the tunneling.",
    "The suspicious lookups are TXT records. Normal name resolution in the noise is not TXT.",
    "title: DNS TXT tunneling\nlogsource:\n  product: syslog\ndetection:\n  selection:\n    qtype: TXT\n  condition: selection",
    "Bulk TXT queries to one domain are a tunneling hallmark. Matching the TXT query type isolates them from ordinary DNS.");

  a("det-08", "Forged Kerberos ticket", "SC-T3-06", 20, ["golden_ticket"],
    "A golden ticket with an impossible lifetime is in use. Write a rule that detects the forged ticket.",
    "The ticket event is 4769, and the giveaway is the ten-year lifetime in the log.",
    "title: Forged Kerberos golden ticket\nlogsource:\n  product: windows\ndetection:\n  selection:\n    EventID: 4769\n  anomaly:\n    raw|contains: 10y\n  condition: selection and anomaly",
    "Normal tickets do not last ten years. Pairing the 4769 event with the absurd lifetime catches the forgery without touching legitimate Kerberos traffic.");

  a("det-09", "Mass file encryption", "SC-T2-09", 15, ["file_encrypt"],
    "Ransomware is renaming files across a share. Write a rule that detects the encryption burst.",
    "The encrypted files all get the same new extension. Match on that ending.",
    "title: Ransomware mass file rename\nlogsource:\n  product: windows\ndetection:\n  selection:\n    ext|endswith: .lockbvhn\n  condition: selection",
    "The shared ransom extension is a precise indicator. Endswith matching on it flags the encryption event and nothing else.");

  a("det-10", "RDP brute force (precision)", "SC-T1-01", 15, ["rdp_fail"],
    "An attacker is brute forcing RDP. The trick: failed logons are everywhere in normal noise. Write a rule that catches the RDP attempts while minimizing false positives.",
    "Failed logons are Event ID 4625, but that alone is noisy. RDP is logon type 10. Combine them.",
    "title: RDP brute force\nlogsource:\n  product: windows\ndetection:\n  selection:\n    EventID: 4625\n    LogonType: 10\n  badpw:\n    raw|contains: 0xC000006A\n  condition: selection and badpw",
    "This is the precision lesson. A bare 4625 rule drowns you in false positives from normal failed logons. Adding logon type 10 narrows it to remote-desktop attempts.");

  SOC.detectLab = { activities: A, byId: function (id) { for (var i = 0; i < A.length; i++) if (A[i].id === id) return A[i]; return null; } };
})();
