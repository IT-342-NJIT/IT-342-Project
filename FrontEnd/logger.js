// logger.js

// 👇 Replace with your API Gateway invoke URL + /log (NO trailing slash after /log)
const LOG_ENDPOINT = 'https://avzid5kib3.execute-api.us-east-1.amazonaws.com/prod/backend-log';

// Define all possible actions centrally (clean, consistent)
export const ACTIONS = {
  PAGE_VIEW: "page_view",

  // Authentication
  LOGIN: "login",
  LOGOUT: "logout",
  SIGNUP: "signup",
  PASSWORD_RESET: "password_reset",

  // UI interactions
  BUTTON_CLICK: "button_click",
  OPEN_MODAL: "open_modal",
  CLOSE_MODAL: "close_modal",

  // Navigation
  NAVIGATE: "navigate",
  OPEN_PAGE: "open_page",

  // Errors
  ERROR: "error",
  INVALID_INPUT: "invalid_input",
};

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
