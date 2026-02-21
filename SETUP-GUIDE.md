# 💰 Money Tracker — Setup Guide

Two parts: **Google Sheets backend** (stores your data) + **GitHub Pages** (hosts the app anywhere).
Total time: about 10–15 minutes, one time only.

---

## Part 1 — Google Sheets + Apps Script (your data home)

### Step 1 — Create a new Google Sheet
1. Go to **sheets.google.com** → click **＋ Blank**
2. Name it: `Money Tracker`
3. Copy the URL — you'll need it in Step 3

### Step 2 — Open Apps Script
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete all the default code in the editor (select all → delete)
3. Open the file `google-apps-script.js` (in this same folder)
4. Copy everything → paste it into the Apps Script editor
5. Click **💾 Save** (the floppy disk icon)

### Step 3 — Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click ⚙️ next to "Select type" → choose **Web app**
3. Fill in:
   - Description: `Money Tracker API`
   - Execute as: **Me**
   - Who has access: **Anyone** ← important!
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → Allow
6. Copy the **Web App URL** — looks like:
   `https://script.google.com/macros/s/AKfycb…/exec`
7. **Save this URL somewhere safe** — you need it in Part 3

> ⚠️ Every time you edit the Apps Script, you must make a **new deployment** (not update existing) to get the latest version.

---

## Part 2 — GitHub Pages using GitHub Desktop (host your app anywhere, free)

### Step 1 — Install GitHub Desktop & create account
1. Go to **desktop.github.com** → Download and install
2. Open GitHub Desktop → click **Sign in to GitHub.com**
3. Follow the browser flow to create a free account (or sign in if you have one)
4. Come back to GitHub Desktop — your account will be connected

### Step 2 — Create a new repository
1. In GitHub Desktop, click **File** → **New Repository**
2. Fill in:
   - Name: `money-tracker`
   - Description: `My personal money tracker app`
   - Local path: choose a folder on your computer (e.g. Documents)
   - ✅ Check **Initialize this repository with a README**
3. Click **Create Repository**
4. GitHub Desktop now shows your empty repo — it lives in the folder you chose

### Step 3 — Add the tracker file
1. Open the folder GitHub Desktop created (click **Show in Finder / Explorer** in the app)
2. Copy `expense-tracker.html` into that folder
3. **Rename it to `index.html`** — this is important for GitHub Pages!
4. Back in GitHub Desktop, you'll see `index.html` appear in the **Changes** panel on the left
5. At the bottom left, type a commit message:
   `Initial commit — money tracker v1`
6. Click **Commit to main**
7. Click **Publish repository** (top bar) → uncheck "Keep this code private" → **Publish**

### Step 4 — Enable GitHub Pages
This one step still needs the GitHub website (only needed once):
1. Go to **github.com** → find your `money-tracker` repo → click **Settings**
2. In the left sidebar → click **Pages**
3. Under Source → **Deploy from a branch**
4. Branch: `main` → folder: `/ (root)` → **Save**
5. Wait ~1 minute → refresh the page → your live URL appears:
   `https://YOUR-USERNAME.github.io/money-tracker/`

**Bookmark this on your phone and computer!**
On iPhone: Safari → Share → **Add to Home Screen** → it'll look like an app icon 📱

---

## How to update the app in future (GitHub Desktop workflow)

Every time we improve the app together in chat:
1. I give you the new `expense-tracker.html` file
2. Replace `index.html` in your repo folder with the new file (same name)
3. Open GitHub Desktop — the changes appear automatically in the left panel
4. Write a short commit message describing what changed, e.g.:
   - `add travel mode`
   - `fix receipt photo bug`
   - `add yearly summary chart`
5. Click **Commit to main** → then **Push origin** (top bar)
6. GitHub Pages updates in ~1 minute ✓

> 💡 This is your version history! Click **History** tab in GitHub Desktop anytime
> to see every version, when it changed, and what the message was.
> To revert: right-click any commit → **Revert changes in commit**.

---

## Part 3 — Connect the app to Google Sheets

1. Open your tracker app (the GitHub Pages URL)
2. Tap **⚙ Setup** in the top right
3. Paste your **Web App URL** from Part 1 Step 3
4. Tap **Save & Connect**
5. The status bar should turn green ✓

**That's it!** Every entry you save will now:
- Save to your browser (instant, works offline)
- Sync to your Google Sheet automatically

---

## How to view your data in Google Sheets

Open your `Money Tracker` Google Sheet anytime to see all entries as rows.

### Add a Monthly Summary sheet (optional but nice)
1. Click **＋** at the bottom to add a new sheet → name it `Monthly Summary`
2. In cell A1, type a formula like:
   `=SUMPRODUCT((MONTH(Entries!B2:B)=MONTH(TODAY()))*(YEAR(Entries!B2:B)=YEAR(TODAY()))*(Entries!C2:C="out")*(Entries!D2:D))`
   This shows total spent this month.
3. To export as PDF: **File** → **Download** → **PDF**

---

## Summary PDF from the app

In the **📊 Summary tab** inside the tracker:
1. Navigate to the month you want
2. Tap **🖨 Print / Save as PDF**
3. Your browser print dialog opens → change destination to **Save as PDF**

---

## Version control tips (GitHub Desktop)

| What you want to do | How |
|---|---|
| See all past versions | GitHub Desktop → **History** tab |
| See what changed in a version | Click any commit in History → see green/red diff |
| Go back to an older version | Right-click commit → **Revert changes in commit** |
| Compare two versions | GitHub website → repo → **Commits** → click any commit |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Sync shows red error | Check your Web App URL is correct in ⚙ Setup |
| Data not appearing in Sheets | Re-deploy the Apps Script (Step 3 of Part 1) |
| App not loading on phone | Make sure GitHub Pages is enabled and URL is correct |
| Date picker not working | Use the native date input — tap the date field directly |
