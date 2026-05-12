const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../src/models/db');

let app;

describe('Admin revoke-token API', function() {
  before(function() {
    const srv = require('../src/index');
    app = srv.app || srv; // support both exports
  });

  it('should reject unauthenticated requests', async function() {
    const res = await request(app).post('/api/admin/revoke-token').send({ jti: 'x' });
    expect(res.status).to.be.oneOf([401,403]);
  });

  it('should allow superadmin to revoke by jti and persist', async function() {
    // create a fake superadmin token with jti
    const jti = uuidv4();
    const token = jwt.sign({ id: '00000000-0000-0000-0000-000000000000', role: 'superadmin' }, process.env.JWT_SECRET || 'testsecret', { jwtid: jti, expiresIn: '1h' });

    const res = await request(app).post('/api/admin/revoke-token').set('Authorization', `Bearer ${token}`).send({ jti, reason: 'test' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok');
    // confirm in DB
    const r = await db.query('SELECT jti FROM revoked_jtis WHERE jti=$1', [jti]);
    expect(r.rows.length).to.equal(1);
  });
});
