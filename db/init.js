require('dotenv').config();
const initSchema = require('./schema');
const pool = require('./pool');

initSchema()
  .catch(err => console.error('Error initializing database:', err))
  .finally(() => pool.end());
