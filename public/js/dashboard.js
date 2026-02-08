let currentUser = null;

// Auth check
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    currentUser = data.user;
    document.getElementById('user-greeting').textContent =
      `Hi, ${currentUser.first_name || currentUser.email}`;
  } catch (e) {
    window.location.href = '/';
  }
}

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
});

// Load dogs
async function loadDogs() {
  const container = document.getElementById('dogs-list');
  try {
    const res = await fetch('/api/dogs');
    const dogs = await res.json();

    if (dogs.length === 0) {
      container.innerHTML = '<div class="empty-state">No dogs yet. Click "+ Add Dog" to get started.</div>';
      return;
    }

    container.innerHTML = dogs.map(dog => {
      const meta = [];
      if (dog.breed) meta.push(dog.breed);
      if (dog.weight_lbs) meta.push(`${dog.weight_lbs} lbs`);
      if (dog.date_of_birth) {
        const age = getAge(dog.date_of_birth);
        meta.push(age);
      }

      return `
        <div class="dog-card" onclick="window.location.href='/dog/${dog.id}'">
          ${dog.photo_url ? `<img class="dog-photo" src="${escapeHtml(dog.photo_url)}" alt="${escapeHtml(dog.name)}">` : ''}
          <h3>${escapeHtml(dog.name)}</h3>
          <div class="dog-meta">${meta.map(m => `<span>${escapeHtml(m)}</span>`).join('')}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading dogs.</div>';
  }
}

// Load recent events
async function loadRecentEvents() {
  const container = document.getElementById('recent-events');
  try {
    const res = await fetch('/api/events/recent');
    const events = await res.json();

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state">No events recorded yet.</div>';
      return;
    }

    container.innerHTML = events.map(ev => `
      <div class="event-card ${ev.severity ? 'severity-' + ev.severity : ''}">
        <div class="event-header">
          <span class="event-type">${formatEventType(ev.event_type)} - ${escapeHtml(ev.dog_name)}</span>
          <span class="event-date">${formatDate(ev.event_date)}</span>
        </div>
        ${ev.description ? `<div class="event-details">${escapeHtml(ev.description)}</div>` : ''}
        <div class="event-meta">
          ${ev.severity ? `<span class="badge badge-${ev.severity}">${ev.severity}</span>` : ''}
          ${ev.duration_seconds ? `<span>Duration: ${formatDuration(ev.duration_seconds)}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading events.</div>';
  }
}

// Dog modal
const dogModal = document.getElementById('dog-modal');

document.getElementById('add-dog-btn').addEventListener('click', () => {
  document.getElementById('dog-modal-title').textContent = 'Add Dog';
  document.getElementById('dog-form').reset();
  document.getElementById('dog-id').value = '';
  document.getElementById('dog-form-error').hidden = true;
  dogModal.hidden = false;
});

dogModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => { dogModal.hidden = true; });
});
dogModal.addEventListener('click', (e) => {
  if (e.target === dogModal) dogModal.hidden = true;
});

document.getElementById('dog-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('dog-form-error');
  errorEl.hidden = true;

  const id = document.getElementById('dog-id').value;
  const body = {
    name: document.getElementById('dog-name').value.trim(),
    breed: document.getElementById('dog-breed').value.trim(),
    weight_lbs: document.getElementById('dog-weight').value || null,
    date_of_birth: document.getElementById('dog-dob').value || null,
    diagnosis_date: document.getElementById('dog-diagnosis').value || null,
    photo_url: document.getElementById('dog-photo').value.trim() || null,
    notes: document.getElementById('dog-notes').value.trim() || null,
  };

  try {
    const url = id ? `/api/dogs/${id}` : '/api/dogs';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to save dog';
      errorEl.hidden = false;
      return;
    }
    dogModal.hidden = true;
    loadDogs();
  } catch (err) {
    errorEl.textContent = 'Network error';
    errorEl.hidden = false;
  }
});

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatEventType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return years === 1 ? '1 year old' : `${years} years old`;
}

// Init
(async () => {
  await checkAuth();
  loadDogs();
  loadRecentEvents();
})();
