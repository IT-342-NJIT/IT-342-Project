// logger.js

// EC2 public IPv4
const API_BASE = 'http://3.225.45.205:3000';

async function logEvent(action, details = {}) {
  try {
    const token =
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken') ||
      null;

    // Later you can decode the token for a real userId.
    const userId = token ? 'authenticatedUser' : 'guest';

    await fetch(`${API_BASE}/api/log`, {
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
