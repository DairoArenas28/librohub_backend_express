import request from 'supertest';
import app from '../app';

describe('Smoke Tests - End-to-End Integration', () => {
  it('GET /health → 200 with { status: "ok" } without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('CORS headers are present in responses', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('POST with payload > 1MB returns 413', async () => {
    const largeBody = { data: 'x'.repeat(1.1 * 1024 * 1024) };
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(largeBody);
    expect(res.status).toBe(413);
  });
});
