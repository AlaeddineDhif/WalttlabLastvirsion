import crypto from 'node:crypto';
import { config } from './config.js';

export function signToken(payload, ttlMs = config.auth.tokenTtlMs) {
  const now = Date.now();
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + ttlMs })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', config.auth.tokenSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', config.auth.tokenSecret).update(body).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validateCredentials(username, password) {
  return (
    typeof username === 'string' &&
    typeof password === 'string' &&
    username === config.auth.username &&
    password === config.auth.password
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }
  req.user = payload;
  next();
}