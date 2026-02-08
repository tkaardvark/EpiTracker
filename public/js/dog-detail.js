const dogId = window.location.pathname.split('/').pop();
let dogData = null;

// Auth check
async function checkAuth() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
});

// Load dog info
async function loadDog() {
  const container = document.getElementById('dog-info');
  try {
    const res = await fetch(`/api/dogs/${dogId}`);
    if (!res.ok) {
      container.innerHTML = '<div class="empty-state">Dog not found.</div>';
      return;
    }
    dogData = await res.json();

    const meta = [];
    if (dogData.breed) meta.push(dogData.breed);
    if (dogData.weight_lbs) meta.push(`${dogData.weight_lbs} lbs`);
    if (dogData.date_of_birth) meta.push(`Born: ${formatDateShort(dogData.date_of_birth)}`);
    if (dogData.diagnosis_date) meta.push(`Diagnosed: ${formatDateShort(dogData.diagnosis_date)}`);

    container.innerHTML = `
      ${dogData.photo_url ? `<img class="dog-photo-lg" src="${escapeHtml(dogData.photo_url)}" alt="${escapeHtml(dogData.name)}">` : ''}
      <div class="dog-header-info">
        <h1>${escapeHtml(dogData.name)}</h1>
        <div class="dog-meta">${meta.map(m => `<span>${escapeHtml(m)}</span>`).join('')}</div>
        ${dogData.notes ? `<div class="dog-notes">${escapeHtml(dogData.notes)}</div>` : ''}
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading dog info.</div>';
  }
}

// Load events
async function loadEvents(filters = {}) {
  const container = document.getElementById('events-timeline');
  try {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);

    const url = `/api/events/dog/${dogId}${params.toString() ? '?' + params : ''}`;
    const res = await fetch(url);
    const events = await res.json();

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state">No events recorded yet. Click "+ Log Event" to add one.</div>';
      return;
    }

    container.innerHTML = events.map(ev => `
      <div class="event-card ${ev.severity ? 'severity-' + ev.severity : ''}">
        <div class="event-header">
          <span class="event-type">${formatEventType(ev.event_type)}</span>
          <span class="event-date">${formatDate(ev.event_date)}</span>
        </div>
        ${ev.description ? `<div class="event-details">${escapeHtml(ev.description)}</div>` : ''}
        <div class="event-meta">
          ${ev.severity ? `<span class="badge badge-${ev.severity}">${ev.severity}</span>` : ''}
          ${ev.duration_seconds ? `<span>Duration: ${formatDuration(ev.duration_seconds)}</span>` : ''}
        </div>
        ${ev.notes ? `<div class="event-details" style="margin-top:0.25rem;font-style:italic">${escapeHtml(ev.notes)}</div>` : ''}
        <div class="event-actions">
          <button class="btn btn-small btn-secondary" onclick="editEvent(${ev.id})">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteEvent(${ev.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading events.</div>';
  }
}

// Load medications
async function loadMedications() {
  const container = document.getElementById('medications-list');
  try {
    const res = await fetch(`/api/medications/dog/${dogId}`);
    const meds = await res.json();

    if (meds.length === 0) {
      container.innerHTML = '<div class="empty-state">No medications recorded. Click "+ Add Medication" to add one.</div>';
      return;
    }

    container.innerHTML = meds.map(med => {
      const isActive = !med.end_date;
      return `
        <div class="med-card ${isActive ? '' : 'inactive'}">
          <div class="med-info">
            <h3>${escapeHtml(med.medication_name)} ${isActive ? '' : '(ended)'}</h3>
            <div class="med-meta">
              ${med.dosage ? `<span>${escapeHtml(med.dosage)}</span>` : ''}
              ${med.frequency ? `<span> &middot; ${escapeHtml(med.frequency)}</span>` : ''}
              <span> &middot; Started: ${formatDateShort(med.start_date)}</span>
              ${med.end_date ? `<span> &middot; Ended: ${formatDateShort(med.end_date)}</span>` : ''}
            </div>
            ${med.notes ? `<div style="font-size:0.85rem;margin-top:0.25rem">${escapeHtml(med.notes)}</div>` : ''}
          </div>
          <div class="med-actions">
            <button class="btn btn-small btn-secondary" onclick='editMed(${JSON.stringify(med).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-small btn-danger" onclick="deleteMed(${med.id})">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading medications.</div>';
  }
}

// === Event Modal ===
const eventModal = document.getElementById('event-modal');

document.getElementById('add-event-btn').addEventListener('click', () => {
  document.getElementById('event-modal-title').textContent = 'Log Event';
  document.getElementById('event-form').reset();
  document.getElementById('event-id').value = '';
  document.getElementById('event-form-error').hidden = true;
  // Default to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('event-date').value = now.toISOString().slice(0, 16);
  eventModal.hidden = false;
});

eventModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => { eventModal.hidden = true; });
});
eventModal.addEventListener('click', (e) => {
  if (e.target === eventModal) eventModal.hidden = true;
});

document.getElementById('event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('event-form-error');
  errorEl.hidden = true;

  const id = document.getElementById('event-id').value;
  const body = {
    dog_id: parseInt(dogId),
    event_type: document.getElementById('event-type').value,
    event_date: document.getElementById('event-date').value,
    duration_seconds: document.getElementById('event-duration').value ? parseInt(document.getElementById('event-duration').value) : null,
    severity: document.getElementById('event-severity').value || null,
    description: document.getElementById('event-description').value.trim() || null,
    notes: document.getElementById('event-notes').value.trim() || null,
  };

  try {
    const url = id ? `/api/events/${id}` : '/api/events';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to save event';
      errorEl.hidden = false;
      return;
    }
    eventModal.hidden = true;
    loadEvents(getFilters());
  } catch (err) {
    errorEl.textContent = 'Network error';
    errorEl.hidden = false;
  }
});

async function editEvent(eventId) {
  try {
    // Fetch all events and find the one we need
    const res = await fetch(`/api/events/dog/${dogId}`);
    const events = await res.json();
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    document.getElementById('event-modal-title').textContent = 'Edit Event';
    document.getElementById('event-id').value = ev.id;
    document.getElementById('event-type').value = ev.event_type;
    document.getElementById('event-severity').value = ev.severity || '';
    const d = new Date(ev.event_date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('event-date').value = d.toISOString().slice(0, 16);
    document.getElementById('event-duration').value = ev.duration_seconds || '';
    document.getElementById('event-description').value = ev.description || '';
    document.getElementById('event-notes').value = ev.notes || '';
    document.getElementById('event-form-error').hidden = true;
    eventModal.hidden = false;
  } catch (err) {
    alert('Error loading event');
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
    loadEvents(getFilters());
  } catch (err) {
    alert('Error deleting event');
  }
}

// === Medication Modal ===
const medModal = document.getElementById('med-modal');

document.getElementById('add-med-btn').addEventListener('click', () => {
  document.getElementById('med-modal-title').textContent = 'Add Medication';
  document.getElementById('med-form').reset();
  document.getElementById('med-id').value = '';
  document.getElementById('med-form-error').hidden = true;
  medModal.hidden = false;
});

medModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => { medModal.hidden = true; });
});
medModal.addEventListener('click', (e) => {
  if (e.target === medModal) medModal.hidden = true;
});

document.getElementById('med-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('med-form-error');
  errorEl.hidden = true;

  const id = document.getElementById('med-id').value;
  const body = {
    dog_id: parseInt(dogId),
    medication_name: document.getElementById('med-name').value.trim(),
    dosage: document.getElementById('med-dosage').value.trim() || null,
    frequency: document.getElementById('med-frequency').value.trim() || null,
    start_date: document.getElementById('med-start').value,
    end_date: document.getElementById('med-end').value || null,
    notes: document.getElementById('med-notes').value.trim() || null,
  };

  try {
    const url = id ? `/api/medications/${id}` : '/api/medications';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to save medication';
      errorEl.hidden = false;
      return;
    }
    medModal.hidden = true;
    loadMedications();
  } catch (err) {
    errorEl.textContent = 'Network error';
    errorEl.hidden = false;
  }
});

function editMed(med) {
  try {
    document.getElementById('med-modal-title').textContent = 'Edit Medication';
    document.getElementById('med-id').value = med.id;
    document.getElementById('med-name').value = med.medication_name || '';
    document.getElementById('med-dosage').value = med.dosage || '';
    document.getElementById('med-frequency').value = med.frequency || '';
    document.getElementById('med-start').value = med.start_date ? med.start_date.slice(0, 10) : '';
    document.getElementById('med-end').value = med.end_date ? med.end_date.slice(0, 10) : '';
    document.getElementById('med-notes').value = med.notes || '';
    document.getElementById('med-form-error').hidden = true;
    medModal.hidden = false;
  } catch (err) {
    alert('Error loading medication data');
  }
}

async function deleteMed(medId) {
  if (!confirm('Are you sure you want to delete this medication?')) return;
  try {
    await fetch(`/api/medications/${medId}`, { method: 'DELETE' });
    loadMedications();
  } catch (err) {
    alert('Error deleting medication');
  }
}

// === Edit Dog Modal ===
const editDogModal = document.getElementById('edit-dog-modal');

document.getElementById('edit-dog-btn').addEventListener('click', () => {
  if (!dogData) return;
  document.getElementById('edit-dog-name').value = dogData.name || '';
  document.getElementById('edit-dog-breed').value = dogData.breed || '';
  document.getElementById('edit-dog-weight').value = dogData.weight_lbs || '';
  document.getElementById('edit-dog-dob').value = dogData.date_of_birth ? dogData.date_of_birth.slice(0, 10) : '';
  document.getElementById('edit-dog-diagnosis').value = dogData.diagnosis_date ? dogData.diagnosis_date.slice(0, 10) : '';
  document.getElementById('edit-dog-photo').value = dogData.photo_url || '';
  document.getElementById('edit-dog-notes').value = dogData.notes || '';
  document.getElementById('edit-dog-error').hidden = true;
  editDogModal.hidden = false;
});

editDogModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => { editDogModal.hidden = true; });
});
editDogModal.addEventListener('click', (e) => {
  if (e.target === editDogModal) editDogModal.hidden = true;
});

document.getElementById('edit-dog-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('edit-dog-error');
  errorEl.hidden = true;

  const body = {
    name: document.getElementById('edit-dog-name').value.trim(),
    breed: document.getElementById('edit-dog-breed').value.trim() || null,
    weight_lbs: document.getElementById('edit-dog-weight').value || null,
    date_of_birth: document.getElementById('edit-dog-dob').value || null,
    diagnosis_date: document.getElementById('edit-dog-diagnosis').value || null,
    photo_url: document.getElementById('edit-dog-photo').value.trim() || null,
    notes: document.getElementById('edit-dog-notes').value.trim() || null,
  };

  try {
    const res = await fetch(`/api/dogs/${dogId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to update dog';
      errorEl.hidden = false;
      return;
    }
    editDogModal.hidden = true;
    loadDog();
  } catch (err) {
    errorEl.textContent = 'Network error';
    errorEl.hidden = false;
  }
});

// Delete dog
document.getElementById('delete-dog-btn').addEventListener('click', async () => {
  if (!confirm(`Are you sure you want to delete ${dogData?.name || 'this dog'}? This will also delete all associated events and medications.`)) return;
  try {
    const res = await fetch(`/api/dogs/${dogId}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.href = '/dashboard';
    } else {
      alert('Error deleting dog');
    }
  } catch (err) {
    alert('Network error');
  }
});

// Filters
document.getElementById('apply-filters').addEventListener('click', () => {
  loadEvents(getFilters());
});

function getFilters() {
  return {
    type: document.getElementById('filter-type').value,
    start_date: document.getElementById('filter-start').value,
    end_date: document.getElementById('filter-end').value,
  };
}

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

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Init
(async () => {
  const authed = await checkAuth();
  if (authed === false) return;
  loadDog();
  loadMedications();
  loadEvents();
})();
