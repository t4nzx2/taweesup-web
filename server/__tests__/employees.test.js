process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const { seedTestDb, adminToken, employeeToken } = require('./setup');

beforeAll(() => seedTestDb());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/employees', () => {
  it('returns employee list for authenticated user', async () => {
    const res = await request(app).get('/api/employees').set(auth(adminToken()));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('employee role can also list', async () => {
    const res = await request(app).get('/api/employees').set(auth(employeeToken()));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/employees/:id', () => {
  it('returns employee by id', async () => {
    const res = await request(app).get('/api/employees/1').set(auth(adminToken()));
    expect(res.status).toBe(200);
    expect(res.body.employee_id).toBe(1);
    expect(res.body.first_name).toBe('Admin');
  });

  it('returns 404 for missing employee', async () => {
    const res = await request(app).get('/api/employees/9999').set(auth(adminToken()));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/employees', () => {
  it('HR Admin can create employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(auth(adminToken()))
      .send({ first_name: 'New', last_name: 'Emp', hire_date: '2024-01-01', employment_status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.employee_id).toBeDefined();
  });

  it('Employee role cannot create employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set(auth(employeeToken()))
      .send({ first_name: 'X', last_name: 'Y', hire_date: '2024-01-01', employment_status: 'Active' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/employees/:id', () => {
  it('HR Admin can update employee', async () => {
    const res = await request(app)
      .put('/api/employees/2')
      .set(auth(adminToken()))
      .send({ first_name: 'Jane', last_name: 'Updated', hire_date: '2021-06-01', employment_status: 'Active' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Employee role cannot update', async () => {
    const res = await request(app)
      .put('/api/employees/2')
      .set(auth(employeeToken()))
      .send({ first_name: 'Hack', last_name: 'Attempt', hire_date: '2021-06-01', employment_status: 'Active' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('HR Admin can delete employee', async () => {
    // Create a temp employee first
    const create = await request(app)
      .post('/api/employees')
      .set(auth(adminToken()))
      .send({ first_name: 'Temp', last_name: 'Del', hire_date: '2024-01-01', employment_status: 'Active' });
    const id = create.body.employee_id;
    const res = await request(app).delete(`/api/employees/${id}`).set(auth(adminToken()));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Employee role cannot delete', async () => {
    const res = await request(app).delete('/api/employees/2').set(auth(employeeToken()));
    expect(res.status).toBe(403);
  });
});
