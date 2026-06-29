# Simulated SOC Platform: Software Design, System Requirements, and Curriculum Blueprint

**Program:** San Jacinto College, Bachelor of Applied Technology (BAT) in Cybersecurity
**Deliverable:** Senior Capstone SOC Simulation Platform
**Hosting target:** GitHub Pages or custom static domain (zero server-side database)
**Reference platform analyzed:** `https://mqaissaunee-bcc.github.io/SOC/` (version 0.4.0, four-screen client-side SOC)

A formatting note for any downstream developer or AI assistant who edits this file: the prose deliberately uses the word "and" in place of the ampersand symbol, and avoids em dashes. Code blocks use standard operators where syntactically required.

---

## PART 1: Reverse-Engineering and Technical Requirements

### 1.0 What the reference platform actually is

The target is a fully static, client-rendered application. It ships as a set of independent HTML pages with no backend. The observable surface consists of:

- A hub page (`index.html`) that links out to each screen.
- Four standalone screen pages: SIEM Dashboard, Network Monitor with a global threat map, Incident Response case management, and Threat Intelligence correlation.
- A multi-screen viewer (`soc-multi-screen.html`) that renders the four screens inside a 2x2 grid of iframes, with checkboxes to toggle each quadrant.
- A guided pre-training lesson page.
- Two editions of the training exercises (Student and Instructor) plus an Inject Console for the instructor.
- Layouts built on a 1920x1080 baseline with media-query stacking at smaller widths.

Everything runs in the browser. There is no shared state across the four pages out of the box beyond what each page generates on its own. Your expansion needs to add a deterministic, reproducible synchronization layer so that the same scenario produces the same indicators on every screen. That layer is the single most important architectural addition.

### 1.1 Architectural Breakdown

The core problem to solve is that each screen is a separate browsing context. When the four screens run as four iframes inside the multi-screen viewer, or as four physical monitors each pointing at one page, they do not naturally share memory. There are three viable synchronization mechanisms. The recommended design uses all three in layers.

**Layer A: Deterministic generation from a shared seed (primary correlation mechanism).**
Every screen receives the same scenario seed through a URL parameter. Each screen runs an identical pure function that turns that seed into the full set of scenario entities. Because the function is deterministic and the seed is identical, the SIEM, the Network Monitor, and the Threat Intel screen all independently compute the exact same attacker IP, the same file hash, and the same compromised user account. No live message passing is required for baseline correlation. This is the resilient backbone. It works even if screens load at different times or run on separate machines.

**Layer B: Live event fan-out (for instructor injects and timeline progression).**
For same-origin contexts (the four-iframe viewer, or multiple tabs on the same GitHub Pages origin), use the `BroadcastChannel` API. One channel name per active simulation. The Inject Console posts an event, and every listening screen receives it in real time. As a fallback for older contexts, listen for the `storage` event on `localStorage`, which fires across same-origin tabs when a key changes.

**Layer C: Persistence (for resuming a shift and grading).**
`localStorage` holds the durable state: open tickets, timeline actions, notes, and completion status. This survives refresh and lets a student resume a shift.

**Cross-screen log synchronization in practice.** A log line on the SIEM and a corresponding flow on the Network Monitor must reference the same entities. The seed guarantees the entities match. The timing is coordinated two ways. In passive mode, each screen uses a shared simulation clock derived from the seed plus wall-clock offset, so independently generated streams stay roughly aligned. In active mode, the Inject Console drives a step counter over `BroadcastChannel`, and each screen renders the log lines and visuals mapped to that step.

**iframe communication.** The multi-screen viewer is the parent. It passes the seed and the channel name into each iframe through the `src` query string. For runtime control, the parent and the iframes exchange messages with `window.postMessage`, always validating `event.origin` against the known GitHub Pages origin and ignoring anything else. The parent never reaches into iframe internals through the DOM. It only sends messages.

```
Viewer (parent window)
  posts {seed, channel} via iframe src params
  controls layout, fullscreen, quadrant toggles
        |
        |  postMessage (origin-checked)        BroadcastChannel("soc-sim-<id>")
        v                                       ^         ^         ^
  +-----------+   +-----------+   +-----------+   +-----------+
  | iframe 1  |   | iframe 2  |   | iframe 3  |   | iframe 4  |
  | SIEM      |   | Network   |   | Incident  |   | ThreatInt |
  +-----------+   +-----------+   +-----------+   +-----------+
        |               |               |               |
        +------ each independently derives entities from seed ------+
                 each reads/writes localStorage for persistence
```

### 1.2 Front-End Technology Stack

The goal is zero build complexity for classroom maintenance, while keeping the option to compile assets for production. The recommended stack is intentionally boring and durable.

