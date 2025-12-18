// logger.js

// 👇 Replace with your API Gateway invoke URL + /log (NO trailing slash after /log)
const LOG_ENDPOINT = 'https://avzid5kib3.execute-api.us-east-1.amazonaws.com/prod/backend-log';

async function logEvent(action, details = {}) {
  try {
    const token =
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken');
      let userId = 'guest';
      if (token) {
        try {
          // Decode JWT to get actual user ID
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload['cognito:username'] || 'authenticatedUser';
        } catch (e) {
        userId = 'authenticatedUser';
      }
    }


    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        page: window.location.pathname.split('/').pop() || 'unknown',
        action,
        details
      })
    });
  } catch (err) {
    console.error('Failed to send log', err);
  }
}

// Automatically log page views
document.addEventListener('DOMContentLoaded', () => {
  logEvent('page_view');
});