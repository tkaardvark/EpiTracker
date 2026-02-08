const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Get all dogs for current user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dogs WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get dogs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single dog (with ownership check)
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dogs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get dog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a dog
router.post('/', async (req, res) => {
  const { name, breed, date_of_birth, diagnosis_date, weight_lbs, photo_url, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Dog name is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO dogs (user_id, name, breed, date_of_birth, diagnosis_date, weight_lbs, photo_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, name, breed || null, date_of_birth || null, diagnosis_date || null,
       weight_lbs || null, photo_url || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add dog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a dog
router.put('/:id', async (req, res) => {
  const { name, breed, date_of_birth, diagnosis_date, weight_lbs, photo_url, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Dog name is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE dogs SET name=$1, breed=$2, date_of_birth=$3, diagnosis_date=$4,
       weight_lbs=$5, photo_url=$6, notes=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, breed || null, date_of_birth || null, diagnosis_date || null,
       weight_lbs || null, photo_url || null, notes || null, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update dog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a dog
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM dogs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    res.json({ message: 'Dog deleted' });
  } catch (err) {
    console.error('Delete dog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
