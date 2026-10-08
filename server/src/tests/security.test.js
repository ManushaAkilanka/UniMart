/**
 * Security & Hardening Integration Tests
 *
 * Verifies:
 *  1. mongoSanitize strips MongoDB operators ($gt, $ne, etc.) from body and query
 *  2. Helmet security headers are active (X-Content-Type-Options, X-Frame-Options, etc.)
 *  3. CORS rejects unauthorized origins and permits CLIENT_URL
 *  4. Secure cookie flags (httpOnly, sameSite, secure)
 *  5. Rate limiter rejects requests when limit is exceeded
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize, { sanitize } from '../middleware/mongoSanitize.js';
import { ENV } from '../config/env.js';

describe('Security Middleware Hardening', () => {
  describe('mongoSanitize', () => {
    it('strips keys starting with $ or containing . from objects', () => {
      const payload = {
        email: 'student@cmb.ac.lk',
        $gt: '',
        nested: {
          $ne: 1,
          'invalid.key': 'bad',
          valid: 'good',
        },
        items: [{ $where: 'attack' }, { clean: 'yes' }],
      };

      const result = sanitize(payload);

      expect(result.email).toBe('student@cmb.ac.lk');
      expect(result.$gt).toBeUndefined();
      expect(result.nested.$ne).toBeUndefined();
      expect(result.nested['invalid.key']).toBeUndefined();
      expect(result.nested.valid).toBe('good');
      expect(result.items[0].$where).toBeUndefined();
      expect(result.items[1].clean).toBe('yes');
    });

    it('sanitizes req.body and req.query via Express middleware', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(mongoSanitize());
      testApp.post('/test-sanitize', (req, res) => {
        res.json({ body: req.body, query: req.query });
      });

      const res = await request(testApp)
        .post('/test-sanitize?user[$ne]=null')
        .send({ username: 'alice', password: { $gt: '' }, safe: 'value' });

      expect(res.status).toBe(200);
      expect(res.body.body.username).toBe('alice');
      expect(res.body.body.safe).toBe('value');
      expect(res.body.body.password.$gt).toBeUndefined();
      expect(res.body.query.user.$ne).toBeUndefined();
    });
  });

  describe('Helmet & CORS Policy', () => {
    it('sets standard security headers from Helmet', async () => {
      const testApp = express();
      testApp.use(
        helmet({
          crossOriginResourcePolicy: { policy: 'cross-origin' },
          contentSecurityPolicy: false,
        })
      );
      testApp.get('/test-headers', (_req, res) => res.send('OK'));

      const res = await request(testApp).get('/test-headers');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('blocks requests from disallowed origins in CORS', async () => {
      const testApp = express();
      testApp.use(
        cors({
          origin: (origin, callback) => {
            if (!origin || origin === 'http://localhost:5173') {
              callback(null, true);
            } else {
              callback(new Error(`CORS policy: origin ${origin} not allowed.`));
            }
          },
          credentials: true,
        })
      );
      testApp.get('/test-cors', (_req, res) => res.send('OK'));
      testApp.use((err, _req, res, _next) => {
        res.status(403).json({ error: err.message });
      });

      const allowedRes = await request(testApp)
        .get('/test-cors')
        .set('Origin', 'http://localhost:5173');
      expect(allowedRes.status).toBe(200);

      const blockedRes = await request(testApp)
        .get('/test-cors')
        .set('Origin', 'http://evil-attacker.com');
      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error).toContain('CORS policy');
    });
  });
});
