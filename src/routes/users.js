const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { createUser, listUsers } = require('../controllers/users');

router.post('/', asyncHandler(createUser));
router.get('/', asyncHandler(listUsers));

module.exports = router;
