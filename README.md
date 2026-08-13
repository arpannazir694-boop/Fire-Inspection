# Fire Safety Audit — VS Code Project

তোমার Google Apps Script (GAS) app-টাকে normal web-project structure-এ ভাগ করে দেওয়া হয়েছে, যাতে VS Code-এ সহজে edit করতে পারো।

## Folder Structure

```
fire-safety-audit/
├── index.html                     ← Frontend HTML (আগের Index.html)
├── style.css                      ← সব CSS আলাদা করা হয়েছে
├── main.js                        ← সব JavaScript আলাদা করা হয়েছে
├── google-apps-script/
│   ├── Code.gs                    ← Backend (Apps Script editor-এ paste করবে)
│   └── appsscript.json            ← GAS project manifest (optional, clasp-এর জন্য)
└── README.md
```

## কীভাবে কাজ করে (গুরুত্বপূর্ণ ধারণা)

Google Apps Script-এর মধ্যে HTML/CSS/JS আলাদা করা গেলেও, **backend (Code.gs) সবসময় Google-এর সার্ভারেই থাকবে** — ওটা local-এ চালানো যায় না। তাই architecture-টা এরকম:

- **Frontend** (`index.html`, `style.css`, `main.js`) — এখন থেকে VS Code-এ freely edit করতে পারবে, এমনকি local browser-এ preview-ও করতে পারবে।
- **Backend** (`Code.gs`) — এটা Apps Script project-এ deploy করা থাকবে, আর frontend সেটার সাথে কথা বলে একটা **deployed Web App URL** দিয়ে (`fetch()` কলের মাধ্যমে), Apps Script-এর নিজস্ব `google.script.run` API দিয়ে না।

ভালো খবর হলো, তোমার original code-এ এটা **already এইভাবেই লেখা ছিল** (`main.js`-এর প্রথম লাইনে `WEB_APP_URL` variable দেখো) — তাই আলাদা করার পর extra কিছু rewrite করা লাগেনি, শুধু ফাইল ভাগ করা হয়েছে।

## যে bug-টা fix করে দিয়েছি

`Code.gs`-এর `doGet()` function-এ Report Dashboard-এর জন্য দুইটা action (`reportData`, `markDone`) handle করার code লেখাই ছিল না — নিচে comment হিসেবে "ADD THESE ADDITIONS" বলে পড়ে ছিল, কখনো actual `doGet()`-এ যোগ করা হয়নি। আমি সেটা এখন সরাসরি `doGet()`-এ wire করে দিয়েছি, তাই Report Dashboard button এখন কাজ করবে।

## Local-এ preview করার নিয়ম

1. VS Code-এ folder-টা open করো।
2. "Live Server" extension install করো (Ritwick Dey-এর extension, খুবই popular)।
3. `index.html`-এর ওপর right-click করে **"Open with Live Server"** করো।
4. Browser-এ app খুলে যাবে, আর `main.js`-এর `WEB_APP_URL`-এ থাকা তোমার আগের deployed Apps Script URL দিয়েই data load/save হবে।

> Note: `fetch` cross-origin POST-এর জন্য `Content-Type: text/plain` ব্যবহার করা আছে (Apps Script-এর CORS bypass trick) — এটা আগে থেকেই code-এ ছিল, তাই localhost থেকেও কাজ করবে।

## Backend আপডেট করলে কী করতে হবে

`Code.gs`-এ কোনো change করলে, সেটা VS Code-এ edit করার পর আবার **Google Apps Script editor**-এ গিয়ে paste করে দিতে হবে (অথবা নিচের clasp পদ্ধতি ব্যবহার করতে পারো), তারপর **নতুন করে Deploy > Manage deployments > Edit > New version** করতে হবে। নাহলে নতুন code live হবে না।

## (Optional, Advanced) `clasp` দিয়ে সরাসরি sync

চাইলে VS Code থেকেই সরাসরি Google-এর সাথে sync করতে পারো, প্রতিবার copy-paste করা লাগবে না:

