/**
 * insert_to_db.js
 * Script to insert all 23 Senior Court Cases into Supabase Cloud Database or display SQL.
 * 
 * Usage:
 *   node insert_to_db.js <SUPABASE_URL> <SUPABASE_ANON_KEY>
 * Or with environment variables:
 *   SUPABASE_URL=https://xyz.supabase.co SUPABASE_KEY=eyJ... node insert_to_db.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed_data.json'), 'utf8'));

const supabaseUrl = process.argv[2] || process.env.SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('🏛️ Legal Diary - 23 Senior Court Cases Seed Utility');
  console.log('----------------------------------------------------');
  console.log('Total Cases Ready in seed_data.json: ' + cases.length);
  console.log('\nTo insert directly to Supabase via REST API, run:');
  console.log('  node insert_to_db.js https://<project-ref>.supabase.co <anon_key>');
  console.log('\nAlternatively, you can copy the SQL query in seed_data.sql and execute it in:');
  console.log('  Supabase Dashboard -> SQL Editor -> Run');
  process.exit(0);
}

const cleanedUrl = supabaseUrl.replace(/\/+$/, '');
const endpoint = new URL(`${cleanedUrl}/rest/v1/court_cases`);

const payload = JSON.stringify(cases.map(c => ({
  case_number: c.case_number,
  parties: c.parties,
  case_type: c.case_type || 'Criminal',
  representing: c.representing || 'Petitioner',
  court_name: c.court_name || '',
  police_station_fir: c.police_station_fir || null,
  act_sections: c.act_sections || null,
  next_hearing_date: c.next_hearing_date,
  hearing_stage: c.hearing_stage || 'Arguments',
  senior_instructions: c.senior_instructions || '',
  file_in_chamber: c.file_in_chamber !== false,
  file_current_holder: c.file_current_holder || 'Chamber',
  chamber_almirah: c.chamber_almirah || 'Almirah-A',
  chamber_shelf: c.chamber_shelf || 'Shelf-1',
  chamber_bundle_no: c.chamber_bundle_no || null,
  hearing_history: JSON.stringify(c.hearing_history || []),
  status: c.status || 'Active',
  priority: c.priority || 'Normal',
  updated_at: new Date().toISOString()
})));

const options = {
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  }
};

const reqModule = endpoint.protocol === 'http:' ? http : https;
const req = reqModule.request(endpoint, options, (res) => {
  let responseBody = '';
  res.on('data', chunk => responseBody += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ Successfully inserted all ${cases.length} court cases into Supabase!`);
    } else {
      console.error(`❌ Supabase error (Status ${res.statusCode}):`, responseBody);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Network error during insert:', err.message);
});

req.write(payload);
req.end();
