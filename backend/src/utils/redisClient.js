const redis = require('redis');

let client;

function getClient() {
  if (client) return client;
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  client = redis.createClient({
    url,
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: false,
    },
  });
  client.on('error', (e) => console.error('Redis error', e));
  client.connect().catch(e => console.error('Redis connect failed', e));
  return client;
}

async function isJtiRevoked(jti) {
  if (!jti) return false;
  try {
    const c = getClient();
    if (!c.isReady) return false;
    const key = `revoked_jti:${jti}`;
    const v = await c.get(key);
    return !!v;
  } catch (e) {
    console.error('Redis isJtiRevoked error', e);
    return false;
  }
}

async function cacheRevokedJti(jti, ttlSeconds = 60 * 60 * 24 * 30) {
  if (!jti) return;
  try {
    const c = getClient();
    if (!c.isReady) return;
    const key = `revoked_jti:${jti}`;
    await c.set(key, '1', { EX: ttlSeconds });
  } catch (e) { console.error('Redis cacheRevokedJti', e); }
}

module.exports = { getClient, isJtiRevoked, cacheRevokedJti };
