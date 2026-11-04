const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const hotelsRoutes = require('./routes/hotels.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Lets the React dashboard, running on another port, call this API from the browser.
app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/hotels', hotelsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
