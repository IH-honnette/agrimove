const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db');

afterAll(async () => {
  await pool.end();
});

describe('POST /api/bookings', () => {
  it('creates a booking and returns it', async () => {
    // Get a driver id first
    const driversRes = await request(app).get('/api/drivers?available=true');
    const driverId = driversRes.body[0].id;

    const payload = {
      driver_id: driverId,
      customer_name: 'Test Farmer',
      customer_phone: '+250 788 999 000',
      cargo_type: 'Vegetables',
      pickup_location: 'Kigali Market',
      destination: 'Musanze',
    };

    const res = await request(app).post('/api/bookings').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.customer_name).toBe('Test Farmer');
    expect(res.body.status).toBe('pending');
    expect(res.body.driver_phone).toBeDefined();
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/bookings').send({ driver_id: 1 });
    expect(res.status).toBe(400);
  });
});
