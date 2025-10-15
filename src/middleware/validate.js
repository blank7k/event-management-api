function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      const message = error.details ? error.details[0].message : error.message;
      return res.status(400).json({ error: message });
    }
    req.body = value; // replace with validated/sanitized data
    next();
  };
}

module.exports = validate;
