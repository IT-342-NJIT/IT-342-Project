const LOG_API_BASE = 'http://EC2_PUBLIC_IP:3000';

async function logEvent(action, details = {}) {
  try {
    await fetch(`${LOG_API_BASE}/api/log`, {
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
