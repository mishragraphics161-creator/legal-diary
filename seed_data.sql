-- Supabase SQL: Court Cases Table with Hearing History & Chamber Physical File Tracker
-- Run this in Supabase -> SQL Editor to set up or update your cloud database!

-- 1. Create court cases table if not exists
CREATE TABLE IF NOT EXISTS court_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  parties TEXT NOT NULL,
  case_type TEXT DEFAULT 'Criminal',             -- 'Criminal', 'Civil', 'Bail', 'Writ', 'Family', 'Revenue', 'Other'
  representing TEXT DEFAULT 'Petitioner',        -- 'Petitioner' / 'Respondent' / 'Applicant' / 'Accused'
  court_name TEXT,                               -- e.g. 'High Court - Court No. 12', 'ACJM-5'
  judge_name TEXT,                               -- Presiding officer / Room No.
  police_station_fir TEXT,                       -- Police Station & Crime/FIR No.
  act_sections TEXT,                             -- Acts & IPC / BNS / BNSS / NI Act Sections
  client_name TEXT,                              -- Client's full name
  client_phone TEXT,                             -- Client phone for 1-tap call/WhatsApp
  
  -- Hearing Details
  next_hearing_date DATE NOT NULL,               -- Next Date of Hearing (NDOH)
  hearing_stage TEXT DEFAULT 'Arguments',        -- Current Stage (Arguments, Evidence, Notice, Order, etc.)
  priority TEXT DEFAULT 'Normal',                -- 'Urgent', 'Normal', 'Routine'
  status TEXT DEFAULT 'Active',                  -- 'Active', 'Disposed', 'Stayed'
  senior_instructions TEXT,                     -- Senior's notes / action items / court proceedings
  file_drive_link TEXT,                          -- Scanned petition or Google Drive link
  
  -- Chamber Physical File Location Tracking
  file_in_chamber BOOLEAN DEFAULT true,          -- true = In Chamber, false = Outside (Court/Junior/Client)
  file_current_holder TEXT DEFAULT 'Chamber',    -- 'Chamber', 'In Court', 'With Junior', 'With Client'
  chamber_almirah TEXT DEFAULT 'Almirah-A',      -- Almirah / Rack Identifier
  chamber_shelf TEXT DEFAULT 'Shelf-1',          -- Shelf Number
  chamber_bundle_no TEXT,                        -- Bundle / Basta / Folder Tag
  file_last_moved_at TIMESTAMP WITH TIME ZONE,   -- Timestamp when file was checked out or returned
  
  -- Hearing History Log (JSON Array: [{date, stage, remarks, recorded_at}])
  hearing_history JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. If table already exists, alter to add new columns safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='case_type') THEN
    ALTER TABLE court_cases ADD COLUMN case_type TEXT DEFAULT 'Criminal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='representing') THEN
    ALTER TABLE court_cases ADD COLUMN representing TEXT DEFAULT 'Petitioner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='police_station_fir') THEN
    ALTER TABLE court_cases ADD COLUMN police_station_fir TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='act_sections') THEN
    ALTER TABLE court_cases ADD COLUMN act_sections TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='client_name') THEN
    ALTER TABLE court_cases ADD COLUMN client_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='client_phone') THEN
    ALTER TABLE court_cases ADD COLUMN client_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='file_in_chamber') THEN
    ALTER TABLE court_cases ADD COLUMN file_in_chamber BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='file_current_holder') THEN
    ALTER TABLE court_cases ADD COLUMN file_current_holder TEXT DEFAULT 'Chamber';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='chamber_almirah') THEN
    ALTER TABLE court_cases ADD COLUMN chamber_almirah TEXT DEFAULT 'Almirah-A';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='chamber_shelf') THEN
    ALTER TABLE court_cases ADD COLUMN chamber_shelf TEXT DEFAULT 'Shelf-1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='chamber_bundle_no') THEN
    ALTER TABLE court_cases ADD COLUMN chamber_bundle_no TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='file_last_moved_at') THEN
    ALTER TABLE court_cases ADD COLUMN file_last_moved_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='court_cases' AND column_name='hearing_history') THEN
    ALTER TABLE court_cases ADD COLUMN hearing_history JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE court_cases ENABLE ROW LEVEL SECURITY;

-- 4. Create public policy for Anon Key
DROP POLICY IF EXISTS "Allow all operations with anon key" ON court_cases;
CREATE POLICY "Allow all operations with anon key"
  ON court_cases 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