- **Markup:** HTML5, one page per screen, semantic landmarks, skip links for accessibility.
- **Styling:** Tailwind CSS. For day-one simplicity use the Play CDN build so there is no toolchain. For a hardened production deploy, precompile Tailwind to a single minified stylesheet so the page does not depend on a CDN at runtime. Keep a small hand-written CSS file for the threat-map canvas and print styles.
- **Logic:** Vanilla JavaScript using native ES modules (`type="module"`). No framework is required. If you want lightweight reactivity for the ticket forms and feeds, add Alpine.js (small, no build) or Preact with htm (also no build). Avoid heavier frameworks. They add build steps and offer little here.
- **Determinism:** a tiny seeded pseudo-random number generator shared by every screen. See section 2.3.
- **Heavy work off the main thread:** a Web Worker per screen for the continuous log generator, so the UI never stutters and memory stays bounded.
- **Visualization:** the threat map and the time-series panels render to `<canvas>`. Avoid large charting libraries. A small custom canvas renderer keeps the bundle light and avoids memory growth from chart object churn.
- **No external network calls at runtime.** All scenario data is bundled. This keeps the app working on isolated lab networks and avoids privacy and reliability problems.

Why this works on GitHub Pages: every artifact is a static file. There is no server process, no database, and no API to host. GitHub Pages serves the files, and the browser does the rest.

### 1.3 State Management and Persistence

**State shape.** Keep one root object per active shift, serialized to a single `localStorage` key. Namespacing keeps multiple courses or sections from colliding.

```javascript
// Key convention: soc.<courseId>.<studentId>.<scenarioId>
const STATE_KEY = `soc.${courseId}.${studentId}.${scenarioId}`;

const defaultState = {
  schemaVersion: 1,
  scenarioId: "SC-T2-01",
  seed: "a3f19c2b",
  startedAt: 1719300000000,
  lastSavedAt: 1719300000000,
  status: "in_progress",          // in_progress | submitted | verified
  tickets: [],                    // see ticket model in 2.2
  timeline: [],                   // ordered analyst actions with timestamps
  notes: "",                      // free-form analyst notebook (markdown)
  playbookSelections: {},         // stepId -> chosen option
  answers: {},                    // questionId -> response, used for grading
  score: null
};
```

**Save strategy.** Debounce writes. Persist on a 2 second idle timer after any change, plus on `visibilitychange` and `beforeunload`. Never write on every keystroke. Wrap reads in a try block, because `localStorage` can be full or disabled in private mode. If storage is unavailable, fall back to in-memory state and warn the student that progress will not survive a refresh.

**Schema versioning.** Store `schemaVersion`. On load, run small migration functions if the stored version is older than the current code. This prevents broken resumes after you update the platform mid-semester.

**Completion and verification codes compatible with Blackboard.** Static hosting cannot talk to Blackboard directly without a server, so use a verification-code pattern. The platform produces a short code when a student completes a scenario correctly. The student pastes that code into a Blackboard quiz. You verify it.

The code is a signed digest of the meaningful inputs. Use the Web Crypto API (`crypto.subtle`) to compute an HMAC over a canonical string, then shorten it to a typable code.

```javascript
// Canonicalize the inputs that prove completion, then sign them.
async function makeCompletionCode({ scenarioId, studentId, score, courseSecret }) {
  const canonical = [scenarioId, studentId, String(score)].join("|");
  const keyData = new TextEncoder().encode(courseSecret);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(canonical)
  );
  // Take the first 5 bytes, render as Crockford-style base32, group for readability.
  const bytes = new Uint8Array(sig).slice(0, 5);
  const code = toBase32(bytes); // e.g. "K7QF-9MZ2"
  return `${scenarioId}.${code}`;
}
```

You then verify codes one of two ways:

1. **Instructor Verifier page (recommended).** A separate static page where you enter the student name and the pasted code. It recomputes the HMAC with the same course secret and confirms a match. This supports per-student codes, so sharing a code does not help another student.
2. **Blackboard auto-graded quiz.** If you prefer Blackboard to grade automatically, generate the code without the studentId so it is the same for everyone who completes the scenario correctly. Set that single value as the correct answer in a Blackboard short-answer question. This is simpler but allows code sharing. Mitigate by rotating the course secret each term and by including a low-resolution time bucket in the canonical string.

Be candid about the security model. The course secret lives in client code, so a determined student can extract it. Treat completion codes as a low-stakes integrity signal for academic work, not as a cryptographic guarantee. For higher assurance later, an LTI 1.3 integration with a small serverless function is the upgrade path, and it is out of scope for pure static hosting.

### 1.4 Instructor Inject Console Architecture

The Inject Console is the instructor cockpit. From it you, acting as CISO, launch multi-step live attacks that unfold across the four screens during a shift.

**Access gating.** A passphrase gate on the console is obfuscation, not real access control, because all logic is client-side. Implement it honestly. Store a salted hash of the passphrase in the build. On entry, hash the typed value with `crypto.subtle` (PBKDF2 with a high iteration count) and compare. This stops casual snooping by students who open the console URL. State plainly in your own notes that it is not a security boundary. Anyone who reads the source can find the gate. For a real boundary, host the console on a separate access-controlled path or a private repo and load injects from there.

**Inject model.** An inject is a named, ordered sequence of steps. Each step targets one or more screens and carries a payload.

