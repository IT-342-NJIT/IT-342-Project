Welcome to the IT-342-Project wiki!

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
- Account info is stored in cognito and also in DynamoDB

.verify.html
- Verifies that the user has access to the email that they signed up with
- Sends a 6 digit verification code to their email, Uses AWS cognito to confirm the users status
- Has a resend code feature with a 60 second cooldown

.forgot-password.html
- Account Recovery
- A multi-step process that helps the user recover their password 
- Asks for the username to send a reset code, verifies the code and accepts the new password, updates the password in cognito and attempts to sync a hashed password to DynamoDB

.auth-check.js 
- Security script
- Background script that confirms you have logged in
- Protects pages from unathorized users

Main Application
.home.html
- The landing page after a successful login
- Displays a welcome message with the user's name 
- Features a quick search for vehicle information year/make/model that redirects to search results
- This is a protected page and it will not display unless the conditions of auth-check.js are met

.tire-finder.html
- Page specifically for finding tires
- Two methods to search: Drop down of year, make, and model or Dropdown of width, aspect ratio, and rim size
- This is a protected page and it will not display unless the conditions of auth-check.js are met

.search-results.html
- Displays tires that match the users search criteria
- Makes a Grid of tire cards showing price, brand, and specs.
- Has a filtering side bar, can filter by brand, price, and season.
- This is a protected page and it will not display unless the conditions of auth-check.js are met

.tutorials.html
- Educational content 
- Provides explanations to users
- Displays a variety of youtube videos explaining how to read, change, and fix tires.
- This is a protected page and it will not display unless the conditions of auth-check.js are met



