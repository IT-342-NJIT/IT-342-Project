const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const LOG_FILE = path.join(__dirname, 'logs.json');

if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '[]', 'utf8');
}

function readLogs() {
  return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
}

function writeLogs(logs) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

app.post('/api/log', (req, res) => {
  const { userId, page, action, details } = req.body;

  if (!page || !action) {
    return res.status(400).json({ error: 'page and action required' });
  }

  const logs = readLogs();
  logs.push({
    timestamp: new Date().toISOString(),
    userId: userId || 'guest',
    page,
    action,
    details: details || {}
  });

  writeLogs(logs);
  res.json({ success: true });
});

app.get('/api/logs', (req, res) => {
  res.json(readLogs());
});

app.listen(PORT, () => {
  console.log(`✅ Logging server running at http://localhost:${PORT}`);
});
