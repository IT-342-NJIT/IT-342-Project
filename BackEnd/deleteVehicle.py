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
    Delete Vehicle Lambda Function
    
    Deletes a saved vehicle from DynamoDB.
    
    Request body:
    {
        "vehicleId": "vehicle_abc123..."
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
        print(f'📝 Delete vehicle request received at {datetime.utcnow().isoformat()}')
        
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'No request body provided'})
            }
        
        body = json.loads(event['body'])
        vehicle_id = body.get('vehicleId', '').strip()
        
        print(f'🗑️ VehicleId: {vehicle_id}')
        
        # Validate input
        if not vehicle_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'vehicleId is required'
                })
            }
        
        # Get DynamoDB table
        table = dynamodb.Table('TireShop-Vehicles')
        
        # Delete the vehicle
        print(f'🗑️ Deleting vehicle from DynamoDB...')
        table.delete_item(
            Key={'vehicleId': vehicle_id}
        )
        
        print(f'✅ Vehicle deleted successfully!')
        print(f'   vehicleId: {vehicle_id}')
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': 'Vehicle deleted successfully',
                'vehicleId': vehicle_id
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