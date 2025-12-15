// Simple Express server to serve Netlify functions locally
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import and setup functions
const setupFunction = async (name, filePath) => {
  try {
    const func = await import(filePath);
    app.all(`/.netlify/functions/${name}`, async (req, res) => {
      try {
        const event = {
          httpMethod: req.method,
          headers: req.headers,
          queryStringParameters: req.query,
          body: JSON.stringify(req.body),
          path: req.path
        };
        
        const result = await func.handler(event, {});
        res.status(result.statusCode);
        Object.entries(result.headers || {}).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        res.send(result.body);
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        res.status(500).json({ error: error.message });
      }
    });
    console.log(`✓ Loaded function: ${name}`);
  } catch (error) {
    console.error(`✗ Failed to load ${name}:`, error.message);
  }
};

// Setup all functions
const init = async () => {
  await setupFunction('congress-meetings', './netlify/functions/congress-meetings.ts');
  await setupFunction('state-events', './netlify/functions/state-events.ts');
  await setupFunction('local-meetings', './netlify/functions/local-meetings.ts');
  
  const PORT = 8888;
  app.listen(PORT, () => {
    console.log(`\n╭─────────────────────────────────────╮`);
    console.log(`│ Functions server: http://localhost:${PORT} │`);
    console.log(`╰─────────────────────────────────────╯\n`);
  });
};

init();
