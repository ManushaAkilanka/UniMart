export const validateRequest = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace with validated/sanitized data
    if (validated.body !== undefined) req.body = validated.body;
    if (validated.query !== undefined) req.query = validated.query;
    if (validated.params !== undefined) req.params = validated.params;

    next();
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};
