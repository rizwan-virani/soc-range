# SOC Range — project guide for Claude Code

This file is read automatically at the start of every session. It tells you what
this project is, the rules you must follow, and how it is built and deployed.
Start any session by skimming `README.md` for the full feature detail.

## What this is

SOC Range is a browser-based Security Operations Center training platform for
**CYBR 4350: Senior Project** (BAT in Cybersecurity) at **San Jacinto College**.
It is authored by **Professor Rizwan Virani** and that credit appears in page
footers and docs. It teaches defensive security with realistic but entirely
**simulated** data. The fictional org is **Brazos Valley Health Network (BVHN)**,
a healthcare network, so HIPAA-style stakes show up in scenarios.

It is a teaching tool for students. All content is for defense, detection, and
incident response. Keep it that way.

## Hard constraints (do not break these)

1. **Free and static only.** The site is hosted on **GitHub Pages**. There is no
   server, no backend, no build server, and **no paid services**. The college is
   funding-constrained, so this is non-negotiable.
2. **No API keys in the shipped site.** Anything students run must work with no
   key and no login. Features that need AI must run fully client-side and offline,
   or be optional bring-your-own-key that the student enters locally. Never commit
   a secret. The leaderboard's optional shared secret is the only signed value and
   it lives in config the instructor edits.
3. **Everything is client-side.** Pure HTML, CSS, and vanilla JavaScript. Scripts
   attach to the global `self.SOC` namespace and load as classic scripts, not ES
   modules, because a Web Worker uses `importScripts`. Do not introduce frameworks
   or a bundler.
4. **Paths stay relative** so the site works at the `/soc-range/` subpath on Pages.
5. Keep the `.nojekyll` file at the repo root. Pages needs it to serve the folders.

## Author's writing preferences (apply to all prose and UI copy)

- **No em dashes.** Use a period or a comma instead.
- **No long, multi-comma sentences.** Keep sentences short and plain.
- Plain, direct, encouraging tone. This is for students.

## How it is built

- `index.html` is the launcher. Scenarios are grouped into collapsible tier tiles
  (T1, T2, T3, AE, GRC). Other pages: `soc.html` (the analyst workstation), `detect.html`
  (Detection Engineering Lab, Sigma rules), `response.html` (Live Response branching
  sim), `splunk.html` (SPL lab), `ctf.html`, `certs.html`, `profile.html`,
  `leaderboard.html`, `library.html`, `instructor.html` (passphrase: ciso).
- Core JS in `js/`: `prng.js`, `entities.js`, `log-engine.js`, `scenarios.data.js`
  (single source of truth for the 100 scenarios), `state.js` (signed completion
  codes), `gamification.js`, `dataset.js`, `sigma.js`, `branch.js`, `theme.js`,
  `leaderboard.js`, and more. Styles in `css/soc.css`.
- The leaderboard backend is a Google Apps Script in
  `integrations/google-apps-script/Code.gs`. The instructor pastes its URL into the
  CONFIG block at the top of `js/leaderboard.js`. Until then it runs in local mode.

## Scenarios, log templates, and playbooks

- There are **100 operational scenarios** across four tiers: T1 triage, T2 incident
  response, T3 threat hunting, and AE advanced and emerging (cloud, identity, and
  AI-era threats, including dedicated AI-threat scenarios). A fifth tier, **GRC**
  (Governance, Risk and Compliance), adds **25 higher-education scenarios** (FERPA,
  GLBA, HECVAT, HIPAA, PCI, NIST 800-30/34/50/53A/171/184), set at San Jacinto
  College with BVHN as the health partner. GRC scenarios are either
  incident-anchored (real logs plus a GRC deliverable, 5 of them) or pure
  assessment shifts with no live feed (20 of them), flagged by `kind: "grc"`. The
  `kind` flag turns off the SIEM worker and swaps the briefing, deliverables, and
  Incident-tab copy in `js/app.js`; grading still runs off the playbook steps and
  questions. GRC scenarios estimate 150 minutes and every one requires a recorded
  presentation video deliverable, like the T1-T3 incident reports. All scenarios
  are pure data in `js/scenarios.data.js`. `node build/build.mjs` reports the total
  (125: 100 operational plus 25 GRC).
- Every event a scenario emits (`logScript`, `repeat`, `finale`) names a template
  in the `T` object in `js/log-engine.js`. A scenario may only reference templates
  that already exist there. To add a new attack pattern, add an entity-correlated
  template first (use the shared refs from `js/entities.js`), then reference it.
- IOC `ref` values and `answerKey.expectedIOCs` must be keys returned by
  `buildEntities` in `js/entities.js` (for example `ip.attacker`, `domain.c2`,
  `user.compromised`). AI-era techniques use AI/ATLAS ids like `AML.T0051`, defined
  in the `MITRE` map at the top of `js/scenarios.data.js`.
- **Every scenario must map to a playbook/SOP.** Playbooks live in
  `js/library.data.js` (`PLAYBOOKS`); a scenario is linked either by appearing in a
  playbook's `appliesTo` or by an entry in `EXTRA_PLAYBOOK`. Keep this true for any
  scenario you add.
- The per-shift orientation on the workstation is generic: it reads the loaded
  scenario's briefing and objectives, so new scenarios are covered automatically
  with no per-scenario orientation work.
- After adding scenarios, run `node build/build.mjs` (confirm the new count) and
  render-check that every event resolves to a real template, not the `event:`
  fallback text. The whole library was last grown from 40 to 100 this way.

## Testing before you ship

There are Node-based headless tests used throughout this project. Before
considering a change done, syntax-check changed JS with `node --check`, and where a
feature has logic (the Sigma engine, the branch engine, the SPL interpreter), run a
quick Node harness to confirm it still passes. The scenario build is
`node build/build.mjs` and should report 100 scenarios.

## Deploying

This repo is linked to GitHub. To publish a change: commit it and push to the
`main` branch. GitHub Pages redeploys on its own in about a minute. If the live
site looks unchanged, it is almost always browser cache, so hard refresh with
Ctrl+Shift+R before assuming anything failed.

## Style of help wanted

Make the change, show the diff, and explain briefly. Prefer small, verifiable steps.
Match the existing design system and page structure rather than inventing new
patterns. When in doubt about a feature's behavior, read `README.md` first.
