function errorHandler(err, req, res, next) {
  console.error('💥 Error:', err);

  // If it's a known type (custom), use its status
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
