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

-- 5. Insert 23 Court Cases Provided by Senior (with chamber tracking & hearing details)
INSERT INTO court_cases (
  case_number, 
  parties, 
  case_type, 
  representing, 
  court_name, 
  police_station_fir, 
  act_sections, 
  next_hearing_date, 
  hearing_stage, 
  senior_instructions, 
  file_in_chamber, 
  file_current_holder, 
  chamber_almirah, 
  chamber_shelf, 
  chamber_bundle_no, 
  status, 
  priority
)
VALUES
('Case #01', 'Pawan Gupta vs Vishvanath Pitariya', 'Criminal', 'Petitioner', 'ACJM-5', NULL, NULL, CURRENT_DATE, 'Final Arguments', 'Pairokar to appear with verification affidavit', true, 'Chamber', 'Almirah-A', 'Shelf-1', 'Bundle-1', 'Active', 'Urgent'),
('Case #02', 'Pawan Gupta vs Raman Gupta', 'Civil', 'Petitioner', 'CJSD', NULL, NULL, CURRENT_DATE + INTERVAL '1 day', 'Evidence / Cross', '', true, 'Chamber', 'Almirah-A', 'Shelf-1', 'Bundle-1', 'Active', 'Normal'),
('Case #03', 'Pawan Gupta vs Ashok Singh', 'Criminal', 'Petitioner', 'ACJM-4', NULL, NULL, CURRENT_DATE + INTERVAL '2 days', 'Framing of Issues', '', true, 'Chamber', 'Almirah-A', 'Shelf-2', 'Bundle-1', 'Active', 'Normal'),
('Case #04', 'Pawan Gupta vs Ashok Singh', 'Criminal', 'Petitioner', 'ACJM-1', NULL, NULL, CURRENT_DATE + INTERVAL '3 days', 'Admission / Notice', '', true, 'Chamber', 'Almirah-A', 'Shelf-2', 'Bundle-1', 'Active', 'Normal'),
('Case #05', 'Pawan Gupta vs Ashok Singh', 'Civil', 'Petitioner', 'DJ', NULL, NULL, CURRENT_DATE + INTERVAL '4 days', 'Final Arguments', '', true, 'Chamber', 'Almirah-A', 'Shelf-3', 'Bundle-1', 'Active', 'Urgent'),
('Case #06', 'Jafar Ali vs State of UP(2 Files)', 'Criminal', 'Applicant', 'CO-IInd', NULL, NULL, CURRENT_DATE, 'Police Report / CD', '2 Files - Verify case diary and obtain status report', true, 'Chamber', 'Almirah-B', 'Shelf-1', '2 Files', 'Active', 'Urgent'),
('Case #07', 'Smt. Chhavi Rastogi vs Aman', 'Family', 'Petitioner', 'FTC-41', NULL, NULL, CURRENT_DATE + INTERVAL '1 day', 'Evidence / Cross', '', true, 'Chamber', 'Almirah-B', 'Shelf-2', 'Bundle-2', 'Active', 'Normal'),
('Case #08', 'Pawan Singh vs Kailash Singh', 'Civil', 'Petitioner', 'ACJJD-5', NULL, NULL, CURRENT_DATE + INTERVAL '2 days', 'Framing of Issues', '', true, 'Chamber', 'Almirah-B', 'Shelf-3', 'Bundle-2', 'Active', 'Normal'),
('Case #09', 'Vimal vs Komal Singh (skeleton)', 'Family', 'Petitioner', 'AFC-1st', NULL, NULL, CURRENT_DATE + INTERVAL '3 days', 'Miscellaneous', 'Skeleton argument / file to be prepared', true, 'Chamber', 'Almirah-C', 'Shelf-1', 'Bundle-3', 'Active', 'Normal'),
('Case #10', 'Mumtaz vs Unknown (FR)', 'Criminal', 'Petitioner', 'ACJM-3', NULL, NULL, CURRENT_DATE + INTERVAL '1 day', 'Admission / Notice', 'FR - Final Report submitted, protest petition to be filed', true, 'Chamber', 'Almirah-C', 'Shelf-2', 'Bundle-3', 'Active', 'Urgent'),
('Case #11', 'Alok Verma vs Raunak Juneja', 'Criminal', 'Petitioner', 'AJM-3', NULL, NULL, CURRENT_DATE + INTERVAL '5 days', 'Evidence / Cross', '', true, 'Chamber', 'Almirah-C', 'Shelf-3', 'Bundle-3', 'Active', 'Normal'),
('Case #12', 'State vs Dharampal', 'Criminal', 'Accused', 'ADJ/FTC', NULL, NULL, CURRENT_DATE + INTERVAL '6 days', 'Final Arguments', '', true, 'Chamber', 'Almirah-D', 'Shelf-1', 'Bundle-4', 'Active', 'Urgent'),
('Case #13', 'State vs Dharampal', 'Criminal', 'Accused', 'ACJM-5', NULL, NULL, CURRENT_DATE + INTERVAL '8 days', 'Evidence / Cross', '', true, 'Chamber', 'Almirah-D', 'Shelf-1', 'Bundle-4', 'Active', 'Normal'),
('Case #14', 'Shree Devi vs Janardan', 'Criminal', 'Petitioner', 'ACJM/FTC', NULL, NULL, CURRENT_DATE + INTERVAL '9 days', 'Framing of Issues', '', true, 'Chamber', 'Almirah-D', 'Shelf-2', 'Bundle-4', 'Active', 'Normal'),
('Case #15', 'Shree Devi vs Janardan', 'Family', 'Petitioner', 'FC', NULL, NULL, CURRENT_DATE + INTERVAL '10 days', 'Miscellaneous', '', true, 'Chamber', 'Almirah-D', 'Shelf-2', 'Bundle-4', 'Active', 'Normal'),
('Case #16', 'Gyanendara Mishra (Notice)', 'Civil', 'Petitioner', 'District Court', NULL, NULL, CURRENT_DATE + INTERVAL '4 days', 'Admission / Notice', 'Notice matter', true, 'Chamber', 'Almirah-A', 'Shelf-1', 'Bundle-1', 'Active', 'Urgent'),
('Case #17', 'Prathvi Pal vs Banvari', 'Criminal', 'Petitioner', 'ACJM-3', NULL, NULL, CURRENT_DATE + INTERVAL '12 days', 'Evidence / Cross', '', true, 'Chamber', 'Almirah-B', 'Shelf-2', 'Bundle-2', 'Active', 'Normal'),
('Case #18', 'Madhuri Devi vs Geeta Devi', 'Civil', 'Petitioner', 'ADJ-2nd', NULL, NULL, CURRENT_DATE + INTERVAL '14 days', 'Final Arguments', '', true, 'Chamber', 'Almirah-C', 'Shelf-1', 'Bundle-3', 'Active', 'Normal'),
('Case #19', 'Pooja vs Kaushal Singh (144(3) BNSS', 'Criminal', 'Applicant', 'AFC-1st', NULL, '144(3) BNSS', CURRENT_DATE + INTERVAL '5 days', 'Miscellaneous', 'Application under Section 144(3) BNSS', true, 'Chamber', 'Almirah-C', 'Shelf-2', 'Bundle-3', 'Active', 'Urgent'),
('Case #20', 'Release Pramod Kumar', 'Bail', 'Accused', 'ACJM-5', 'SampoornaNagar', NULL, CURRENT_DATE + INTERVAL '7 days', 'Order / Judgment', 'Release Application - Location: SampoornaNagar', false, 'SampoornaNagar', 'Almirah-A', 'Shelf-3', 'Bundle-1', 'Active', 'Urgent'),
('Case #21', 'Smt. Kishori Devi vs Pushpendra Kumar', 'Civil', 'Petitioner', 'Gram Nay. Gola', NULL, NULL, CURRENT_DATE + INTERVAL '16 days', 'Evidence / Cross', '', true, 'Chamber', 'Almirah-D', 'Shelf-3', 'Bundle-5', 'Active', 'Normal'),
('Case #22', 'Ram Gulam vs Sahab Dayal', 'Civil', 'Petitioner', 'Gram Nay. Gola', NULL, NULL, CURRENT_DATE + INTERVAL '18 days', 'Framing of Issues', '', true, 'Chamber', 'Almirah-D', 'Shelf-3', 'Bundle-5', 'Active', 'Normal'),
('Case #23', 'Daya Shankar Mishra vs Kulwant Singh', 'Civil', 'Petitioner', 'Gram Nay. Gola', NULL, NULL, CURRENT_DATE + INTERVAL '20 days', 'Final Arguments', '', true, 'Chamber', 'Almirah-D', 'Shelf-3', 'Bundle-5', 'Active', 'Normal');
