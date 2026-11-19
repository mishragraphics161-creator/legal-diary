# 🏛️ Legal Diary - Mobile-First Court Case, Hearing History & Chamber File Tracker

A modern, mobile-first web app designed for advocates, juniors, and legal chambers to manage court case files, track physical files (*"File Chamber me hai ya nahi?"*), log detailed hearing histories (tareekh-dar-tareekh), track upcoming hearing dates (NDOH), and print daily cause lists.

Ready to deploy on **GitHub Pages** (100% static, zero server required) backed by **Supabase Database** or completely offline with local device storage.

---

## 📱 Key Features
- **Mobile-First App Experience**:
  - Native App-like bottom navigation (`Today`, `Cases`, `Chamber`, `+ Add Case`, `Cloud Settings`).
  - Slide-up bottom sheets with drag handles.
  - 1-thumb touch reach designed for busy court corridors and halls.
- **🏛️ Physical Chamber File Tracker ("File Chamber Me Hai Ya Nahi?")**:
  - Real-time status indicator: 🟢 **In Chamber** vs 🟠 **Outside Chamber**.
  - Track who currently holds the file (*In Court No. 5*, *Adv. Rahul (Junior)*, *Munshi Ji*, *Client*).
  - Exact storage location tracking: **Almirah / Rack**, **Shelf Number**, and **Basta / Bundle #**.
  - 1-Tap *"Issue File / Mark Out"* and 1-Tap *"Return to Chamber"* buttons.
  - Dedicated Chamber Explorer view with Almirah breakdown and outside files checklist.
- **📜 Hearing History Log (Tareekh History)**:
  - Complete chronological timeline of all past court hearings.
  - Automatic rollover: Updating NDOH records the previous hearing's proceedings and date.
  - View full history timeline in a mobile drawer sheet.
- **⚖️ Complete Case Dossier**:
  - Case Number, Type (Criminal, Civil, Bail, Writ, etc.), Representing side.
  - Police Station, FIR / Crime No., Sections & Acts (IPC, CrPC, BNS, BNSS, NI Act).
  - Client Contact with instant **Call** and **WhatsApp** direct links.
  - Senior directives and Google Drive dossier links.
- **Offline & Cloud Sync (PWA)**:
  - Works 100% offline in court basements with offline queue.
  - Seamless 2-way sync with Supabase when internet connects.

---

## 🗄️ Step 1: Supabase Database Setup (2 Minutes)

1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. Open the **SQL Editor** from the left sidebar.
3. Paste the following SQL query and click **RUN**:

```sql
-- 1. Create court cases table
create table if not exists court_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null,               -- e.g. "WP(C) 1042/2024"
  parties text not null,                   -- e.g. "Ramesh Kumar vs State of UP & Ors."
  court_name text,                         -- e.g. "High Court - Court No. 12"
  judge_name text,                         -- e.g. "Hon'ble Justice Sharma"
  next_hearing_date date not null,         -- Next Date of Hearing (NDOH)
  hearing_stage text default 'Arguments',  -- Stage (Arguments, Evidence, Notice, Order, etc.)
  senior_instructions text,               -- Senior's notes / action items
  file_drive_link text,                    -- Google Drive / scanned petition link
  status text default 'Active',            -- 'Active', 'Disposed', 'Reserved for Order'
  priority text default 'Normal',          -- 'Urgent', 'Normal'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table court_cases enable row level security;

-- 3. Create public access policy for your Anon Key
create policy "Allow all operations with anon key"
  on court_cases 
  for all 
  using (true) 
  with check (true);

-- 4. (Optional) Insert the 23 cases given by Senior:
-- See seed_data.sql in this repository or run the script in seed_data.sql
```

4. Go to **Project Settings -> API** in Supabase:
   - Copy **Project URL** (e.g. `https://xyz.supabase.co`)
   - Copy **anon public** Key.

5. Open your Legal Diary webpage, click on the **Settings (Database)** icon, paste the URL and Key, and click **Save & Connect**.

---

## 🚀 Step 2: Publish to GitHub Pages (Free Hosting)

1. Create a new repository on [GitHub](https://github.com) (e.g., `court-diary`).
2. In your local terminal, run:
```bash
git init
git add .
git commit -m "Initial Legal Diary app"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```
3. In your GitHub repository:
   - Go to **Settings -> Pages**.
   - Under **Build and deployment -> Source**, select **Deploy from a branch**.
   - Select Branch: **`main`** and folder: **`/ (root)`**, then click **Save**.
4. Within 1-2 minutes, your website will be live at:
   `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`

---

## 📲 Step 3: Add to Mobile Home Screen (Install App)

### On Android (Chrome):
1. Open the published GitHub Pages URL in Google Chrome.
2. Tap the three dots menu (⋮) at the top right.
3. Tap **"Add to Home Screen"** or **"Install app"**.
4. The Legal Diary icon will appear on your phone's home screen just like a native app!

### On iPhone (Safari):
1. Open the URL in Safari.
2. Tap the **Share** button (box with an arrow pointing up) at the bottom.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**.

---

## 🛠️ Local Testing
To test locally right now:
Simply double-click `index.html` in your file explorer to open it in any browser!
