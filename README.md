# SOC Range

**CYBR 4350: Senior Project · San Jacinto College**
Designed and authored by Professor Rizwan Virani.

A browser-based, fully static Security Operations Center training platform for the San Jacinto College BAT in Cybersecurity capstone. Students run realistic "shifts" across four screens, triaging a live SIEM feed, correlating indicators on a global threat map, working incidents through MITRE-aligned playbooks, and delivering a post-mortem. It hosts on GitHub Pages with no server and no database.

This README covers local testing, GitHub deployment, classroom use, Blackboard grading, and how to extend the scenario library.

## What is in the box

- A live, deterministic SIEM feed across five log sources: Windows Event Logs, Syslog, Firewall, AWS CloudTrail, and web server logs.
- An animated global threat map that correlates exactly to the indicators in the feed.
- An incident response screen with ticketing, MITRE ATT&CK playbooks, an analyst notebook, and an auto-built markdown post-mortem.
- A threat intelligence screen with indicators that match the SIEM and the map by construction.
- An Analyst Academy with the core knowledge a new SOC analyst needs.
- A shift assessment with scoring, a debrief, and a signed completion code for Blackboard.
- An instructor console with a live inject launcher and a completion-code verifier.
- One hundred ready scenarios across Tier 1 triage, Tier 2 incident response, Tier 3 threat hunting, and advanced cloud, identity, and AI-era threats, including dedicated AI-threat scenarios such as prompt injection, shadow AI data leakage, model poisoning and theft, and deepfake fraud.
- A five-part required-deliverables workflow per scenario, including a recorded video debrief.
- A Capture the Flag arena with 20 hands-on challenges across eight categories.
- A Splunk Lab with a working in-browser SPL interpreter and 15 graded hunts, for students who hold the Splunk Core Certified Power User credential.
- A Detection Engineering Lab where students write Sigma rules that are graded in the browser on detection recall and false positives, across 10 activities.
- A Live Response Simulator with branching incidents, timed decisions, and escalation when the student is too slow, scored as a letter grade.
- A class leaderboard backed by a free Google Sheet, with a podium, full standings, and class stats, for running competitions.
- A CompTIA CySA+ V4 readiness dashboard that maps your practice to exam domains.
- A gamification layer with XP, ranks, daily streaks, badges, and an analyst profile.
- An AI tutor that gives Socratic guidance client-side, with an optional live LLM upgrade.
- A reference library: downloadable Word templates, an incident playbook for each activity, and the NIST publication shelf.

## Quick local test

GitHub Pages serves these files directly, but local testing needs a simple web server because the app uses a Web Worker and modern browser APIs that do not run from a file path.

Important: do not judge the look by opening an `.html` file straight from the zip or from a phone file-preview. Opened that way, the page cannot load its `css/` and `js/` folders, so it shows as unstyled text. That is a viewing problem, not the design. Serve it, or deploy it, and the full interface appears.

From the project folder, run one of these, then open the printed address:

```
python3 -m http.server 8080
```

or

```
npx serve .
```

Open `http://localhost:8080` and pick a scenario. Completion codes need a secure context, which both `localhost` and GitHub Pages provide.

The interface is responsive. On a phone the side rail becomes a horizontal tab strip and the panels stack, so it reads well on a small screen once it is served.

## Light and dark theme

The platform ships with both a dark theme and a light theme. Dark is the default. A small Theme button in the lower-left corner of every page switches between them, and the choice is remembered per browser, so you can compare the two and decide.

To lock the platform to one theme, you have two easy options. Keep your preferred theme selected, since the choice persists. Or, to force it for everyone, add `data-theme="light"` to the `<html>` tag in each page for light, or leave it off for dark, and delete the Theme button by removing the `js/theme.js` script line. Nothing else differs between the two themes; only the palette changes.

## Deploy to GitHub Pages

1. Create a new repository on GitHub, for example `soc-range`.
2. Put every file from this folder at the repository root. Keep the `.nojekyll` file. It tells Pages to serve the folders as-is.
3. Commit and push. From your machine:

```
git init
git add .
git commit -m "SOC Range platform"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/soc-range.git
git push -u origin main
```

4. In the repository on GitHub, open Settings, then Pages.
5. Under Build and deployment, set Source to "Deploy from a branch". Choose branch `main` and folder `/ (root)`. Save.
6. Wait one to two minutes. Pages shows a live URL such as `https://YOUR-ORG.github.io/soc-range/`.
7. Share that URL with students. The launcher is the home page.

