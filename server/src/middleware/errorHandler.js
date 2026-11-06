// Any error thrown in a route ends up here; Express 5 also catches async errors.
function errorHandler(error, req, res, next) {
  // Problems with the request itself, such as a body that isn't valid JSON, arrive
  // with a 4xx status and a message that is safe to show. They are the client's
  // mistake, so say so instead of reporting a server failure.
  if (error.status >= 400 && error.status < 500 && error.expose) {
    const message =
      error.type === 'entity.parse.failed' ? 'Request body is not valid JSON' : error.message;
    return res.status(error.status).json({ error: message });
  }

  // Anything else is our bug: log the details on the server, never send them to the browser.
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
