const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/drivers', () => {
  it('returns an array of drivers', async () => {
    const res = await request(app).get('/api/drivers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('vehicle');
      expect(res.body[0]).toHaveProperty('available');
    }
  });

  it('filters by available=true', async () => {
    const res = await request(app).get('/api/drivers?available=true');
    expect(res.status).toBe(200);
    res.body.forEach(d => expect(d.available).toBe(true));
  });

  it('filters by type', async () => {
    const res = await request(app).get('/api/drivers?type=truck');
    expect(res.status).toBe(200);
    res.body.forEach(d => expect(d.type).toBe('truck'));
  });
});

describe('GET /api/drivers/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/drivers/99999');
    expect(res.status).toBe(404);
  });
});