To use a custom domain, add it under Settings, then Pages, then Custom domain, and create the DNS record GitHub shows you. Keep the `.nojekyll` file in place.

## How students use it

1. Open the launcher and type a name or student ID. This name signs the completion code, so it must be entered consistently.
2. Pick a scenario by tier. The workstation opens with a CISO briefing.
3. Watch the SIEM feed. Click any log line to pin it as evidence. Use the source filters and the search box to cut the noise.
4. Move to the Network and Threat Intel screens to correlate indicators. The same attacker IP, hash, and account appear everywhere.
5. Open an incident from an alert, work the playbook, and write notes in the notebook.
6. Open the Report screen and review the auto-built investigation summary. This is the starting material for the written deliverables, not the turn-in. Use Submit and score to record the in-app assessment.
7. Answer the assessment questions. The debrief shows the score, the lessons, and a completion code.

## Required deliverables and time on task

Each scenario is built as a full hour or more of work, not just the in-app investigation. The briefing lists five required deliverables, and the completion screen repeats them:

1. In-app investigation and assessment, which produces the Blackboard completion code.
2. Incident report, downloaded as a Word document and completed with the student's timeline, scope, indicators, and screenshots.
3. Root cause and post-mortem, the completed Root Cause Analysis and Post-Incident Review Word templates with the student's analysis and screenshots.
4. Executive brief, one page for leadership, the completed Executive Brief or SITREP Word template.
5. A recorded video debrief of three to five minutes, in which the student walks through the timeline, the root cause, the key indicators, the containment decisions, and the lessons learned. It is attached to the Blackboard submission as a file, not a link.

The auto-built summary on the Report screen is a starting point students copy into the Word templates and build on. It is not a graded deliverable on its own. The graded write-ups are the completed Word documents. Students submit the documents and the recording in Blackboard together with the completion code. Every scenario shows an estimated time, on its launcher card and in the briefing, that assumes this full workflow.

The estimates are 75 minutes for Tier 1, 90 for Tier 2, 105 for Tier 3, and 120 for advanced. Across the one hundred scenarios that is roughly 160 hours of scenario work, so the library is far larger than any one term requires. Instructors assign a subset. With the Capture the Flag arena and the Splunk Lab on top, a student who completes a normal assignment load still spends well over the sixty-hour target for the course. These numbers are honest: the deliverables genuinely take this long, which is the point of requiring them.

## Grading with Blackboard

The platform produces a signed completion code when a student finishes a shift. The code is bound to the scenario, the student name, and the score. There are two ways to use it.

Recommended: the instructor verifier. Open `instructor.html`, enter the passphrase, then use the verifier. Enter the scenario, the student name exactly as they typed it, the score percent, and the pasted code. The page confirms valid or invalid. This catches a code that does not match the claimed score or student.

Simple auto-grade: create a Blackboard short-answer question and tell students to paste their code. Codes vary per student, so for fully automatic grading you would remove the student name from the signature in `js/state.js`. The tradeoff is that codes then become shareable. The verifier path avoids that problem.

## Instructor console

`instructor.html` is gated by a passphrase. The default is `ciso`. The gate is a courtesy barrier, not a security control, because all logic is client-side. For real separation, host the console on a private path.

The live inject launcher pushes an event into any student who is running the same scenario in another tab on the same browser or shared display. Injects travel over a same-origin channel. For distributed labs on separate machines, each scenario already self-runs from its seed, so no live channel is needed.

## Customize and extend

Rotate the course secret each term. Edit `COURSE_SECRET` in `js/state.js`. Old codes stop verifying once you change it.

Change the instructor passphrase. Edit the check in `instructor.html`.

