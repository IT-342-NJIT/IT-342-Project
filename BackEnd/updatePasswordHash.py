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
    Update Password Hash Lambda Function
    
    This function updates the password hash in DynamoDB when a user
    resets their password via the forgot-password flow.
    
    Request body:
    {
        "username": "john_doe",
        "passwordHash": "sha256$salt$hash"
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
        print(f'📝 Update password hash request received at {datetime.utcnow().isoformat()}')
        
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'No request body provided'})
            }
        
        body = json.loads(event['body'])
        username = body.get('username', '').strip()
        password_hash = body.get('passwordHash', '').strip()
        
        print(f'👤 Username: {username}')
        print(f'🔐 New hash: {password_hash[:50]}...')
        
        # Validate input
        if not username or not password_hash:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Username and passwordHash are required'})
            }
        
        # Validate hash format
        if not password_hash.startswith('sha256$'):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Invalid password hash format'})
            }
        
        # Get DynamoDB table
        table = dynamodb.Table('TireShop-Users')
        
        # Find user by username
        print(f'🔍 Searching for user in DynamoDB...')
        response = table.scan(
            FilterExpression='username = :username',
            ExpressionAttributeValues={':username': username}
        )
        
        if not response.get('Items'):
            print(f'❌ User not found in DynamoDB: {username}')
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'User not found in database',
                    'username': username
                })
            }
        
        user_item = response['Items'][0]
        user_id = user_item['userId']
        old_hash = user_item.get('passwordHash', 'N/A')
        
        print(f'✅ Found user: {user_id}')
        print(f'📝 Old hash: {old_hash[:50]}...')
        print(f'📝 New hash: {password_hash[:50]}...')
        
        # Update password hash in DynamoDB
        table.update_item(
            Key={'userId': user_id},
            UpdateExpression='SET passwordHash = :hash, passwordUpdatedAt = :timestamp',
            ExpressionAttributeValues={
                ':hash': password_hash,
                ':timestamp': datetime.utcnow().isoformat()
            }
        )
        
        print(f'✅ Password hash updated successfully!')
        print(f'   User ID: {user_id}')
        print(f'   Username: {username}')
        print(f'   Timestamp: {datetime.utcnow().isoformat()}')
        
        # Verify the update
        verify_response = table.get_item(Key={'userId': user_id})
        if 'Item' in verify_response:
            updated_hash = verify_response['Item'].get('passwordHash', '')
            if updated_hash == password_hash:
                print(f'✅ Verification successful: Hash matches in database')
            else:
                print(f'⚠️ Warning: Hash mismatch after update')
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': 'Password hash updated successfully',
                'userId': user_id,
                'username': username,
                'passwordHash': password_hash,
                'updatedAt': datetime.utcnow().isoformat()
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