```javascript
const inject = {
  id: "INJ-RANSOMWARE-01",
  scenarioId: "SC-T2-01",
  title: "Ransomware: initial access to detonation",
  steps: [
    { t: 0,   screens: ["siem"],     type: "log_burst",  payload: { source: "windows", template: "phish_macro_exec" } },
    { t: 30,  screens: ["network"],  type: "flow",       payload: { dst: "c2", bytes: 240000, beacon: true } },
    { t: 90,  screens: ["siem","network"], type: "log_burst", payload: { template: "smb_lateral" } },
    { t: 150, screens: ["siem","intel"],   type: "ioc_promote", payload: { hash: "scenario.ransom_bin" } },
    { t: 210, screens: ["incident"], type: "auto_ticket", payload: { severity: "critical", title: "Mass file encryption detected" } }
  ]
};
```

**Launch and propagation.** The console drives the step clock and fans steps out over `BroadcastChannel`. Each screen subscribes and renders only the steps that target it. Entity values inside payloads are references such as `scenario.ransom_bin`, which each screen resolves against its own seed-derived entity table, so the literal hash never has to travel and never drifts.

```javascript
const channel = new BroadcastChannel(`soc-sim-${simId}`);

function launchInject(inject) {
  const startedAt = performance.now();
  inject.steps.forEach(step => {
    setTimeout(() => {
      channel.postMessage({ kind: "inject_step", injectId: inject.id, step });
    }, step.t * 1000);
  });
}
```

**URL-parameter fallback for distributed setups.** When screens run on four physical machines that are not same-origin tabs and cannot share a `BroadcastChannel`, fall back to a pull model. The console writes the current step index into the URL of a lightweight poll, or you advance each screen manually with hotkeys, or you preschedule the whole inject from the seed so screens self-advance on the shared simulation clock with no live channel at all. Design every inject so it can run fully unattended from the seed. Treat the live channel as an enhancement, not a dependency.

---

## PART 2: Scalable Core Component Design

### 2.1 SIEM Log Engine

The engine produces a believable, continuous stream of background log noise, then layers scenario-specific lines on top in response to inject steps or the simulation clock. It must run for an entire class period without leaking memory.

**Architecture.** Run the generator in a Web Worker. The worker holds the seeded generator and the template library. It emits batches to the main thread on a tick. The main thread appends batches to a fixed-size ring buffer and renders only the visible slice. This keeps the DOM small and memory flat.

**Log source templates.** Build a template per source type. Each template is a function that takes resolved entities plus a randomness stream and returns a formatted line plus structured fields for filtering.

| Source | Format notes | Example fields you generate |
| --- | --- | --- |
| Windows Event Log | Channel, EventID, level | 4624, 4625, 4688, 4720, 7045 |
| Syslog | RFC 3164 or 5424, facility, severity | host, process, pid, message |
| Firewall | Allow or deny, 5-tuple | src, dst, sport, dport, action |
| AWS CloudTrail | JSON record, eventName, userIdentity | PutObject, AssumeRole, ConsoleLogin |
| Web Server | Combined Log Format | ip, method, path, status, bytes, ua |

**Noise versus signal.** The worker mixes two streams. The baseline stream produces routine events at realistic rates so the dashboard never looks empty. The scenario stream produces the attack narrative. Tag every line with an internal `origin` of `noise` or `scenario` and an internal `truthLabel` (benign, suspicious, malicious). The student never sees these tags. The grader uses them to score triage accuracy.

```javascript
// Worker tick: emit a batch, never grow unbounded.
const TICK_MS = 1000;
const LINES_PER_TICK = 12;

function tick(state) {
  const batch = [];
  for (let i = 0; i < LINES_PER_TICK; i++) {
    const wantScenario = state.scenarioQueue.length > 0 ? state.rng() < 0.25 : false;
    const line = wantScenario
      ? renderScenarioLine(state.scenarioQueue.shift(), state.entities, state.rng)
      : renderNoiseLine(pickSource(state.rng), state.entities, state.rng);
    batch.push(line);
  }
  postMessage({ kind: "log_batch", batch });
}
setInterval(() => tick(workerState), TICK_MS);
```

**Memory discipline.** The main thread keeps a ring buffer with a hard cap, for example 5000 lines. When full, it overwrites the oldest entries. Render with a virtualized list so the DOM holds only the rows on screen. Detach event handlers on removed rows. Do not store every line in component state. This is the single most important rule for running all four screens for an hour without the tab crashing.

### 2.2 Interactive Incident Response and Ticketing System (Screen 3)

This screen turns observations into structured analyst work. It is where students assign tickets, walk playbook steps, take notes, document remediation, and export a post-mortem for the CISO.

**Ticket data model.**

```javascript
const ticket = {
  id: "INC-0007",
  scenarioId: "SC-T2-01",
  createdAt: 1719300000000,
  severity: "critical",        // info | low | medium | high | critical
  status: "open",              // open | investigating | contained | eradicated | recovered | closed
  assignee: "student-id",
  title: "Mass file encryption detected on FIN-WS-12",
  linkedEntities: ["host.fin_ws_12", "hash.ransom_bin", "ip.c2"],
  playbookId: "PB-RANSOMWARE",
  playbookProgress: {},        // stepId -> { choice, completedAt }
  notes: "",                   // markdown analyst notebook
  remediation: [],             // ordered remediation actions taken
  timeline: []                 // every state change, timestamped, for the post-mortem
};
```