```bash
npm install -g @google/clasp
clasp login
cd google-apps-script
clasp clone <তোমার Apps Script Project ID>   # অথবা clasp create --type webapp
clasp push     # local change → Google-এ পাঠাবে
clasp pull     # Google-এর change → local-এ আনবে
clasp deploy   # নতুন version deploy করবে
```

Project ID পাবে Apps Script editor-এর **Project Settings** (⚙️ icon) থেকে "Script ID"।

## নতুন যোগ হলো: Daily Task ফিচার

Header-এর Daily Task icon-এ click করলে এখন একটা card/modal খুলবে —

1. Modal-এর header-এই দুইটা live stat pill দেখাবে: **আজকে কত factory visit করা হয়েছে** আর **আজকে মোট কত সময় কাজ করা হয়েছে** — এগুলো "Daily Task" sheet থেকে auto-calculate হয়, প্রতিবার modal খুললে অথবা একটা Sign Out complete হলে refresh হয়ে যায়।
2. Header-এর একদম right-এ একটা ছোট্ট **report icon** থাকবে — সেটায় click করলে একই modal-এর ভেতরেই একটা filterable table খুলে যাবে, যেখানে **Date range** (From/To) আর **Factory (Unit)** dropdown দিয়ে filter করা যাবে, সাথে Total Visits / Factories / Total Time-এর ছোট KPI card থাকবে। "Back" button দিয়ে আগের sign-in/sign-out view-এ ফিরে আসা যাবে।
3. Sign In badge-এ click করলে top-right corner-এ একটা **stopwatch** চালু হয়ে যাবে (modal বন্ধ করলেও চলতে থাকবে), আর form-এ চলে আসবে: **Unit** dropdown (এটা Factory Name — `DROPDOWN` sheet-এর Column A থেকে dynamically load হওয়া factory list, main audit form-এর "Factory Name" field যেটা use করে ঠিক সেটাই), **Floor** dropdown (1st/2nd/.../OUTSIDE/ALL), **Observation Area** text field, আর **Priority** (High/Medium/Low) dropdown, সাথে একটা **Sign Out** badge।
4. সব field fill করে Sign Out-এ click করলে Unit, Floor, Observation Area, Priority, Sign-In time, Sign-Out time, আর মোট Duration — এই data-টা Google Sheet-এর **"Daily Task"** নামের sheet-এ (না থাকলে auto-create হয়ে যাবে) একটা নতুন row হিসেবে save হয়ে যাবে, stopwatch বন্ধ হয়ে যাবে, header-এর stats refresh হবে, আর card আবার Sign In state-এ reset হবে।

এটা কাজ করার জন্য `Code.gs`-এ এই নতুন function গুলো যোগ করা হয়েছে —
- `dailyTask()` / `saveDailyTask()` — Sign Out-এর সময় "Daily Task" sheet-এ row লেখে (আগে থেকেই ছিল)।
- `getDailyTaskData()` — পুরো "Daily Task" sheet read করে report table-এর data দেয়।
- `getDailyStats()` — আজকের date অনুযায়ী factory count আর total time বের করে header-এর জন্য।
- `doGet()`-এ `action === 'dailyStats'` আর `action === 'dailyTaskData'` branch, আর `doPost()`-এ আগে থেকে থাকা `action === 'dailyTask'` branch।

তাই **Apps Script editor-এ নতুন করে পুরো `Code.gs` paste করে re-deploy (Deploy > Manage deployments > Edit > New version)** করতে হবে, নাহলে header-এর stats আর report table-এ "Failed to load" / "Server did not return valid data" মতো error আসবে।

## Config মনে রাখার জিনিস

- `main.js`-এ `WEB_APP_URL` — এটা তোমার deployed Apps Script Web App-এর `/exec` URL, বদলাবে না যতক্ষণ না তুমি নতুন deployment বানাও (নতুন version আপডেট করলে URL same থাকে)।
- `Code.gs`-এ `CONFIG.SPREADSHEET_ID` খালি আছে — মানে এটা যেই Spreadsheet-এ bound আছে সেটাই ব্যবহার করবে (`SpreadsheetApp.getActiveSpreadsheet()`)। এটা তুমি চাইলে সরাসরি Spreadsheet ID বসিয়ে explicit করতে পারো।