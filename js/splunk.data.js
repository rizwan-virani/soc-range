/* SOC Range :: splunk.data.js
 * Builds a deterministic, Splunk-style event set (index=main) from the log
 * engine, plus 15 graded SPL activities for students who hold the Splunk Core
 * Certified Power User credential. Each activity carries a reference SPL
 * solution; the lab computes the expected answer by running it, so nothing is
 * hard-coded and every task is guaranteed solvable in the lab.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});
  var ENT = SOC.entities, LE = SOC.logEngine;

  var ST = { windows: "WinEventLog:Security", syslog: "linux:syslog", firewall: "cisco:asa", cloudtrail: "aws:cloudtrail", web: "access_combined" };

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmt(ts) {
    var d = new Date(ts);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " +
      pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
  }

  function splunkify(e) {
    var row = {
      _epoch: e.ts, _time: fmt(e.ts), index: "main", source: e.source,
      sourcetype: ST[e.source] || e.source, host: e.host || "-",
      src_ip: e.src_ip || null, dst_ip: e.dst_ip || null, user: e.user || null,
      severity: e.severity || "info", mitre: e.mitre || null, _raw: e.raw
    };
    if (e.fields) Object.keys(e.fields).forEach(function (k) { row[k] = e.fields[k]; });
    // Splunk-style auto field extraction of key=value pairs from _raw
    var re = /([A-Za-z_][\w.]*)=("[^"]*"|[^\s,]+)/g, m;
    while ((m = re.exec(e.raw))) { var k = m[1], v = m[2].replace(/^"|"$/g, ""); if (row[k] === undefined) row[k] = v; }
    if (row.src_ip == null && row.src) row.src_ip = row.src;
    if (row.dst_ip == null && row.dst) row.dst_ip = row.dst;
    if (row.user == null && row.User) row.user = row.User;
    return row;
  }

  function build() {
    var SEED = "splunk-lab-01";
    var rng = SOC.prng.makeRng("splunk:" + SEED);
    var en = ENT.buildEntities(SEED);
    var base = Date.UTC(2026, 5, 1, 8, 0, 0);
    var ev = [];
    function push(offset, template, params) { ev.push(LE.renderEvent({ template: template, params: params }, rng, en, base + offset * 1000)); }

    var i;
    for (i = 0; i < 18; i++) push(2 + i * 4, "rdp_fail");          // brute force
    push(80, "rdp_success");                                        // success
    for (i = 0; i < 16; i++) push(5 + i * 3, "port_scan");          // scan
    for (i = 0; i < 8; i++) push(180 + i * 60, "c2_beacon", { bytes: 1180 + i }); // beacon /60s
    push(300, "exfil_https", { mb: 420 }); push(360, "exfil_https", { mb: 180 }); push(420, "exfil_https", { mb: 30 });
    for (i = 0; i < 5; i++) push(120 + i * 5, "web_sqli");          // sqli probes
    push(150, "web_sqli", { success: true });                       // sqli success
    push(200, "ct_public_bucket");                                  // s3 public
    for (i = 0; i < 4; i++) push(240 + i * 8, "kerberoast");        // kerberoast
    // benign noise spread across the 20-minute window
    for (i = 0; i < 380; i++) ev.push(LE.makeNoise(rng, en, base + rng.int(0, 1200) * 1000));

    ev.sort(function (a, b) { return a.ts - b.ts; });
    var rows = ev.map(splunkify);

    var ti = {};
    ti[en["ip.attacker"]] = { verdict: "malicious", threat: "brute-force" };
    ti[en["ip.c2"]] = { verdict: "malicious", threat: "c2" };
    ti[en["ip.exfil"]] = { verdict: "malicious", threat: "exfil" };
    if (SOC.spl) SOC.spl.setLookup("threat_intel", ti);

    return { rows: rows, en: en, count: rows.length, start: base, end: base + 1200000, activities: activities(en) };
  }

  function a(id, concept, points, prompt, hint, solution, col, explain) {
    return { id: id, concept: concept, points: points, prompt: prompt, hint: hint, solution: solution, answer: { row: 0, col: col }, explain: explain };
  }

  function activities(en) {
    var atk = en["ip.attacker"], c2 = en["ip.c2"], exf = en["ip.exfil"];
    return [
      a("spl-01", "Search and stats count", 60,
        "How many failed Windows logons (EventID 4625) came from the brute-force source IP?",
        "Filter on EventID and the source IP, then pipe to stats count.",
        "index=main EventID=4625 src_ip=" + atk + " | stats count", "count",
        "A base search narrows events, and the stats count transforming command reduces them to a single number."),
      a("spl-02", "top", 70,
        "Which single source IP generated the most failed logons? Use the top command.",
        "top returns the most common values of a field with counts and percentages.",
        "EventID=4625 | top 1 src_ip", "src_ip",
        "top is a quick transforming command for ranking field values by frequency."),
      a("spl-03", "stats by and sort", 80,
        "Which user account was targeted by the brute force?",
        "Group with stats count by user, then sort descending and keep the first row.",
        "EventID=4625 src_ip=" + atk + " | stats count by user | sort -count | head 1 | table user", "user",
        "stats ... by groups events, and sort -count orders the groups so the top one is the target."),
      a("spl-04", "Combining filters", 70,
        "Did the brute force succeed? Count successful logons (4624) from the same source IP.",
        "Combine EventID=4624 with the source IP filter, then stats count.",
        "EventID=4624 src_ip=" + atk + " | stats count", "count",
        "One success after a storm of failures confirms the brute force worked. Internal noise is excluded by the source IP."),
      a("spl-05", "dc (distinct count)", 80,
        "How many distinct destination ports did the scanner probe? Use dc().",
        "Filter to the scanner source and denied traffic, then stats dc(dport).",
        "src_ip=" + atk + " action=DENY | stats dc(dport) as ports", "ports",
        "dc() counts unique values, the right tool for measuring the spread of a horizontal scan."),
      a("spl-06", "timechart", 90,
        "Chart the C2 traffic with timechart span=5m. What is the highest count in any one bucket?",
        "timechart buckets by time. Sort the result and take the top bucket.",
        "dst_ip=" + c2 + " | timechart span=5m count | sort -count | head 1 | table count", "count",
        "timechart reveals periodicity. The steady beacon stacks up predictably across the time buckets."),
      a("spl-07", "Filter by destination", 60,
        "How many total beacons reached the C2 server during the shift?",
        "Filter on the C2 destination IP and count.",
        "dst_ip=" + c2 + " | stats count", "count",
        "Counting connections to a known-bad destination sizes the beacon activity."),
      a("spl-08", "eval and round", 90,
        "Convert bytes to megabytes with eval, then find the largest single transfer (in MB).",
        "Use eval mb=round(bytes/1048576,0), then sort by mb and take the top.",
        "sourcetype=cisco:asa bytes>0 | eval mb=round(bytes/1048576,0) | sort -mb | head 1 | table mb", "mb",
        "eval creates calculated fields. round keeps the result readable. This is core Power-User work."),
      a("spl-09", "where vs search", 90,
        "Use where to count firewall events that moved more than 50 MB (52428800 bytes).",
        "where evaluates an expression against fields: where bytes>52428800.",
        "sourcetype=cisco:asa | where bytes>52428800 | stats count", "count",
        "where filters on evaluated expressions and field comparisons, unlike the keyword-style base search."),
      a("spl-10", "Web log fields", 70,
        "How many SQL-injection requests returned a successful HTTP 200?",
        "Filter the web events on the attack and status fields, then count.",
        "attack=sqli status=200 | stats count", "count",
        "A 200 on an injection request means data came back. Status-code analysis is everyday SOC work."),
      a("spl-11", "Search CloudTrail", 60,
        "Which CloudTrail eventName made cloud storage public?",
        "Search the aws:cloudtrail sourcetype for the bucket ACL change.",
        "sourcetype=aws:cloudtrail eventName=PutBucketAcl | head 1 | table eventName", "eventName",
        "Cloud audit events are searchable like any other source once the sourcetype is known."),
      a("spl-12", "rare", 70,
        "Use rare to find the least common sourcetype in the index.",
        "rare is the inverse of top.",
        "| rare 1 sourcetype | table sourcetype", "sourcetype",
        "rare surfaces the unusual. Low-volume sourcetypes are often where interesting events hide."),
      a("spl-13", "dc on hosts", 60,
        "How many unique hosts appear across the whole dataset?",
        "stats dc(host) gives a distinct count in one step.",
        "| stats dc(host) as hosts", "hosts",
        "Distinct counts quickly size an environment or the scope of an incident."),
      a("spl-14", "lookup", 100,
        "Enrich firewall traffic with the threat_intel lookup. Which malicious IP received exfiltrated data?",
        "lookup threat_intel ip as dst_ip OUTPUT verdict threat, then search threat=exfil.",
        "sourcetype=cisco:asa | lookup threat_intel ip as dst_ip OUTPUT verdict threat | search threat=exfil | top 1 dst_ip", "dst_ip",
        "Lookups add context from external tables, turning a bare IP into an enriched, actionable indicator."),
      a("spl-15", "AD detection with stats", 80,
        "How many Kerberos service-ticket requests (EventID 4769) point to kerberoasting?",
        "Filter on EventID 4769 and count.",
        "EventID=4769 | stats count", "count",
        "A burst of 4769 events with weak encryption is the kerberoasting signature. stats sizes it fast.")
    ];
  }

  SOC.splunkLab = { build: build, splunkify: splunkify };
})();
