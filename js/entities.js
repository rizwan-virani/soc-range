/* SOC Range :: entities.js
 * Deterministic entity tables and the organizational asset universe.
 * Every screen derives identical entities from the same seed, so the attacker
 * IP on the Network map equals the attacker IP in the SIEM equals the IOC in
 * Threat Intel. Correlation is guaranteed by construction.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  // ---- The fictional organization: "Brazos Valley Health Network" ----
  // A regional healthcare org, chosen so HIPAA, finance, and clinical
  // scenarios all have a believable home. Students get a consistent world.
  var ORG = {
    name: "Brazos Valley Health Network",
    domain: "bvhn.org",
    departments: ["FIN", "HR", "CLIN", "IT", "RAD", "LAB", "EXEC", "PHARM", "BILL", "SOC"]
  };

  // Internal hosts. Roles drive which logs they plausibly emit.
  var INTERNAL_HOSTS = [
    { name: "DC-01", role: "domain-controller", ip: "10.10.0.5" },
    { name: "DC-02", role: "domain-controller", ip: "10.10.0.6" },
    { name: "SRV-WEB-01", role: "web-server", ip: "10.10.1.20" },
    { name: "SRV-SQL-01", role: "database", ip: "10.10.1.30" },
    { name: "SRV-FILE-01", role: "file-server", ip: "10.10.1.40" },
    { name: "SRV-EHR-01", role: "ehr-app", ip: "10.10.1.55" },
    { name: "SRV-BACKUP-01", role: "backup", ip: "10.10.1.60" },
    { name: "FIN-WS-12", role: "workstation", ip: "10.20.4.12", user: "rgarcia", dept: "FIN" },
    { name: "FIN-WS-08", role: "workstation", ip: "10.20.4.8", user: "twright", dept: "FIN" },
    { name: "HR-WS-03", role: "workstation", ip: "10.20.5.3", user: "mlopez", dept: "HR" },
    { name: "CLIN-WS-21", role: "workstation", ip: "10.20.6.21", user: "dpatel", dept: "CLIN" },
    { name: "CLIN-WS-44", role: "workstation", ip: "10.20.6.44", user: "achen", dept: "CLIN" },
    { name: "RAD-WS-09", role: "workstation", ip: "10.20.7.9", user: "kobrien", dept: "RAD" },
    { name: "IT-WS-02", role: "workstation", ip: "10.20.9.2", user: "jsmith", dept: "IT" },
    { name: "EXEC-WS-01", role: "workstation", ip: "10.20.1.1", user: "cwilson", dept: "EXEC" },
    { name: "BILL-WS-17", role: "workstation", ip: "10.20.8.17", user: "nadams", dept: "BILL" }
  ];

  var USERS = [
    { sam: "rgarcia", name: "Rosa Garcia", dept: "FIN", title: "AP Specialist" },
    { sam: "twright", name: "Tomas Wright", dept: "FIN", title: "Controller" },
    { sam: "mlopez", name: "Maria Lopez", dept: "HR", title: "HR Generalist" },
    { sam: "dpatel", name: "Divya Patel", dept: "CLIN", title: "RN" },
    { sam: "achen", name: "Amy Chen", dept: "CLIN", title: "Nurse Manager" },
    { sam: "kobrien", name: "Kevin OBrien", dept: "RAD", title: "Radiology Tech" },
    { sam: "jsmith", name: "Jordan Smith", dept: "IT", title: "Sysadmin" },
    { sam: "cwilson", name: "Carol Wilson", dept: "EXEC", title: "CFO" },
    { sam: "nadams", name: "Neil Adams", dept: "BILL", title: "Billing Lead" },
    { sam: "svc_backup", name: "svc_backup", dept: "IT", title: "Service Account" },
    { sam: "svc_sql", name: "svc_sql", dept: "IT", title: "Service Account" },
    { sam: "svc_scan", name: "svc_scan", dept: "IT", title: "Service Account" }
  ];

  // Benign external destinations so normal egress looks normal.
  var BENIGN_EXTERNAL = [
    { host: "outlook.office365.com", ip: "52.96.40.10" },
    { host: "teams.microsoft.com", ip: "52.113.194.132" },
    { host: "update.microsoft.com", ip: "20.190.150.1" },
    { host: "clients.google.com", ip: "142.250.80.14" },
    { host: "slack.com", ip: "3.89.5.12" },
    { host: "github.com", ip: "140.82.112.3" },
    { host: "cdn.jsdelivr.net", ip: "151.101.1.229" },
    { host: "epic-ehr-cloud.com", ip: "63.32.11.40" },
    { host: "zoom.us", ip: "170.114.52.2" }
  ];

  // Geo points used by the Network threat map. lat/lon roughly placed.
  var GEO = {
    "Houston, US": { lat: 29.76, lon: -95.37 },
    "Ashburn, US": { lat: 39.04, lon: -77.49 },
    "Moscow, RU": { lat: 55.75, lon: 37.62 },
    "Beijing, CN": { lat: 39.90, lon: 116.40 },
    "Pyongyang, KP": { lat: 39.03, lon: 125.75 },
    "Tehran, IR": { lat: 35.69, lon: 51.39 },
    "Lagos, NG": { lat: 6.52, lon: 3.37 },
    "Sao Paulo, BR": { lat: -23.55, lon: -46.63 },
    "Kyiv, UA": { lat: 50.45, lon: 30.52 },
    "Amsterdam, NL": { lat: 52.37, lon: 4.90 },
    "Singapore, SG": { lat: 1.35, lon: 103.82 },
    "Mumbai, IN": { lat: 19.08, lon: 72.88 }
  };
  // Home location of the SOC, used as the destination for inbound arcs.
  var HOME_GEO = GEO["Houston, US"];

  var ADVERSARY_LOCATIONS = [
    "Moscow, RU", "Beijing, CN", "Pyongyang, KP", "Tehran, IR",
    "Lagos, NG", "Sao Paulo, BR", "Kyiv, UA", "Singapore, SG", "Amsterdam, NL"
  ];

  // Build the full entity table for a scenario seed. Returns resolvable refs.
  function buildEntities(seed) {
    var rng = SOC.prng.makeRng("ent:" + seed);

    function pubIp() {
      return rng.int(11, 223) + "." + rng.int(0, 255) + "." +
             rng.int(0, 255) + "." + rng.int(1, 254);
    }

    var victimHost = rng.pick(INTERNAL_HOSTS.filter(function (h) {
      return h.role === "workstation";
    }));
    var advLoc = rng.pick(ADVERSARY_LOCATIONS);
    var advLoc2 = rng.pick(ADVERSARY_LOCATIONS);
    var compromisedUser = rng.pick(USERS.filter(function (u) {
      return u.sam.indexOf("svc_") !== 0;
    }));
    var insiderUser = rng.pick(USERS.filter(function (u) {
      return u.sam.indexOf("svc_") !== 0 && u.sam !== compromisedUser.sam;
    }));

    return {
      org: ORG,
      "ip.c2": pubIp(),
      "ip.c2_alt": pubIp(),
      "ip.attacker": pubIp(),
      "ip.exfil": pubIp(),
      "ip.victim": victimHost.ip,
      "ip.dc": "10.10.0.5",
      "host.victim": victimHost.name,
      "host.dc": "DC-01",
      "host.file": "SRV-FILE-01",
      "host.web": "SRV-WEB-01",
      "host.ehr": "SRV-EHR-01",
      "host.db": "SRV-DB-01",
      "host.app": "SRV-APP-01",
      "ip.attacker2": pubIp(),
      "user.victim": victimHost.user || compromisedUser.sam,
      "user.compromised": compromisedUser.sam,
      "user.compromised_name": compromisedUser.name,
      "user.admin": "jsmith",
      "user.svc": "svc_backup",
      "user.insider": insiderUser.sam,
      "user.insider_name": insiderUser.name,
      "user.finance": "afranklin",
      "hash.malware": rng.hex(64),
      "hash.tool": rng.hex(64),
      "hash.doc": rng.hex(64),
      "domain.c2": "cdn-" + rng.hex(6) + ".telemetry-sync.net",
      "domain.phish": "bvhn-" + rng.hex(4) + "-secure.com",
      "domain.exfil": "files-" + rng.hex(5) + ".dropzone-cloud.io",
      "domain.cloud": "drive-" + rng.hex(4) + ".megastore-files.com",
      "url.phish": "https://bvhn-" + rng.hex(4) + "-secure.com/login",
      "geo.adversary": advLoc,
      "geo.adversary2": advLoc2,
      "aws.bucket": "bvhn-patient-exports-" + rng.hex(4),
      "aws.access_key": "AKIA" + rng.hex(16).toUpperCase(),
      "token.session": "ey" + rng.hex(28),
      "ticketSeed": rng.int(1000, 9999)
    };
  }

  SOC.entities = {
    ORG: ORG,
    INTERNAL_HOSTS: INTERNAL_HOSTS,
    USERS: USERS,
    BENIGN_EXTERNAL: BENIGN_EXTERNAL,
    GEO: GEO,
    HOME_GEO: HOME_GEO,
    ADVERSARY_LOCATIONS: ADVERSARY_LOCATIONS,
    buildEntities: buildEntities
  };
})();
