process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const { seedTestDb, adminToken, employeeToken, managerToken } = require('./setup');

beforeAll(() => seedTestDb());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/payroll', () => {
  it('HR Admin can list payroll', async () => {
    const res = await request(app).get('/api/payroll').set(auth(adminToken()));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Manager can list payroll', async () => {
    const res = await request(app).get('/api/payroll').set(auth(managerToken()));
    expect(res.status).toBe(200);
  });

  it('Employee cannot list all payroll', async () => {
    const res = await request(app).get('/api/payroll').set(auth(employeeToken()));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/payroll/my', () => {
  it('Employee can view own payroll', async () => {
    const res = await request(app).get('/api/payroll/my').set(auth(employeeToken()));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/payroll', () => {
  it('HR Admin can create payroll record', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set(auth(adminToken()))
      .send({ employee_id: 2, pay_period_start: '2024-01-01', pay_period_end: '2024-01-31', gross_pay: 5000, tax_deductions: 500, payment_date: '2024-02-01' });
    expect(res.status).toBe(201);
    expect(res.body.payroll_id).toBeDefined();
    expect(res.body.late_deduction).toBeDefined();
  });

  it('net_pay equals gross_pay minus deductions', async () => {
    await request(app)
      .post('/api/payroll')
      .set(auth(adminToken()))
      .send({ employee_id: 2, pay_period_start: '2024-02-01', pay_period_end: '2024-02-28', gross_pay: 4000, tax_deductions: 400, payment_date: '2024-03-01' });
    const list = await request(app).get('/api/payroll').set(auth(adminToken()));
    const record = list.body.find(p => p.pay_period_start === '2024-02-01');
    expect(record.net_pay).toBe(3600);
  });

  it('Employee cannot create payroll', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set(auth(employeeToken()))
      .send({ employee_id: 2, pay_period_start: '2024-01-01', pay_period_end: '2024-01-31', gross_pay: 5000, tax_deductions: 500 });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/payroll/:id', () => {
  let payrollId;
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set(auth(adminToken()))
      .send({ employee_id: 1, pay_period_start: '2024-03-01', pay_period_end: '2024-03-31', gross_pay: 6000, tax_deductions: 600, payment_date: '2024-04-01' });
    payrollId = res.body.payroll_id;
  });

  it('HR Admin can edit payroll', async () => {
    const res = await request(app)
      .put(`/api/payroll/${payrollId}`)
      .set(auth(adminToken()))
      .send({ pay_period_start: '2024-03-01', pay_period_end: '2024-03-31', gross_pay: 7000, tax_deductions: 700, payment_date: '2024-04-01' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Employee cannot edit payroll', async () => {
    const res = await request(app)
      .put(`/api/payroll/${payrollId}`)
      .set(auth(employeeToken()))
      .send({ pay_period_start: '2024-03-01', pay_period_end: '2024-03-31', gross_pay: 9999, tax_deductions: 0 });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/payroll/:id', () => {
  it('HR Admin can delete payroll record', async () => {
    const create = await request(app)
      .post('/api/payroll')
      .set(auth(adminToken()))
      .send({ employee_id: 1, pay_period_start: '2024-05-01', pay_period_end: '2024-05-31', gross_pay: 3000, tax_deductions: 300 });
    const res = await request(app).delete(`/api/payroll/${create.body.payroll_id}`).set(auth(adminToken()));
    expect(res.status).toBe(200);
  });
});
