import { execSync } from 'child_process';

const query = `
  SELECT 
    e.name,
    e.date,
    e.docket_url,
    substr(a.summary, 1, 200) as summary_preview,
    length(a.agenda_text) as pdf_text_length,
    a.last_summarized_at,
    a.content_hash
  FROM events e 
  JOIN agenda_summaries a ON e.id = a.event_id 
  WHERE e.name LIKE '%BPDA%' AND e.date = '2026-05-14'
  LIMIT 1;
`;

try {
  const result = execSync(
    `wrangler d1 execute civitracker-db --remote --command "${query.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8', stdio: 'pipe' }
  );
  console.log(result);
} catch (error: any) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('Output:', error.stdout.toString());
  if (error.stderr) console.error('Stderr:', error.stderr.toString());
}
