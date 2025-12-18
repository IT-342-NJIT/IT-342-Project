import json
import boto3
from datetime import datetime

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')

def get_cors_headers():
    """Return CORS headers for all responses"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    }

def lambda_handler(event, context):
    """
    Get Vehicles Lambda Function
    
    Retrieves all saved vehicles for a user from DynamoDB.
    
    Request body:
    {
        "username": "john_doe"
    }
    """
    
    cors_headers = get_cors_headers()
    
    # Handle OPTIONS (preflight CORS request)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS OK'})
        }
    
    try:
        print(f'📝 Get vehicles request received at {datetime.utcnow().isoformat()}')
        
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'No request body provided'})
            }
        
        body = json.loads(event['body'])
        username = body.get('username', '').strip()
        
        print(f'👤 Username: {username}')
        
        # Validate input
        if not username:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Username is required'
                })
            }
        
        # Get DynamoDB table
        table = dynamodb.Table('TireShop-Vehicles')
        
        # Get all vehicles for this user
        print(f'🔍 Fetching vehicles for user...')
        response = table.scan(
            FilterExpression='username = :username',
            ExpressionAttributeValues={
                ':username': username
            }
        )
        
        vehicles = response.get('Items', [])
        
        print(f'✅ Found {len(vehicles)} vehicles')
        
        # Sort by creation date (newest first)
        vehicles.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'count': len(vehicles),
                'vehicles': vehicles
            })
        }
        
    except json.JSONDecodeError:
        print(f'❌ Invalid JSON in request body')
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Invalid JSON format'})
        }
        
    except Exception as e:
        print(f'❌ Unexpected error: {str(e)}')
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }