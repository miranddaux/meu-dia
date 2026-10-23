// Web Push sem dependências (RFC 8291 aes128gcm + RFC 8292 VAPID), só com o crypto do Node.
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64url');
const unb64u = s => Buffer.from(String(s), 'base64url');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
function generateVAPIDKeys() {
  const e = crypto.createECDH('prime256v1'); e.generateKeys();
  return { publicKey: b64u(e.getPublicKey()), privateKey: b64u(Buffer.concat([Buffer.alloc(32), e.getPrivateKey()]).subarray(-32)) };
}
function vapidJwt(aud, sub, pub, priv, now) {
  const pb = unb64u(pub), key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(pb.subarray(1, 33)), y: b64u(pb.subarray(33, 65)), d: priv }, format: 'jwk' });
  const h = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' })), c = b64u(JSON.stringify({ aud, exp: Math.floor((now || Date.now()) / 1000) + 12 * 3600, sub })), data = h + '.' + c;
  return data + '.' + b64u(crypto.sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' }));
}
function encrypt(sub, payload) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth), as = crypto.createECDH('prime256v1'); as.generateKeys();
  const asPub = as.getPublicKey(), secret = as.computeSecret(ua), salt = crypto.randomBytes(16);
  const prkKey = hmac(auth, secret), ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub, Buffer.from([1])])), prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16), nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const ci = crypto.createCipheriv('aes-128-gcm', cek, nonce), ct = Buffer.concat([ci.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), ci.final(), ci.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, ct]);
}
async function send(sub, payload, v) { // v = { pub, priv, sub }; lança erro com statusCode quando o serviço recusa
  const body = encrypt(sub, typeof payload === 'string' ? payload : JSON.stringify(payload)), aud = new URL(sub.endpoint).origin;
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'normal', Authorization: `vapid t=${vapidJwt(aud, v.sub, v.pub, v.priv)}, k=${v.pub}` }, body });
  if (!r.ok) { const e = new Error('Push ' + r.status + ' ' + (await r.text()).slice(0, 120)); e.statusCode = r.status; throw e; }
  return r.status;
}
module.exports = { generateVAPIDKeys, send, encrypt, vapidJwt };
