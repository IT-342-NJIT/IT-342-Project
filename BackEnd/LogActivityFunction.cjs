const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'UserActivityLogs';

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    console.error('Invalid JSON body:', event.body);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { userId, page, action, details } = body;

  if (!page || !action) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'page and action are required' })
    };
  }

  const logItem = {
    userId: userId || 'guest',
    timestamp: new Date().toISOString(),
    page,
    action,
    details: details || {}
  };

  console.log('UserActivityLog', JSON.stringify(logItem));

  const params = {
    TableName: TABLE_NAME,
    Item: logItem
  };

  try {
    await ddb.send(new PutCommand(params));
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Error writing to DynamoDB:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to write log' })
    };
  }
};