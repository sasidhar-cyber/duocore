function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const publicMessage =
    status >= 500
      ? 'Something went wrong. Please try again.'
      : (err.message || 'Request failed');
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', err);
  } else {
    console.error('[Error Handler]', err.message);
  }
  res.status(status).json({ error: publicMessage });
}

module.exports = { errorHandler };
