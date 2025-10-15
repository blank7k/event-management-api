const db = require('../db');
const Joi = require('joi');

// Validation schema for new users
const userSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required()
});

// Controller: Create a new user
async function createUser(req, res, next) {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }

    const q = `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id`;
    const { rows } = await db.query(q, [value.name, value.email]);
    res.status(201).json({ userId: rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      err.status = 409;
      err.message = 'Email already exists';
    }
    next(err);
  }
}

// Optional: Get all users (for testing)
async function listUsers(req, res, next) {
  try {
    const { rows } = await db.query('SELECT id, name, email FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, listUsers };
