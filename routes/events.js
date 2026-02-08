const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Verify dog ownership middleware
async function verifyDogOwnership(req, res, next) {
  const dogId = req.params.dogId || req.body.dog_id;
  if (!dogId) return res.status(400).json({ error: 'dog_id is required' });

  try {
    const result = await pool.query(
      'SELECT id FROM dogs WHERE id = $1 AND user_id = $2',
      [dogId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Get events for a dog (with optional filters)
router.get('/dog/:dogId', verifyDogOwnership, async (req, res) => {
  const { type, start_date, end_date } = req.query;
  let query = 'SELECT * FROM events WHERE dog_id = $1';
  const params = [req.params.dogId];
  let paramIndex = 2;

  if (type) {
    query += ` AND event_type = $${paramIndex++}`;
    params.push(type);
  }
  if (start_date) {
    query += ` AND event_date >= $${paramIndex++}`;
    params.push(start_date);
  }
  if (end_date) {
    query += ` AND event_date <= $${paramIndex++}`;
    params.push(end_date);
  }

  query += ' ORDER BY event_date DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent events across all user's dogs
router.get('/recent', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, d.name as dog_name FROM events e
       JOIN dogs d ON e.dog_id = d.id
       WHERE d.user_id = $1
       ORDER BY e.event_date DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get recent events error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add event
router.post('/', verifyDogOwnership, async (req, res) => {
  const { dog_id, event_type, event_date, duration_seconds, severity, description, notes } = req.body;

  const validTypes = ['full_seizure', 'partial_seizure', 'trigger', 'post_ictal', 'medication_change', 'diet_change', 'observation'];
  const validSeverity = ['mild', 'moderate', 'severe'];

  if (!event_type || !event_date) {
    return res.status(400).json({ error: 'Event type and date are required' });
  }
  if (!validTypes.includes(event_type)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }
  if (severity && !validSeverity.includes(severity)) {
    return res.status(400).json({ error: 'Invalid severity level' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (dog_id, event_type, event_date, duration_seconds, severity, description, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [dog_id, event_type, event_date, duration_seconds || null, severity || null, description || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  const { event_type, event_date, duration_seconds, severity, description, notes } = req.body;

  if (!event_type || !event_date) {
    return res.status(400).json({ error: 'Event type and date are required' });
  }

  try {
    const ev = await pool.query(
      `SELECT e.id FROM events e
       JOIN dogs d ON e.dog_id = d.id
       WHERE e.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (ev.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await pool.query(
      `UPDATE events SET event_type=$1, event_date=$2, duration_seconds=$3,
       severity=$4, description=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [event_type, event_date, duration_seconds || null, severity || null,
       description || null, notes || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM events e
       USING dogs d
       WHERE e.dog_id = d.id AND e.id = $1 AND d.user_id = $2
       RETURNING e.id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
