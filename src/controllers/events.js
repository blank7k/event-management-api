const Joi = require('joi');
const db = require('../db');

// ✅ Validation schema for creating events
const eventSchema = Joi.object({
  title: Joi.string().min(1).required(),
  datetime: Joi.string().isoDate().required(),
  location: Joi.string().required(),
  capacity: Joi.number().integer().min(1).max(1000).required()
});

// ===========================================
// 🎯 CREATE EVENT
// ===========================================
async function createEvent(req, res) {
  const { error, value } = eventSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { title, datetime, location, capacity } = value;

  try {
    console.log(`🎉 Creating event: ${title} at ${location} on ${datetime}`);

    const q = `
      INSERT INTO events (title, datetime, location, capacity)
      VALUES ($1,$2,$3,$4)
      RETURNING id
    `;
    const { rows } = await db.query(q, [title, datetime, location, capacity]);

    console.log(`✅ Event created successfully (id: ${rows[0].id})`);
    res.status(201).json({ eventId: rows[0].id });
  } catch (err) {
    console.error('❌ Event creation failed:', err.message);
    res.status(500).json({ error: 'Database insert failed' });
  }
}

// ===========================================
// 🔍 GET EVENT DETAILS (with registered users)
// ===========================================
async function getEvent(req, res) {
  const { id } = req.params;
  try {
    const q = `
      SELECT e.*, 
             COALESCE(json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) 
             FILTER (WHERE u.id IS NOT NULL), '[]') AS registrations
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE e.id = $1
      GROUP BY e.id;
    `;
    const { rows } = await db.query(q, [id]);

    if (rows.length === 0)
      return res.status(404).json({ error: 'Event not found' });

    console.log(`📦 Fetched event details for ID: ${id}`);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Failed to fetch event details:', err.message);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
}

// ===========================================
// 🧍 REGISTER USER FOR EVENT (with concurrency lock)
// ===========================================
async function registerForEvent(req, res) {
  const { id: eventId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  console.log(`🧍 User ${userId} attempting to register for event ${eventId}`);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction

    // 🔐 Lock the event row to prevent overbooking
    const eventRes = await client.query(
      'SELECT id, datetime, capacity FROM events WHERE id=$1 FOR UPDATE',
      [eventId]
    );
    if (eventRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventRes.rows[0];

    // 🚫 Check if event is in the past
    if (new Date(event.datetime) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot register for past event' });
    }

    // 📊 Count current registrations
    const regCountRes = await client.query(
      'SELECT COUNT(*) FROM registrations WHERE event_id=$1',
      [eventId]
    );
    const current = parseInt(regCountRes.rows[0].count, 10);

    if (current >= event.capacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Event is full' });
    }

    // 🧩 Try to insert registration (unique constraint prevents duplicates)
    try {
      await client.query(
        'INSERT INTO registrations (user_id, event_id) VALUES ($1, $2)',
        [userId, eventId]
      );
    } catch (err) {
      if (err.code === '23505') {
        // 23505 = unique violation
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'User already registered' });
      }
      throw err;
    }

    await client.query('COMMIT');
    console.log(`✅ User ${userId} successfully registered for event ${eventId}`);
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Registration failed:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ===========================================
// ❌ CANCEL REGISTRATION
// ===========================================
async function cancelRegistration(req, res) {
  const { eventId, userId } = req.params;

  try {
    console.log(`🗑️ User ${userId} attempting to cancel registration for event ${eventId}`);

    const q = `
      DELETE FROM registrations 
      WHERE event_id = $1 AND user_id = $2
      RETURNING id
    `;
    const { rows } = await db.query(q, [eventId, userId]);

    if (rows.length === 0)
      return res.status(404).json({ error: 'Registration not found' });

    console.log(`✅ Registration cancelled: user ${userId} - event ${eventId}`);
    res.json({ message: 'Registration cancelled successfully' });
  } catch (err) {
    console.error('❌ Cancellation failed:', err.message);
    res.status(500).json({ error: 'Cancellation failed' });
  }
}

// ===========================================
// 📅 LIST UPCOMING EVENTS
// ===========================================
async function listUpcomingEvents(req, res) {
  try {
    console.log('📅 Fetching upcoming events...');
    const q = `
      SELECT e.id,
             e.title,
             e.datetime,
             e.location,
             e.capacity,
             COUNT(r.id) AS registrations,
             (e.capacity - COUNT(r.id)) AS remaining_capacity
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id
      WHERE e.datetime > NOW()
      GROUP BY e.id
      ORDER BY e.datetime ASC, e.location ASC;
    `;

    const { rows } = await db.query(q);
    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch upcoming events:', err.message);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
}

// ===========================================
// 📊 EVENT STATS
// ===========================================
async function getEventStats(req, res) {
  const { id } = req.params;

  try {
    console.log(`📊 Fetching stats for event ID: ${id}`);

    const eventRes = await db.query(
      'SELECT capacity FROM events WHERE id = $1',
      [id]
    );
    if (eventRes.rowCount === 0)
      return res.status(404).json({ error: 'Event not found' });

    const capacity = eventRes.rows[0].capacity;

    const regRes = await db.query(
      'SELECT COUNT(*)::int AS total FROM registrations WHERE event_id = $1',
      [id]
    );
    const total = regRes.rows[0].total;

    const remaining = capacity - total;
    const percentUsed =
      capacity === 0 ? 0 : Number(((total / capacity) * 100).toFixed(2));

    console.log(`📈 Stats for event ${id}: ${total}/${capacity} used`);
    res.json({
      totalRegistrations: total,
      remainingCapacity: remaining,
      percentUsed
    });
  } catch (err) {
    console.error('❌ Failed to fetch stats:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

// ===========================================
// ✅ EXPORT CONTROLLERS
// ===========================================
module.exports = {
  eventSchema,
  createEvent,
  getEvent,
  registerForEvent,
  cancelRegistration,
  listUpcomingEvents,
  getEventStats
};
