process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const { seedTestDb, adminToken, employeeToken, managerToken } = require('./setup');

beforeAll(() => seedTestDb());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('POST /api/leave', () => {
  it('employee can submit leave request', async () => {
    const res = await request(app)
      .post('/api/leave')
      .set(auth(employeeToken()))
      .send({ leave_type: 'PTO', start_date: '2024-07-01', end_date: '2024-07-05', reason: 'Vacation' });
    expect(res.status).toBe(201);
    expect(res.body.leave_id).toBeDefined();
  });
});

describe('GET /api/leave', () => {
  it('returns leave requests (authenticated)', async () => {
    const res = await request(app).get('/api/leave').set(auth(adminToken()));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('can filter by status', async () => {
    const res = await request(app).get('/api/leave?status=Pending').set(auth(adminToken()));
    expect(res.status).toBe(200);
    res.body.forEach(r => expect(r.approval_status).toBe('Pending'));
  });
});

describe('PUT /api/leave/:id/status', () => {
  let leaveId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/leave')
      .set(auth(employeeToken()))
      .send({ leave_type: 'Sick', start_date: '2024-08-01', end_date: '2024-08-02' });
    leaveId = res.body.leave_id;
  });

  it('HR Admin can approve leave', async () => {
    const res = await request(app)
      .put(`/api/leave/${leaveId}/status`)
      .set(auth(adminToken()))
      .send({ approval_status: 'Approved' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Employee cannot approve leave', async () => {
    const res = await request(app)
      .put(`/api/leave/${leaveId}/status`)
      .set(auth(employeeToken()))
      .send({ approval_status: 'Approved' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/leave/:id', () => {
  it('employee can delete own pending request', async () => {
    const create = await request(app)
      .post('/api/leave')
      .set(auth(employeeToken()))
      .send({ leave_type: 'Unpaid', start_date: '2024-09-01', end_date: '2024-09-03' });
    const res = await request(app).delete(`/api/leave/${create.body.leave_id}`).set(auth(employeeToken()));
    expect(res.status).toBe(200);
  });

  it('cannot delete non-pending leave', async () => {
    // Use the one approved above
    const list = await request(app).get('/api/leave?status=Approved').set(auth(adminToken()));
    const approved = list.body[0];
    if (!approved) return; // skip if no approved leaves
    const res = await request(app).delete(`/api/leave/${approved.leave_id}`).set(auth(adminToken()));
    expect(res.status).toBe(400);
  });
});