Add a scenario. Append an object to the list in `js/scenarios.data.js`. Copy an existing scenario and change the fields. Each scenario needs an id, a tier of T1, T2, T3, or AE, a seed string, a briefing, a logScript, optional repeats and a finale, iocs, a playbook, questions, hints, an answerKey, and a debrief. There are 100 scenarios today, so `node build/build.mjs` should report the new total after you add one. Two rules keep a new scenario working: every template named in its logScript, repeat, and finale must already exist in the `T` object in `js/log-engine.js`, and the scenario must map to a playbook in `js/library.data.js` (either in a playbook's `appliesTo` or in `EXTRA_PLAYBOOK`). The launcher, the worker, and the per-shift orientation all pick it up automatically.

Add a log pattern. Add a named template to the `T` object in `js/log-engine.js`, then reference it from a scenario logScript. Templates resolve entity references, so indicators stay correlated across screens.

Rebuild the JSON artifacts. The single source of truth is `js/scenarios.data.js`. To produce the data files described in the design blueprint, run:

```
node build/build.mjs
```

This writes `data/scenarios.master.json` with answer keys and `data/scenarios.student.json` with answer keys stripped.

## File map

```
index.html            launcher, scenario picker, and training modes
soc.html              analyst workstation (the main app)
instructor.html       inject console and completion-code verifier
ctf.html              Capture the Flag arena
certs.html            CySA+ V4 certification readiness dashboard
profile.html          analyst profile, rank, streak, and badges
library.html          reference library: templates, playbooks, NIST shelf
css/soc.css           mission-control theme
js/prng.js            seeded deterministic randomness
js/entities.js        organizational assets and entity tables
js/log-engine.js      noise and scenario log generation
js/log-worker.js      streaming feed worker
js/scenarios.data.js  scenario library and MITRE reference (source of truth)
js/state.js           persistence and completion codes
js/intel.js           Analyst Academy content
js/app.js             workstation controller
js/gamification.js    XP, ranks, streaks, badges, profile
js/ctf.data.js        20 CTF challenges (flags stored as hashes, generated)
js/ctf.js             CTF arena controller and flag verification
js/spl.js             Client-side SPL interpreter (search, stats, timechart, eval, where, lookup, and more)
js/splunk.data.js     Splunk Lab dataset builder and the 15 graded SPL activities
splunk.html           Splunk Lab page: live SPL search plus graded activities
detect.html           Detection Engineering Lab page: Sigma editor and graded activities
js/dataset.js         replays a scenario plus benign noise into flat records for rule testing
js/sigma.js           client-side Sigma parser and matching engine, with recall and false-positive scoring
js/detect.data.js     the 10 Detection Lab activities, targets, hints, and reference rules
response.html         Live Response Simulator page: branching incidents with a timer
js/branch.data.js     four branching incident trees: nodes, options, timers, endings
js/branch.js          branch engine: resolves choices, scores the path, assigns a letter grade
js/theme.js           light and dark theme toggle, remembers the choice
leaderboard.html      class leaderboard page: submit score, podium, standings, class stats
js/leaderboard.js     leaderboard client: builds the score, posts it, reads the board, local fallback
integrations/google-apps-script/Code.gs   paste-in backend that turns a Google Sheet into the shared store
js/certs.data.js      CompTIA domain maps and readiness engine
js/tutor.js           AI tutor widget (guide mode plus optional live mode)
js/library.data.js    templates list, playbooks, and NIST references
proxy/cloudflare-worker.js  optional API-key-safe proxy for the live tutor
build/build.mjs       derives master and student scenario JSON
build/gen-ctf.mjs     regenerates ctf.data.js from plaintext flags
build/gen-docs.mjs    regenerates the Word templates
library/templates/    eight downloadable .docx deliverables
data/                 generated JSON artifacts
.nojekyll             serve folders as-is on GitHub Pages
```

## Splunk Lab

Students arrive in CYBR 4350 already certified as Splunk Core Certified Power Users, so the Splunk Lab lets them use that skill directly. The page at `splunk.html` ships a small, dependency-free SPL interpreter (`js/spl.js`) that runs entirely in the browser over a deterministic, Splunk-style event set built by `js/splunk.data.js`.

Students type real SPL into the search bar and see real results: events, statistics tables, and a timechart visualization. An "interesting fields" sidebar mirrors Splunk's field discovery and inserts `field=value` filters on click.

Fifteen graded activities exercise the Power-User skill set: base searching with `field=value` and `AND`/`OR`/`NOT`, then the pipeline commands `search`, `where`, `eval`, `stats` (count, dc, sum, avg, min, max, values, list), `timechart`, `top`, `rare`, `table`, `fields`, `rename`, `sort`, `dedup`, `head`, `tail`, and `lookup`. Each activity states a hunting question, accepts the student's answer, and can reveal a reference SPL solution and load it into the search bar. The expected answer for every activity is computed at load time by running its reference solution through the interpreter, so the tasks are guaranteed solvable and nothing is hard-coded. Solving an activity awards XP through the same gamification layer as the rest of the platform and contributes to a `SPLUNK-LAB` completion code for Blackboard. Activity flags are namespaced (`splunk:`) so they do not affect the CTF count or CySA+ readiness.

The interpreter is a teaching subset, not a full Splunk. To add or change activities, edit the `activities` list in `js/splunk.data.js`: give each task a reference SPL `solution` and the `{row, col}` cell to read the answer from.

## Detection Engineering Lab

Detection engineering is the most in-demand SOC skill right now, so `detect.html` lets students practice it directly. They write a Sigma rule and the platform grades it in the browser. There is no API key, no server, and no cost. Everything runs offline on the same simulated log engine the rest of the platform uses.

Each activity replays one scenario plus a batch of benign noise into a flat event set (`js/dataset.js`). The student writes a rule, and `js/sigma.js` parses it and runs it against every event. The rule is then scored two ways: recall, meaning the share of the truly malicious events it catches, and false positives, meaning how many benign events it wrongly fires on. The metric tiles show caught, missed, and false positives, and matched benign rows are flagged in red so the student can see exactly what a noisy rule does. This teaches the real tradeoff of detection work, which is catching the threat without drowning the analyst in false alarms.

The Sigma engine supports a practical subset: `logsource`, multiple selection blocks, list values as OR, the common field modifiers (`contains`, `startswith`, `endswith`, `re`, and numeric `gt`, `gte`, `lt`, `lte`), and conditions with `and`, `or`, `not`, parentheses, and the `1 of`, `all of`, and `them` forms. There are 10 activities (`js/detect.data.js`), each with a prompt, a hint, and a reference rule. Every reference rule is verified at build time to reach full recall with zero false positives, so each task is known to be solvable. Solving an activity awards XP and contributes to a `DETECT-LAB` completion code for Blackboard. Activity flags are namespaced (`detect:`) so they do not affect other counts.

## Live Response Simulator

Multiple choice cannot test whether a student can make the call under pressure, so `response.html` puts them inside a live incident. It is fully client-side, free, and needs no key or server. Each incident is a branching decision tree (`js/branch.data.js`), and `js/branch.js` resolves the choices, scores the path, and assigns a letter grade.

Every decision runs against a countdown timer. Decide well and fast and the incident is contained. Hesitate and the timer runs out, the slow path is taken for the student, and the attacker escalates: ransomware spreads, the defacement gets noticed by the press, the pipeline ships poisoned code. The final screen shows the outcome as a letter grade with a short narrative of how the incident ended, plus the response score and XP earned. There are four incidents to start: double-extortion ransomware, MFA push fatigue, web defacement, and a CI/CD pipeline compromise. To add more, add a tree to `js/branch.data.js` keyed by a scenario id, with nodes, timed options, and endings.

Both of these features, and the AI tutor's default mode, run entirely in the student's browser. There is nothing to pay for and nothing to host beyond the static files themselves.

## Class leaderboard and competitions

The leaderboard at `leaderboard.html` lets the class compete on total XP, with shifts, flags, and detections shown alongside. It has a podium for the top three, a full ranked table that highlights the viewer's own row, and a class stats strip showing player count, total XP, flags captured, and the top rank reached.

Because the site is static, the board needs one small shared store. The free option is a Google Sheet plus a short Google Apps Script, included at `integrations/google-apps-script/Code.gs`. You paste that script into a Sheet, deploy it as a Web App, and copy the resulting URL into the CONFIG block at the top of `js/leaderboard.js`. Full step-by-step setup is in the header of the Code.gs file. The student side never holds a key, the data lands in a normal Sheet you can sort and chart, and it runs under your own Google account at no cost.

Until you add a URL, the page runs in local preview mode and shows a clear banner saying so. In that mode scores stay in the one browser, which is fine for a demo but not a real class board.

Two honest notes. The board is for motivation, not grading. Scores are submitted from each browser, so a determined student who reads the page source could craft a fake submission. There is an optional shared secret that signs submissions, set `SECRET` in both `js/leaderboard.js` and `Code.gs` to the same phrase, which stops casual tampering, though it cannot make a public page truly tamper proof. Grade on the signed completion codes you verify in the instructor console, and treat the board as the fun layer on top. For privacy, ask students to use a handle or first name plus last initial, and keep grades out of the Sheet.

Easy extensions from here, if you want them later: a first-blood bonus for the first solver of each scenario, a weekly challenge with a deadline, and section or team grouping, which the board already records a column for. A Cloudflare Worker version of the backend is also possible, since the project already includes a worker file for the tutor.

## Training modes beyond shifts

Capture the Flag arena. `ctf.html` holds 20 short challenges across log analysis, network forensics, web, encoding and crypto, malware triage, cloud, identity, and recon. Each artifact mirrors a real analyst task. Flags use the format BVHN{...}. Answers are stored only as SHA-256 hashes, so the plaintext flags are not in the page source. Students earn points and XP, and can generate a CTF completion code for Blackboard.

Certification readiness. `certs.html` maps every shift and flag to CompTIA CySA+ V4 exam domains, which are Security Operations at 34 percent, Vulnerability Management at 26 percent, Incident Response and Management at 24 percent, and Reporting and Communication at 16 percent. Foundation skills map to Security+ SY0-701. The page shows a weighted readiness score, the CompTIA pathway, and the DoD Cyber Workforce roles CySA+ supports.

Gamification and profile. `profile.html` shows rank, an XP bar, a daily streak, earned badges, completed shifts, and a CySA+ readiness summary. XP comes from shift scores and captured flags. Everything saves to the browser. A live class leaderboard needs shared storage, which is the upgrade note below.

## The AI tutor

The tutor works the moment you deploy, with no backend. It reads the active scenario and the student's live progress and nudges them with Socratic questions rather than handing over answers. That is guide mode.

Optional live mode. If you want the tutor backed by a real Claude model, deploy the included proxy at `proxy/cloudflare-worker.js`. It keeps your Anthropic API key server-side, so the key never ships to students. Steps are in the proxy file header. In short: install Wrangler, set your key with `wrangler secret put ANTHROPIC_API_KEY`, deploy, then in `soc.html` uncomment the line that sets `window.SOC_TUTOR_ENDPOINT` to your worker URL. Never put an API key directly in client code.

## Reference library

`library.html` has three parts.

Document templates. Eight Word templates students download, fill out, and turn in as assignments: Incident Report, Post-Incident Review (the lessons-learned post-mortem), Executive Brief, Incident Ticket, Alert Triage Worksheet, Chain of Custody and Evidence Log, Situation Report (SITREP), and Root Cause Analysis. They are branded for CYBR 4350, marked simulated data only, and built with fill-in prompts. Files live in `library/templates/`.

Playbooks and SOPs. A standard operating procedure for each incident type, organized by the response lifecycle from Detect through Improve. Each playbook lists the scenarios it applies to and links the NIST guidance behind it. From any shift, the briefing has an Open SOP link that jumps straight to the matching playbook.

NIST shelf. Direct links to the publications a SOC and a senior project should cite: CSF 2.0, SP 800-61r3 for incident response, the SP 800-53r5 controls catalog, SP 800-30 and 800-37 for risk, plus the forensic, logging, and recovery guides. Links point to the official CSRC pages so they stay current. The incident-response guidance is the 2025 Revision 3, which is organized around CSF 2.0.

Regenerate or extend. The templates are generated. To change them, edit `build/gen-docs.mjs` and run `node build/gen-docs.mjs` from the project root. To change playbooks, the NIST list, or the scenario-to-playbook mapping, edit `js/library.data.js`.



Live class leaderboard. Browser storage is per machine, so there is no shared leaderboard by default. Two simple paths: post completion codes to a Google Form that feeds a Sheet, or stand up a tiny serverless endpoint that records scores. Either keeps the static front end intact.

Add CTF challenges. The CTF data file is generated so plaintext flags never ship. Edit `build/gen-ctf.mjs`, add a challenge with its plaintext flag, then run `node build/gen-ctf.mjs` from the project root. It recomputes hashes and rewrites `js/ctf.data.js`.

Adjust certification mapping. Edit the scenario and CTF maps in `js/certs.data.js` to retag content to exam domains.



This is a training simulation. No real systems are involved and no real attacks are performed. The completion code is a low-stakes academic integrity signal, not a cryptographic guarantee, because the signing secret lives in client code. Rotate it per term and use the verifier. Browser storage holds shift progress per browser, so a student who switches machines starts fresh. For true LMS auto-grading with server-side trust, an LTI integration is the upgrade path beyond static hosting.
