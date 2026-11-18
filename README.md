# 🏛️ Legal Diary - Mobile First Court Case & Hearing Date Tracker

A modern, minimalistic, mobile-first web app designed for advocates, juniors, and legal teams to manage court case files, track upcoming hearing dates (NDOH), share instant WhatsApp updates with seniors, and print daily cause lists.

Ready to deploy on **GitHub Pages** (100% static, zero server required) backed by **Supabase Database**.

---

## 📱 Key Features
- **Mobile-First UX**: Designed for quick thumb-reach in courtrooms with bottom navigation and quick-action sheets.
- **Hearing Date Tracking**:
  - 🔴 **Today's Board**: Daily cause list prioritized at the top.
  - 🟡 **Tomorrow / This Week**: Action badges with countdowns (`In 2 days`, `In 5 days`).
  - ⚠️ **Passed Dates**: Automatic alert when a date has passed and needs NDOH update.
- **Instant NDOH Rollover**: 1-tap "Update Next Date" modal right after court proceedings.
- **WhatsApp Share with Senior**: 1-click formatted case briefing message to WhatsApp.
- **Print Daily Board**: Instant formatted cause list table ready for print or PDF.
- **Works Offline & Online**: Pre-loaded with demo mode and offline local cache. Connects seamlessly to Supabase.
- **PWA-Ready**: Can be installed to Android/iOS home screen as a standalone app.

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
