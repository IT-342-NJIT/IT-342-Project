import json
import boto3
import secrets
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
    Save Vehicle Lambda Function
    
    Saves a user's vehicle to DynamoDB for quick access later.
    
    Request body:
    {
        "username": "john_doe",
        "year": "2020",
        "make": "Toyota",
        "model": "Camry"
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
        print(f'📝 Save vehicle request received at {datetime.utcnow().isoformat()}')
        
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'No request body provided'})
            }
        
        body = json.loads(event['body'])
        username = body.get('username', '').strip()
        year = body.get('year', '').strip()
        make = body.get('make', '').strip()
        model = body.get('model', '').strip()
        
        print(f'👤 Username: {username}')
        print(f'🚗 Vehicle: {year} {make} {model}')
        
        # Validate input
        if not all([username, year, make, model]):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Missing required fields',
                    'required': ['username', 'year', 'make', 'model']
                })
            }
        
        # Get DynamoDB table
        table = dynamodb.Table('TireShop-Vehicles')
        
        # Check if this exact vehicle already exists for this user
        print(f'🔍 Checking for duplicate vehicle...')
        response = table.scan(
            FilterExpression='username = :username AND #yr = :year AND make = :make AND #mdl = :model',
            ExpressionAttributeNames={
                '#yr': 'year',  # 'year' is a reserved word
                '#mdl': 'model'  # 'model' might be reserved
            },
            ExpressionAttributeValues={
                ':username': username,
                ':year': year,
                ':make': make,
                ':model': model
            }
        )
        
        if response.get('Items'):
            print(f'⚠️ Vehicle already saved')
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'This vehicle is already saved',
                    'vehicleId': response['Items'][0]['vehicleId'],
                    'alreadyExists': True
                })
            }
        
        # Generate unique vehicle ID
        vehicle_id = f"vehicle_{secrets.token_hex(16)}"
        print(f'🆔 Generated vehicleId: {vehicle_id}')
        
        # Create vehicle item
        vehicle_item = {
            'vehicleId': vehicle_id,
            'username': username,
            'year': year,
            'make': make,
            'model': model,
            'createdAt': datetime.utcnow().isoformat()
        }
        
        # Store in DynamoDB
        table.put_item(Item=vehicle_item)
        
        print(f'✅ Vehicle saved successfully!')
        print(f'   vehicleId: {vehicle_id}')
        print(f'   username: {username}')
        print(f'   vehicle: {year} {make} {model}')
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': 'Vehicle saved successfully',
                'vehicleId': vehicle_id,
                'vehicle': {
                    'year': year,
                    'make': make,
                    'model': model
                },
                'createdAt': vehicle_item['createdAt']
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