**Playbook engine.** A playbook is data, not code. Each step has a prompt, a set of options, and a hidden correct path used for scoring. Steps can branch. Define playbooks in the master JSON so non-developers can author them.

```javascript
const playbook = {
  id: "PB-RANSOMWARE",
  phases: [
    {
      phase: "Containment",
      steps: [
        { id: "c1", prompt: "First containment action?", type: "single",
          options: ["Isolate host from network", "Reimage immediately", "Ignore and monitor"],
          correct: 0, rationale: "Isolation preserves evidence and stops spread." }
      ]
    },
    { phase: "Eradication", steps: [ /* ... */ ] },
    { phase: "Recovery", steps: [ /* ... */ ] }
  ]
};
```

**Notes and remediation capture.** The notebook is a markdown text area with a live preview. Remediation actions are added as discrete, timestamped entries so the timeline reconstructs what the student did and when. Every meaningful action appends to `ticket.timeline`. That timeline is the raw material for the post-mortem.

**Markdown post-mortem export.** On submission, assemble a markdown report from the ticket and its timeline. Offer a copy-to-clipboard action and a download as a `.md` file. The report is the graded artifact and the thing you read as CISO.

```javascript
function buildPostMortem(ticket, scenario) {
  const lines = [];
  lines.push(`# Post-Incident Report: ${ticket.title}`);
  lines.push(`**Incident ID:** ${ticket.id}  `);
  lines.push(`**Scenario:** ${scenario.id} ${scenario.title}  `);
  lines.push(`**Severity:** ${ticket.severity}  `);
  lines.push(`**Analyst:** ${ticket.assignee}`);
  lines.push(`\n## Executive Summary\n`);
  lines.push(ticket.summary || "_Complete the summary._");
  lines.push(`\n## Timeline of Analyst Actions\n`);
  ticket.timeline.forEach(e => {
    lines.push(`- ${new Date(e.at).toISOString()} : ${e.action}`);
  });
  lines.push(`\n## Indicators of Compromise\n`);
  ticket.linkedEntities.forEach(ref => lines.push(`- ${scenario.entities[ref]}`));
  lines.push(`\n## Remediation Steps Taken\n`);
  ticket.remediation.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  lines.push(`\n## Lessons Learned\n`);
  lines.push(ticket.lessons || "_What would you change next time?_");
  return lines.join("\n");
}
```

### 2.3 Shared Simulation and Cross-Screen Correlation

This is the mechanism that makes the platform feel like one SOC rather than four unrelated pages. A single seed propagates to every screen. Every screen turns that seed into the identical set of entities.

**Seed propagation.** The hub or the multi-screen viewer chooses a scenario, looks up or derives its seed, and passes it into each screen through the query string, alongside the scenario id and the channel name. Build the query string with `URLSearchParams` so you never hand-concatenate parameters.

```javascript
function screenUrl(base, { scenarioId, seed, channel }) {
  const params = new URLSearchParams();
  params.set("scenario", scenarioId);
  params.set("seed", seed);
  params.set("channel", channel);
  return `${base}?${params.toString()}`;
}
```

**Deterministic randomness.** A string seed becomes a 32-bit integer, which feeds a small fast generator. Every screen runs the same two functions, so every screen draws the same sequence.

```javascript
// Hash a string seed to a 32-bit integer (ampersand-free variant).
function hashSeed(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 = h1 ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

// Mulberry32: tiny deterministic PRNG.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Entity table.** From the seeded generator, build one entity table per scenario. Because the draws are deterministic, the attacker IP on the Network Monitor equals the attacker IP in the SIEM equals the attacker IP in the Threat Intel feed. References such as `ip.c2` resolve to the same literal everywhere.

```javascript
function buildEntities(seed) {
  const rng = mulberry32(hashSeed(seed));
  const octet = () => Math.floor(rng() * 254) + 1;
  const hex = (n) => Array.from({ length: n }, () =>
    "0123456789abcdef"[Math.floor(rng() * 16)]).join("");
  return {
    "ip.c2":            `${octet()}.${octet()}.${octet()}.${octet()}`,
    "ip.victim":        `10.20.${octet()}.${octet()}`,
    "host.fin_ws_12":   "FIN-WS-12",
    "user.compromised": ["jsmith","akhan","mlopez","rgarcia"][Math.floor(rng() * 4)],
    "hash.ransom_bin":  hex(64),
    "domain.c2":        `update-${hex(6)}.example-cdn.net`
  };
}
```

Now the SIEM log lines, the Network Monitor flows and map arcs, and the Threat Intel IOC cards all draw from the same table. Correlation is guaranteed by construction, not by luck and not by live messaging.

---

## PART 3: Expanded 60-Activity Curriculum Blueprint

This was the original design plan. The platform now ships 100 scenarios across the four tiers, well beyond the 60-scenario expansion target described below. A 16-week semester running 2 to 3 incidents per week assigns 32 to 48 of them, so instructors pick a subset. The large surplus gives you rotation across sections, make-up work, and differentiated difficulty without repeats. The tier breakdowns that follow are the original enumerated plan, not the current per-tier counts.

### 3.1 Tier definitions

- **Tier 1, Triage.** Validate alerts, separate noise from signal, decide what to escalate. Short, high-volume, single-screen focus.
- **Tier 2, Incident Response and Playbooks.** Run a full case from detection through recovery using a structured playbook. Multi-screen, produces a post-mortem.
- **Tier 3, Threat Hunting.** Hypothesis-driven search with no prior alert. Heavy pivoting across screens and query thinking.
- **Advanced and Emerging Threats.** Cloud, identity, supply chain, AI-era, and compliance-driven cross-disciplinary scenarios.

### 3.2 Category tags

EP = Endpoint Compromise. NW = Network Anomaly. CI = Cloud and Identity. AI = AI-Era and Modern. CO = Multidisciplinary and Compliance.

### 3.3 Tier 1: Triage (16 scenarios)

| ID | Title | Category | Primary screens | Core skill |
| --- | --- | --- | --- | --- |
| SC-T1-01 | Brute Force Against RDP | CI | SIEM | Pattern in 4625 floods |
| SC-T1-02 | User-Reported Phishing Email | EP | SIEM, Intel | Header and link analysis |
| SC-T1-03 | Suspicious PowerShell Execution | EP | SIEM | Encoded command triage |
| SC-T1-04 | VPN Logins from New Geography | CI | SIEM | Geo-velocity check |
| SC-T1-05 | Malware Quarantine Validation | EP | SIEM | True positive vs noise |
| SC-T1-06 | Outbound Port Scan Detection | NW | Network | Fan-out recognition |
| SC-T1-07 | USB Mass Storage Insertion | EP | SIEM | Removable media policy |
| SC-T1-08 | DNS Query to New Domain | NW | Network, Intel | Newly registered domain risk |
| SC-T1-09 | Account Lockout Storm | CI | SIEM | Lockout root cause |
| SC-T1-10 | Web Server Error-Code Spike | NW | Network | 401 and 403 surge reading |
| SC-T1-11 | Endpoint Protection Disabled | EP | SIEM | Tamper detection |
| SC-T1-12 | Impossible Travel Sign-In | CI | SIEM, Network | Concurrent geo logons |
| SC-T1-13 | Mailbox Auto-Forward Rule Created | CI | SIEM | Rule abuse triage |
| SC-T1-14 | Inbound Firewall Deny Spike | NW | Network | Edge probe reading |
| SC-T1-15 | Service Account Interactive Logon | CI | SIEM | Account misuse signal |
| SC-T1-16 | TLS Downgrade and Cert Anomaly | NW | Network | Transport risk triage |

### 3.4 Tier 2: Incident Response and Playbooks (16 scenarios)

| ID | Title | Category | Primary screens | Core skill |
| --- | --- | --- | --- | --- |
| SC-T2-01 | Ransomware Detonation and Containment | EP | All four | Isolate, eradicate, recover |
| SC-T2-02 | Business Email Compromise | CI | SIEM, Incident | Fraud chain reconstruction |
| SC-T2-03 | Credential Phishing to Account Takeover | CI | All four | Session and token revocation |
| SC-T2-04 | Lateral Movement via SMB | NW | SIEM, Network | East-west tracking |
| SC-T2-05 | Data Exfiltration over HTTPS | NW | Network, Incident | Volume and destination triage |
| SC-T2-06 | Web Shell on Public Server | EP | SIEM, Network | Server compromise handling |
| SC-T2-07 | Insider Theft Before Resignation | CO | SIEM, Incident | Insider risk workflow |
| SC-T2-08 | Malicious Macro Outbreak | EP | All four | Multi-host containment |
| SC-T2-09 | DDoS Mitigation Coordination | NW | Network, Incident | Volumetric response |
| SC-T2-10 | Compromised Vendor Remote Access | CO | SIEM, Incident | Third-party access response |
| SC-T2-11 | Privilege Escalation on Domain Controller | CI | SIEM, Incident | AD compromise handling |
| SC-T2-12 | Mobile Device Compromise | EP | SIEM, Incident | MDM-driven response |
| SC-T2-13 | Rogue Wireless Access Point | NW | Network, Incident | Physical-layer threat |
| SC-T2-14 | Payment Card Skimming on Checkout | CO | Network, Incident | PCI-scoped response |
| SC-T2-15 | Lost or Stolen Asset Response | CO | Incident | Data-at-risk procedure |
| SC-T2-16 | Phishing-Driven Wire Fraud | CO | SIEM, Incident | Financial fraud response |

### 3.5 Tier 3: Threat Hunting (14 scenarios)

| ID | Title | Category | Primary screens | Core skill |
| --- | --- | --- | --- | --- |
| SC-T3-01 | C2 Beacon Hunt by Periodicity | NW | Network, Intel | Beacon interval analysis |
| SC-T3-02 | Living off the Land Binary Abuse | EP | SIEM | LOLBin behavioral hunt |
| SC-T3-03 | DNS Tunneling Detection | NW | Network | Entropy and volume hunt |
| SC-T3-04 | Persistence Mechanism Sweep | EP | SIEM | Registry and task hunt |
| SC-T3-05 | Anomalous Service Account Behavior | CI | SIEM | Baseline deviation hunt |
| SC-T3-06 | Pass-the-Hash and Pass-the-Ticket | CI | SIEM, Network | Credential-theft hunt |
| SC-T3-07 | Beacon Jitter Across Proxy Logs | NW | Network | Jitter pattern hunt |
| SC-T3-08 | Suspicious Process Tree Hunt | EP | SIEM | Parent-child anomaly |
| SC-T3-09 | Kubernetes Cluster Anomaly Hunt | CI | SIEM, Network | Workload behavior hunt |
| SC-T3-10 | CloudTrail Privilege-Abuse Hunt | CI | SIEM, Intel | API anomaly hunt |
| SC-T3-11 | Data Staging Detection | NW | SIEM, Network | Archive and stage hunt |
| SC-T3-12 | Shadow IT and Unsanctioned SaaS | CI | Network, Intel | Egress destination hunt |
| SC-T3-13 | Rare Process Frequency Hunt | EP | SIEM | Long-tail stacking |
| SC-T3-14 | Tenant-Wide Forwarding Rule Hunt | CI | SIEM | Rule sweep across users |

### 3.6 Advanced and Emerging Threats (14 scenarios)

| ID | Title | Category | Primary screens | Core skill |
| --- | --- | --- | --- | --- |
| SC-AE-01 | S3 Bucket Public Exposure and Leak | CI | SIEM, Intel | Cloud storage exposure |
| SC-AE-02 | AiTM Token Theft and Session Hijack | CI | All four | Adversary-in-the-middle response |
| SC-AE-03 | CI/CD Pipeline Compromise | CI | SIEM, Incident | Build-system supply chain |
| SC-AE-04 | Kubernetes Crypto-Mining Workload | CI | Network, SIEM | Rogue workload eviction |
| SC-AE-05 | Deepfake Vishing of the Help Desk | AI | Incident, Intel | Synthetic-voice social engineering |
| SC-AE-06 | Prompt Injection of Internal AI Assistant | AI | SIEM, Incident | LLM input abuse handling |
| SC-AE-07 | Auditing an AI Triage Tool | AI | SIEM, Incident | False-negative and bias audit |
| SC-AE-08 | Malicious OAuth Consent Grant | CI | SIEM, Intel | Illicit app consent response |
| SC-AE-09 | Dependency Poisoning in the Supply Chain | CI | SIEM, Incident | Package integrity response |
| SC-AE-10 | PHI Breach and HIPAA Response | CO | Incident | Healthcare breach procedure |
| SC-AE-11 | Financial Fraud and SOX Control Failure | CO | SIEM, Incident | Controls and audit response |
| SC-AE-12 | Criminal Justice Chain of Custody | CO | Incident | Evidence handling integrity |
| SC-AE-13 | IaC Misconfiguration Exploited | CI | SIEM, Network | Terraform drift response |
| SC-AE-14 | Agentic LLM Tool Abuse Exfiltration | AI | All four | AI-agent egress response |

### 3.7 Required-topic coverage map

This confirms every topic you listed is present in the pool.

| Required topic | Covered by |
| --- | --- |
| Ransomware | SC-T2-01 |
| Phishing | SC-T1-02, SC-T2-03, SC-T2-16 |
| Living off the Land | SC-T1-03, SC-T3-02 |
| Exfiltration | SC-T2-05, SC-T3-11 |
| Port Scans | SC-T1-06 |
| C2 Beacons | SC-T3-01, SC-T3-07 |
| S3 Exposure | SC-AE-01 |
| AiTM Token Theft | SC-AE-02 |
| CI/CD Compromise | SC-AE-03 |
| Kubernetes Hunts | SC-T3-09, SC-AE-04 |
| Deepfake Vishing | SC-AE-05 |
| Auditing AI Triage tools | SC-AE-07 |
| Prompt Injection | SC-AE-06, SC-AE-14 |
| Healthcare and HIPAA | SC-AE-10 |
| Financial and SOX | SC-AE-11 |
| Criminal Justice chain of custody | SC-AE-12 |

### 3.8 Suggested 16-week pacing

A workable rhythm uses Tier 1 early to build triage reflexes, layers Tier 2 case work through the middle, introduces Tier 3 hunts once students can pivot fluently, and reserves Advanced and Emerging Threats plus the capstone for the final weeks.

| Weeks | Focus | Incidents per week | Draws from |
| --- | --- | --- | --- |
| 1 to 3 | Triage fundamentals | 3 | Tier 1 |
| 4 to 7 | Incident response and playbooks | 2 to 3 | Tier 2 |
| 8 to 10 | Threat hunting | 2 | Tier 3 |
| 11 to 13 | Cloud, identity, and AI-era | 2 | Advanced and Emerging |
| 14 to 15 | Compliance and multidisciplinary | 2 | CO-tagged scenarios |
| 16 | Capstone shift and post-mortem | 1 graded shift | Instructor-chosen chain |

---

## PART 4: Deployment and Implementation Roadmap

### 4.1 GitHub repository structure

Organize so that scenario authors touch only data files, and developers touch only code. Keep the master scenario source separate from the generated student and instructor outputs.

```
soc-platform/
├── index.html                      # hub
├── screens/
│   ├── siem.html
│   ├── network.html
│   ├── incident.html
│   └── threat-intel.html
├── viewer/
│   └── multi-screen.html           # 2x2 iframe grid
├── instructor/
│   ├── console.html                # inject console (gated)
│   └── verifier.html               # completion-code verifier
├── lesson/
│   └── interactive-lesson.html
├── src/
│   ├── core/
│   │   ├── prng.js                 # hashSeed, mulberry32
│   │   ├── entities.js             # buildEntities(seed)
│   │   ├── state.js                # localStorage load, save, migrate
│   │   ├── channel.js              # BroadcastChannel wrapper
│   │   └── completion.js           # HMAC code generation
│   ├── engine/
│   │   ├── log-worker.js           # Web Worker log generator
│   │   ├── templates/              # one module per log source
│   │   │   ├── windows.js
│   │   │   ├── syslog.js
│   │   │   ├── firewall.js
│   │   │   ├── cloudtrail.js
│   │   │   └── webserver.js
│   │   └── ring-buffer.js
│   ├── screens/                    # per-screen view logic
│   ├── playbooks/                  # playbook runtime
│   └── postmortem.js
├── data/
│   ├── scenarios.master.json       # single source of truth (Part 4.2)
│   └── schema/
│       └── scenario.schema.json    # JSON Schema for validation
├── build/
│   ├── build.mjs                   # generates student and instructor data
│   └── validate.mjs                # schema and consistency checks
├── dist/
│   ├── scenarios.student.json      # generated, no answer keys
│   └── scenarios.instructor.json   # generated, with answer keys
├── assets/
│   ├── css/
│   └── img/
├── tests/
│   ├── consistency.test.mjs        # cross-screen entity match
│   └── memory.test.mjs             # leak and buffer-cap checks
├── .nojekyll                       # serve files verbatim on Pages
└── README.md
```

Add a `.nojekyll` file so GitHub Pages serves your folders without Jekyll processing. Configure Pages to deploy from the repository root or from a `dist`-style branch, depending on whether you precompile Tailwind.

### 4.2 Single-source exercise generation

Author everything once in `data/scenarios.master.json`. A build step strips answer keys to produce the student data, and copies the full record to produce the instructor data. This guarantees the two editions never drift.

**Master scenario record shape.**

```json
{
  "schemaVersion": 1,
  "scenarios": [
    {
      "id": "SC-T2-01",
      "title": "Ransomware Detonation and Containment",
      "tier": "T2",
      "categories": ["EP"],
      "seed": "a3f19c2b",
      "summary": "A finance workstation runs a malicious macro that leads to mass file encryption.",
      "primaryScreens": ["siem", "network", "incident", "intel"],
      "entityRefs": ["ip.c2", "ip.victim", "host.fin_ws_12", "user.compromised", "hash.ransom_bin", "domain.c2"],
      "logScript": [
        { "t": 0, "source": "windows", "template": "phish_macro_exec", "truthLabel": "malicious" },
        { "t": 30, "source": "firewall", "template": "c2_beacon", "truthLabel": "malicious" }
      ],
      "playbookId": "PB-RANSOMWARE",
      "inject": "INJ-RANSOMWARE-01",
      "questions": [
        {
          "id": "q1",
          "prompt": "What was the initial access vector?",
          "type": "single",
          "options": ["Malicious macro", "Exposed RDP", "USB drop", "Drive-by download"],
          "_answer": 0,
          "_points": 10
        }
      ],
      "_answerKey": {
        "rootCause": "Macro-enabled document executed by FIN-WS-12 user.",
        "expectedIOCs": ["hash.ransom_bin", "ip.c2", "domain.c2"],
        "expectedContainment": ["Isolate host", "Disable account", "Block C2 domain"]
      }
    }
  ]
}
```

**Convention.** Any field whose name starts with an underscore is instructor-only. The build script removes underscore-prefixed fields for the student edition. This single rule keeps answer keys, point values, and grading notes out of the student bundle.

```javascript
// build/build.mjs (sketch)
import fs from "node:fs";

const master = JSON.parse(fs.readFileSync("data/scenarios.master.json", "utf8"));

const stripInstructorFields = (obj) => {
  if (Array.isArray(obj)) return obj.map(stripInstructorFields);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith("_")) continue;          // drop instructor-only fields
      out[k] = stripInstructorFields(v);
    }
    return out;
  }
  return obj;
};

const studentData = { ...master, scenarios: master.scenarios.map(stripInstructorFields) };
fs.writeFileSync("dist/scenarios.student.json", JSON.stringify(studentData, null, 2));
fs.writeFileSync("dist/scenarios.instructor.json", JSON.stringify(master, null, 2));
console.log("Built student and instructor editions.");
```

**Inject triggers.** Keep injects in the master file too, referenced by id from each scenario. The instructor console loads the instructor bundle and can launch any inject. The student edition never includes the inject step list, so students cannot read the attack timeline in advance. Because injects resolve entity references against the seed, the student and instructor editions still render identical literal values at runtime.

**Validation in the build.** Before writing output, run `build/validate.mjs`. Check that the master file matches the JSON Schema. Confirm every `entityRefs` value resolves through `buildEntities`. Confirm every `playbookId` and `inject` reference exists. Fail the build on any broken reference. Wire this into a GitHub Action so a bad scenario never reaches Pages.

### 4.3 Testing workflow: cross-screen consistency and memory health

You need two guarantees. First, a given seed produces the same entities on every screen. Second, the log engine runs for a full class period without unbounded memory growth.

**Consistency test.** This runs in Node and needs no browser. Import the same `buildEntities` the screens use, then assert that repeated calls with one seed are identical and that distinct seeds differ. Then walk every scenario and confirm each referenced entity resolves.

```javascript
// tests/consistency.test.mjs (sketch)
import assert from "node:assert";
import { buildEntities } from "../src/core/entities.js";

const a = buildEntities("a3f19c2b");
const b = buildEntities("a3f19c2b");
assert.deepStrictEqual(a, b, "Same seed must produce identical entities.");

const c = buildEntities("ffffffff");
assert.notDeepStrictEqual(a, c, "Different seeds should differ.");
console.log("Consistency checks passed.");
```

To prove the rendered log lines actually carry matching values across screens, render a fixed scenario headlessly for each screen module, extract the entity tokens from the produced lines, and assert the sets intersect as expected. Run this under a headless browser runner such as Playwright if your screen modules touch the DOM.

**Memory and leak test.** The failure mode is a growing array of log lines plus detached DOM nodes that never get collected. Test the ring buffer cap directly, then run a soak test in a headless browser that drives the worker for a simulated hour at accelerated tick speed and samples `performance.memory` or heap snapshots.

```javascript
// tests/memory.test.mjs (ring buffer unit check)
import assert from "node:assert";
import { RingBuffer } from "../src/engine/ring-buffer.js";

const CAP = 5000;
const rb = new RingBuffer(CAP);
for (let i = 0; i < 50000; i++) rb.push({ i });
assert.strictEqual(rb.size(), CAP, "Buffer must never exceed its cap.");
console.log("Ring buffer cap holds under 10x overflow.");
```

**Soak test checklist for the headless run.**

1. Launch all four screens for one scenario at 10x tick speed for a simulated hour.
2. Sample heap size every simulated 5 minutes.
3. Assert the heap stabilizes rather than trending upward after warm-up.
4. Assert the visible row count stays at the virtualized window size, not the total generated count.
5. Confirm removed rows detach their event listeners. Use a counter incremented on add and decremented on remove, and assert it returns to the window size.
6. Run the inject from the console and confirm every targeted screen renders its steps, while non-targeted screens stay quiet.

**Manual classroom dry run.** Before week one, run the multi-screen viewer on the actual classroom display for a full period with a real scenario and the planned injects. Watch for text legibility at the room's viewing distance, for any quadrant that stacks awkwardly at the display resolution, and for any slowdown near the end of the period. Fix layout and tick-rate issues here, not during a live shift.

---

## Appendix A: Immediate build order

A practical sequence so you can start coding now.

1. Implement `src/core/prng.js` and `src/core/entities.js`. Write the consistency test. Get deterministic entities working first, because everything else depends on it.
2. Build one screen, the SIEM, with the Web Worker log engine and the ring buffer. Prove memory stays flat.
3. Add the second screen, the Network Monitor, and confirm it renders the same entities as the SIEM from the same seed.
4. Stand up `data/scenarios.master.json` with three scenarios and the build script that emits student and instructor editions.
5. Build Screen 3, the Incident Response and ticketing flow, including the markdown post-mortem export.
6. Add Screen 4, Threat Intel, and the BroadcastChannel layer.
7. Build the multi-screen viewer and wire postMessage plus origin checks.
8. Build the Inject Console and the passphrase gate, then the completion-code generator and the verifier page.
9. Author the remaining scenarios into the master file. Run validation on every commit.
10. Run the full soak test and the classroom dry run before the term begins.

## Appendix B: Honest constraints to plan around

- Client-side gating and client-held secrets are obfuscation, not security. Keep high-stakes answer keys and grading authority on your side through the verifier, and rotate the course secret each term.
- `BroadcastChannel` works only for same-origin contexts. Always design injects to also run unattended from the seed so distributed multi-machine setups still work.
- `localStorage` has size limits and can be disabled. Always degrade to in-memory state with a clear warning.
- Pixel-based fonts do not scale with display DPI. Validate legibility on the real classroom hardware.
- A true LMS integration with auto-grading needs a small server or serverless function via LTI 1.3. That is the upgrade path beyond static hosting, and it is not required for the design above.
