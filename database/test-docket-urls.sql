-- Test data: Add sample events with docket URLs to test agenda extraction

-- Pennsylvania event with docket URL (example)
UPDATE events 
SET docket_url = 'https://www.legis.state.pa.us/WU01/LI/TR/Transcripts/2024_0001T.pdf'
WHERE state_code = 'PA' 
AND name LIKE '%Appropriations%'
LIMIT 1;

-- California event with docket URL (example)  
UPDATE events
SET docket_url = 'https://www.assembly.ca.gov/sites/assembly.ca.gov/files/agendas/AGENDA_2024-01-15.pdf'
WHERE state_code = 'CA'
AND committee_name LIKE '%Transportation%'
LIMIT 1;

-- Alabama event with docket URL (example)
UPDATE events
SET docket_url = 'http://alisondb.legislature.state.al.us/ALISON/SearchableInstruments/2024RS/PrintFiles/SB1-int.pdf'
WHERE state_code = 'AL'
LIMIT 1;
