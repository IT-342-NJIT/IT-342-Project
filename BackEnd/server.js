const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();
const PORT = 3000;

// region ('us-east-1')
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'UserActivityLogs';

app.use(cors());
app.use(express.json());

// POST /api/log  -> store a log entry in DynamoDB
app.post('/api/log', async (req, res) => {
  const { userId, page, action, details } = req.body || {};

  if (!page || !action) {
    return res.status(400).json({ error: 'page and action are required' });
  }

  const effectiveUserId = userId || 'guest';

  const item = {
    userId: effectiveUserId,                 // partition key
    timestamp: new Date().toISOString(),    // sort key
    page,
    action,
    details: details || {}
  };

  const params = {
    TableName: TABLE_NAME,
    Item: item
  };

  try {
    await dynamodb.put(params).promise();
    res.json({ success: true });
  } catch (err) {
    console.error('Error writing log to DynamoDB:', err);
    res.status(500).json({ error: 'Failed to write log' });
  }
});

// GET /api/logs -> return all logs (for the viewer page)
app.get('/api/logs', async (req, res) => {
  const params = { TableName: TABLE_NAME };

  try {
    const data = await dynamodb.scan(params).promise();
    res.json(data.Items || []);
  } catch (err) {
    console.error('Error reading logs from DynamoDB:', err);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Optional health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'logging-backend' });
});

app.listen(PORT, () => {
  console.log(`Logging server (DynamoDB) running on port ${PORT}`);
});
