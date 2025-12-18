import json
import boto3

cognito = boto3.client('cognito-idp')

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        body = json.loads(event.get('body', '{}'))
        session = body.get('session')
        code = body.get('code')
        
        if not session or not code:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Session and code required'})
            }
        
        response = cognito.verify_software_token(
            Session=session,
            UserCode=code,
            FriendlyDeviceName='My Device'
        )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'status': response['Status'],
                'session': response.get('Session')
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }