-- Supabase SQL: Insert 23 Court Cases Provided by Senior
-- Run this in Supabase -> SQL Editor to populate your cloud database!

INSERT INTO court_cases (case_number, parties, court_name, next_hearing_date, hearing_stage, senior_instructions, status, priority)
VALUES
('Case #01', 'Pawan Gupta v. Vishvanath Pitariya', 'ACJM-5', CURRENT_DATE, 'Final Arguments', '', 'Active', 'Urgent'),
('Case #02', 'Pawan Gupta v. Raman Gupta', 'CJSD', CURRENT_DATE + INTERVAL '1 day', 'Evidence / Cross', '', 'Active', 'Normal'),
('Case #03', 'Pawan Gupta v. Ashok Singh', 'ACJM-4', CURRENT_DATE + INTERVAL '2 days', 'Framing of Issues', '', 'Active', 'Normal'),
('Case #04', 'Pawan Gupta v. Ashok Singh', 'ACJM-1', CURRENT_DATE + INTERVAL '3 days', 'Admission / Notice', '', 'Active', 'Normal'),
('Case #05', 'Pawan Gupta v. Ashok Singh', 'DJ', CURRENT_DATE + INTERVAL '4 days', 'Final Arguments', '', 'Active', 'Urgent'),
('Case #06', 'Jafar Ali v. State of U.P.', 'CO-IInd', CURRENT_DATE, 'Miscellaneous', '2 files', 'Active', 'Urgent'),
('Case #07', 'Smt. Chhavi Rastogi v. Aman', 'FTC-41', CURRENT_DATE + INTERVAL '1 day', 'Evidence / Cross', '', 'Active', 'Normal'),
('Case #08', 'Pawan Singh v. Kailash Singh', 'ACJJD-5', CURRENT_DATE + INTERVAL '2 days', 'Framing of Issues', '', 'Active', 'Normal'),
('Case #09', 'Vimal v. Komal Singh', 'AFC-1st', CURRENT_DATE + INTERVAL '3 days', 'Miscellaneous', 'Skeleton', 'Active', 'Normal'),
('Case #10', 'Mumtaz v. Unknown', 'ACJM-3', CURRENT_DATE + INTERVAL '1 day', 'Admission / Notice', 'FR', 'Active', 'Urgent'),
('Case #11', 'Alok Verma v. Raunak Juneja', 'AJM-3', CURRENT_DATE + INTERVAL '5 days', 'Evidence / Cross', '', 'Active', 'Normal'),
('Case #12', 'State v. Dharampal', 'ADJ/FTC', CURRENT_DATE + INTERVAL '6 days', 'Final Arguments', '', 'Active', 'Urgent'),
('Case #13', 'State v. Dharampal', 'ACJM-5', CURRENT_DATE + INTERVAL '8 days', 'Evidence / Cross', '', 'Active', 'Normal'),
('Case #14', 'Shree Devi v. Janardan', 'ACJM/FTC', CURRENT_DATE + INTERVAL '9 days', 'Framing of Issues', '', 'Active', 'Normal'),
('Case #15', 'Shree Devi v. Janardan', 'FC', CURRENT_DATE + INTERVAL '10 days', 'Miscellaneous', '', 'Active', 'Normal'),
('Case #16', 'Gyanendara Mishra', 'District Court', CURRENT_DATE + INTERVAL '4 days', 'Admission / Notice', 'Notice', 'Active', 'Urgent'),
('Case #17', 'Prathvi Pal v. Banvari', 'ACJM-3', CURRENT_DATE + INTERVAL '12 days', 'Evidence / Cross', '', 'Active', 'Normal'),
('Case #18', 'Madhuri Devi v. Geeta Devi', 'ADJ-2nd', CURRENT_DATE + INTERVAL '14 days', 'Final Arguments', '', 'Active', 'Normal'),
('Case #19', 'Pooja v. Kaushal Singh', 'AFC-1st', CURRENT_DATE + INTERVAL '5 days', 'Miscellaneous', '144(3) BNSS', 'Active', 'Urgent'),
('Case #20', 'Release – Pramod Kumar', 'ACJM-5', CURRENT_DATE + INTERVAL '7 days', 'Order / Judgment', 'Sampoorna Nagar', 'Active', 'Urgent'),
('Case #21', 'Smt. Kishori Devi v. Pushpendra Kumar', 'Gram Nay. Gola', CURRENT_DATE + INTERVAL '16 days', 'Evidence / Cross', '', 'Active', 'Normal'),
('Case #22', 'Ram Gulam v. Sahab Dayal', 'Gram Nay. Gola', CURRENT_DATE + INTERVAL '18 days', 'Framing of Issues', '', 'Active', 'Normal'),
('Case #23', 'Daya Shankar Mishra v. Kulwant Singh', 'Gram Nay. Gola', CURRENT_DATE + INTERVAL '20 days', 'Final Arguments', '', 'Active', 'Normal');
