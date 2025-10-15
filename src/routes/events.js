const express = require('express');
const router = express.Router();

const {
  createEvent,
  getEvent,
  registerForEvent,
  cancelRegistration,
  listUpcomingEvents,
  getEventStats,
  eventSchema
} = require('../controllers/events');

const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');

// 🧠 Apply validation only where we need it (POST /api/events)
router.post('/', validate(eventSchema), asyncHandler(createEvent));

router.get('/upcoming', asyncHandler(listUpcomingEvents));
router.get('/:id', asyncHandler(getEvent));
router.post('/:id/register', asyncHandler(registerForEvent));
router.delete('/:eventId/registrations/:userId', asyncHandler(cancelRegistration));
router.get('/:id/stats', asyncHandler(getEventStats));

module.exports = router;
