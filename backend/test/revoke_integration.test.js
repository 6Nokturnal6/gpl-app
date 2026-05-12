const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const db = require('../src/models/db');

let app;

describe('Revoke integration', function() {
  before(function() {
    const srv = require('../src/index');
    app = srv.app || srv;
  });

  let userId;
  after(async function() {
    if (userId) {
      await db.query('DELETE FROM users WHERE id=$1', [userId]);
      await db.query('DELETE FROM revoked_jtis WHERE jti=$1', [this._jti]);
      await db.query('DELETE FROM issued_jtis WHERE jti=$1', [this._jti]);
    }
  });

  it('token is rejected after revocation', async function() {
    userId = uuidv4();
    const pwd = 'revokepass';
    const hash = await bcrypt.hash(pwd, 4);
    await db.query('INSERT INTO users (id,email,password,nome,institution,role,is_active,created_at) VALUES ($1,$2,$3,$4,$5,$6,true,now())', [userId, 'revoketest@example.com', hash, 'Rev Test', 'TestInst', 'chefe_departamento']);

    const jti = uuidv4();
    this._jti = jti;
    const token = jwt.sign({ id: userId, role: 'chefe_departamento' }, process.env.JWT_SECRET || 'testsecret', { jwtid: jti, expiresIn: '1h' });

    // call me - should succeed
    let res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', userId);

    // revoke using superadmin token
    const saJti = uuidv4();
    const saToken = jwt.sign({ id: '00000000-0000-0000-0000-000000000000', role: 'superadmin' }, process.env.JWT_SECRET || 'testsecret', { jwtid: saJti, expiresIn: '1h' });
    res = await request(app).post('/api/admin/revoke-token').set('Authorization', `Bearer ${saToken}`).send({ jti, reason: 'integration test' });
    expect(res.status).to.equal(200);

    // call me again - should be 401
    res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(401);
  });
});
