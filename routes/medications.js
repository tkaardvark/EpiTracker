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

// Get medications for a dog
router.get('/dog/:dogId', verifyDogOwnership, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM medications WHERE dog_id = $1 ORDER BY start_date DESC',
      [req.params.dogId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get medications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add medication
router.post('/', verifyDogOwnership, async (req, res) => {
  const { dog_id, medication_name, dosage, frequency, start_date, end_date, notes } = req.body;

  if (!medication_name || !start_date) {
    return res.status(400).json({ error: 'Medication name and start date are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO medications (dog_id, medication_name, dosage, frequency, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [dog_id, medication_name, dosage || null, frequency || null, start_date, end_date || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add medication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update medication
router.put('/:id', async (req, res) => {
  const { medication_name, dosage, frequency, start_date, end_date, notes } = req.body;

  if (!medication_name || !start_date) {
    return res.status(400).json({ error: 'Medication name and start date are required' });
  }

  try {
    // Verify ownership through dog
    const med = await pool.query(
      `SELECT m.id FROM medications m
       JOIN dogs d ON m.dog_id = d.id
       WHERE m.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (med.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const result = await pool.query(
      `UPDATE medications SET medication_name=$1, dosage=$2, frequency=$3,
       start_date=$4, end_date=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [medication_name, dosage || null, frequency || null, start_date, end_date || null, notes || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update medication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete medication
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM medications m
       USING dogs d
       WHERE m.dog_id = d.id AND m.id = $1 AND d.user_id = $2
       RETURNING m.id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.json({ message: 'Medication deleted' });
  } catch (err) {
    console.error('Delete medication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
