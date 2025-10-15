const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// routes
const eventRoutes = require('./src/routes/events');
app.use('/api/events', eventRoutes);

const userRoutes = require('./src/routes/users');
app.use('/api/users', userRoutes);


// error handler (always last)
const errorHandler = require('./src/middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
