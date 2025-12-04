// auth-check.js
(function checkAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        alert('Please log in to access this page');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const tokenParts = token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            alert('Session expired. Please log in again.');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html';
            return;
        }
        document.body.classList.add('authorized');
    } catch (error) {
        window.location.href = 'index.html';
    }
})();