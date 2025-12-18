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
        
        if not session:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Session required'})
            }
        
        response = cognito.associate_software_token(Session=session)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'secretCode': response['SecretCode'],
                'session': response['Session']
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }