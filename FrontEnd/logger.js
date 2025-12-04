const API_BASE = 'http://3.225.45.205:3000';

async function logEvent(action, details = {}) {
  try {
    await fetch(`${API_BASE}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: localStorage.getItem('userId') || 'guest',
        page: window.location.pathname.split('/').pop() || 'unknown',
        action,
        details
      })
    });
  } catch (err) {
    console.error('Failed to log event', err);
  }
}

// Automatically log page visits
document.addEventListener('DOMContentLoaded', () => {
  logEvent('page_view');
});
