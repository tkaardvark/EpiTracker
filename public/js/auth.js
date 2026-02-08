// Check if already logged in
(async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      window.location.href = '/dashboard';
    }
  } catch (e) {
    // Not logged in, stay on page
  }
})();

const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');

document.getElementById('show-signup').addEventListener('click', (e) => {
  e.preventDefault();
  loginSection.hidden = true;
  signupSection.hidden = false;
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  signupSection.hidden = true;
  loginSection.hidden = false;
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.hidden = false;
      return;
    }
    window.location.href = '/dashboard';
  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.hidden = false;
  }
});

// Signup
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('signup-error');
  errorEl.hidden = true;

  const first_name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Signup failed';
      errorEl.hidden = false;
      return;
    }
    window.location.href = '/dashboard';
  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.hidden = false;
  }
});
