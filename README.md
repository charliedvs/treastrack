# TreasTrack 🎭

> **Backstage Technical Services (BTS Bath)**  
> Purpose-built event finance tracking, automated Blue Form generation, and society treasurer handover management.

---

## 📋 Overview

TreasTrack is an offline-capable, serverless web application designed specifically for the Backstage Technical Services Treasurer. It streamlines society billing, financial entry management, and year-to-year handover without requiring complex databases or recurring server costs.

### Key Capabilities

- **Event & Finance Tracking**: Record society events, charges, start/end dates, and tracking checkboxes (*Finance entry created*, *Invoice drafted*, *Invoice sent*).
- **Automated Blue Form Generation**: Merges event details directly into the official BTS Blue Form PDF using `pdf-lib`.
- **Built-in Bath Societies Registry**: Preloaded with 142 University of Bath societies and department account codes. Automatically flags unlisted external clients (in red) and disables the Blue Form button when forms are not required.
- **Google Workspace Automation**: Optional one-click Google Drive event folder creation and Gmail invoice draft composition using Google Apps Script.
- **Google Sign-In Access Gatekeeper**: Restricts access strictly to the official society treasurer Google account (`treas@bts-crew.com`). Any unauthorized Google accounts are denied access.
- **1st August Financial Year Rollover**: Automatically archives the previous financial year's events on 1st August and resets the workspace for incoming treasurers while preserving templates and custom settings. Includes manual rollover controls and JSON backup downloads.

---

## 🚀 Deployment via GitHub Pages

TreasTrack runs entirely client-side, making it free and zero-maintenance to host on **GitHub Pages**:

1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/<your-username-or-org>/treastrack.git
   git branch -M main
   git push -u origin main
   ```
2. **Enable GitHub Pages**:
   - Go to your repository on GitHub $\rightarrow$ **Settings** $\rightarrow$ **Pages**.
   - Under **Build and deployment**, set **Source** to `Deploy from a branch`.
   - Select `main` branch and `/ (root)` folder, then click **Save**.
   - GitHub will generate your live URL: `https://<username>.github.io/treastrack/`.

---

## 🔐 Google Authentication Setup (`treas@bts-crew.com`)

TreasTrack uses Google Identity Services (GIS) to ensure only the holder of `treas@bts-crew.com` can access the application:

1. Open [Google Cloud Console](https://console.cloud.google.com/) while signed in as `treas@bts-crew.com`.
2. Create or select a project (e.g. *BTS TreasTrack*).
3. Under **APIs & Services $\rightarrow$ OAuth consent screen**:
   - Set User Type to **External** (or Internal if Google Workspace organization).
   - Enter App Name (*TreasTrack*) and developer contact email (`treas@bts-crew.com`).
4. Under **APIs & Services $\rightarrow$ Credentials**:
   - Click **Create Credentials** $\rightarrow$ **OAuth client ID**.
   - Select Application type: **Web application**.
   - Under **Authorized JavaScript origins**, add:
     - Your GitHub Pages URL (e.g. `https://<username>.github.io`)
     - `http://localhost` (for local testing)
   - Click **Create** and copy the Client ID (ends with `.apps.googleusercontent.com`).
5. Open TreasTrack $\rightarrow$ Click **OAuth Client ID** on the login screen $\rightarrow$ Paste your Client ID and save.

> **Offline / Local Testing**: Click the **Dev / Local Sign In** button to test the interface locally without an active Google OAuth configuration.

---

## 📁 Google Drive & Gmail Automation

To enable automatic Google Drive folder creation and Gmail draft generation:

1. Open [Google Apps Script](https://script.google.com/) under `treas@bts-crew.com`.
2. Create a new project, paste the contents of [`google-apps-script.js`](./google-apps-script.js), and save.
3. Click **Deploy $\rightarrow$ New deployment**:
   - Type: **Web app**
   - Execute as: **Me (treas@bts-crew.com)**
   - Who has access: **Anyone**
4. Copy the deployment URL (must end in `/exec`).
5. In TreasTrack, click **Google Setup** in the top bar, paste the web app URL, and optionally provide a parent Google Drive folder link or ID.

---

## 🔄 Treasurer Handover & Archiving (1st August)

The BTS financial year runs **1st August to 31st July**:
- **Automatic Rollover**: When TreasTrack is opened on or after 1st August, events from the previous financial year are automatically moved to historical archives, and the active workspace is cleared for the incoming treasurer.
- **Manual Handover**: Click the academic year badge in the header (e.g., `2026–2027 ▾`) to view active totals, download a JSON backup, view past archives, or trigger handover manually at any time.
- **Data Safety**: Template PDFs, society mappings, and settings are preserved across rollovers.
