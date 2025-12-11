Welcome to the IT-342-Project wiki!

auth-checks.js
-A javascript file that has a function checkAuth() which uses 

forgot-password.html
-

home.html
-

index.html
-

search-results.html
-

tire-finder.html
-

tutorials.html
-

verify.html
-

Authentication and Security Files

.index.html
- The login point
- Entry point to the application
- It asks for a username and password and uses the amazon cognito identity js library to authenticate from an AWS user pool
- It has remember me functionality using local and session storage and handles multi-factor authentication
- If successful it redircts to home.html

.signup.html
- Registration page 
- Allows new users to create an account
- Asks to create a username and password, collects email and phone number
- Before sending to the backend, it validates password strength

.verify.html
- Verifies that the user has access to the email that they signed up with
- Sends a 6 digit verification code to their email, Uses AWS cognito to confirm the users status
- Has a resend code feature with a 60 second cooldown

.forgot-password.html
- Account Recovery
- A multi-step



The login page can be used to login when you create a user and password.

