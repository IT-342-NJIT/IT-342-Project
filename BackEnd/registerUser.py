import json
import boto3
import hashlib
import secrets
from datetime import datetime

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

# Configuration
USER_POOL_ID = 'us-east-1_W1ucwt5Xq'
CLIENT_ID = '67dk5ue7voo0svcpoobr1clavj'
TABLE_NAME = 'TireShop-Users'

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
    User Registration Lambda Function
    
    This function registers a new user by:
    1. Validating input data
    2. Hashing password with salt (SHA-256)
    3. Registering user in Cognito FIRST
    4. Only if Cognito succeeds, storing user in DynamoDB
    """
    
    cors_headers = get_cors_headers()
    
    # Handle OPTIONS request (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS OK'})
        }
    
    try:
        print(f'📝 Registration request received at {datetime.utcnow().isoformat()}')
        
        # Parse request body
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'No request body provided'})
            }
        
        body = json.loads(event['body'])
        
        # Extract and validate user data
        username = body.get('username', '').strip()
        email = body.get('email', '').strip()
        password = body.get('password', '')
        phone = body.get('phone', '').strip()  # Optional now
        
        print(f'👤 Username: {username}')
        print(f'📧 Email: {email}')
        if phone:
            print(f'📱 Phone: {phone}')
        
        # Validate required fields
        if not all([username, email, password]):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Missing required fields',
                    'required': ['username', 'email', 'password']
                })
            }
        
        # Generate unique user ID
        user_id = f"user_{secrets.token_hex(16)}"
        print(f'🆔 Generated userId: {user_id}')
        
        # Hash password with salt
        print(f'🔐 Hashing password...')
        salt = secrets.token_hex(16)  # 16 bytes = 32 hex characters
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        stored_password_hash = f"sha256${salt}${password_hash}"
        print(f'✅ Password hashed: {stored_password_hash[:50]}...')
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 1: REGISTER IN COGNITO FIRST
        # ═══════════════════════════════════════════════════════════════
        
        print(f'🔐 Registering user in Cognito...')
        
        try:
            # Build user attributes - ONLY required ones
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'preferred_username', 'Value': username}  # Required by new pool
            ]
            
            # Add phone if provided (optional)
            if phone:
                # Format phone to E.164 if needed
                if not phone.startswith('+'):
                    phone = '+1' + phone.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')
                user_attributes.append({'Name': 'phone_number', 'Value': phone})
                print(f'📱 Adding phone: {phone}')
            
            cognito_response = cognito.sign_up(
                ClientId=CLIENT_ID,
                Username=username,
                Password=password,
                UserAttributes=user_attributes
            )
            
            # Get Cognito user ID (sub)
            cognito_user_sub = cognito_response['UserSub']
            print(f'✅ Cognito registration successful!')
            print(f'   Cognito UserSub: {cognito_user_sub}')
            print(f'   User confirmed: {cognito_response.get("UserConfirmed", False)}')
            
        except cognito.exceptions.UsernameExistsException:
            print(f'❌ Username already exists in Cognito: {username}')
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Username already exists',
                    'field': 'username'
                })
            }
            
        except cognito.exceptions.InvalidPasswordException as e:
            print(f'❌ Invalid password: {str(e)}')
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Password does not meet requirements',
                    'details': str(e),
                    'field': 'password'
                })
            }
            
        except cognito.exceptions.InvalidParameterException as e:
            print(f'❌ Invalid parameter: {str(e)}')
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Invalid input data',
                    'details': str(e)
                })
            }
            
        except Exception as e:
            print(f'❌ Cognito registration error: {str(e)}')
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Failed to register user in Cognito',
                    'details': str(e)
                })
            }
        
        # ═══════════════════════════════════════════════════════════════
        # STEP 2: STORE IN DYNAMODB (Only if Cognito succeeded)
        # ═══════════════════════════════════════════════════════════════
        
        print(f'💾 Storing user in DynamoDB...')
        
        try:
            table = dynamodb.Table(TABLE_NAME)
            
            # Create user item
            user_item = {
                'userId': user_id,
                'username': username,
                'email': email,
                'passwordHash': stored_password_hash,
                'cognitoId': cognito_user_sub,
                'createdAt': datetime.utcnow().isoformat()
            }
            
            # Add phone if provided
            if phone:
                user_item['phone'] = phone
            
            # Store in DynamoDB
            table.put_item(Item=user_item)
            
            print(f'✅ User stored in DynamoDB successfully!')
            print(f'   userId: {user_id}')
            print(f'   username: {username}')
            print(f'   cognitoId: {cognito_user_sub}')
            
        except Exception as e:
            print(f'❌ DynamoDB storage error: {str(e)}')
            print(f'⚠️ WARNING: User exists in Cognito but not in DynamoDB')
            print(f'   Username: {username}')
            print(f'   Cognito ID: {cognito_user_sub}')
            
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'User registered in Cognito but database storage failed',
                    'username': username,
                    'details': str(e)
                })
            }
        
        # ═══════════════════════════════════════════════════════════════
        # SUCCESS - Return response
        # ═══════════════════════════════════════════════════════════════
        
        print(f'🎉 Registration completed successfully!')
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': 'User registered successfully',
                'userId': user_id,
                'username': username,
                'email': email,
                'cognitoId': cognito_user_sub,
                'passwordHash': stored_password_hash,
                'userConfirmed': cognito_response.get('UserConfirmed', False),
                'note': 'Please check your email for verification code'
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