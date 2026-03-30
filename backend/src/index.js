require('dotenv').config();
const express = require('express');
const cors = require('cors');
const driversRouter = require('./routes/drivers');
const bookingsRouter = require('./routes/bookings');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/drivers', driversRouter);
app.use('/api/bookings', bookingsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
