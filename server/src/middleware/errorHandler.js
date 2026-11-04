// Any error thrown in a route ends up here; Express 5 also catches async errors.
// The details are logged on the server, never sent to the browser.
function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
