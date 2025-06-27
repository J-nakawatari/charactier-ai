import request from 'supertest';
import { app } from '../../index';

describe('Input Validation Tests', () => {
  describe('NoSQL Injection Protection', () => {
    it('should reject MongoDB operators in email field', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $ne: 'admin@example.com' },
          password: 'password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    it('should reject MongoDB operators in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/characters')
        .query({ 
          name: { $regex: '.*' } 
        });

      // Should be treated as string, not as operator
      expect(response.status).not.toBe(500);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should handle SQL injection attempts safely', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "password' OR '1'='1"
        });

      expect(response.status).toBe(401); // Invalid credentials, not SQL error
    });
  });

  describe('Email Validation', () => {
    const invalidEmails = [
      'notanemail',
      'missing@',
      '@missing.com',
      'spaces in@email.com',
      'email@',
      'email@.',
      'email@.com',
      'email@domain',
      'email@domain.',
      'email@-domain.com',
      'email@domain-.com',
      'email@domain..com',
      'email@.domain.com',
      'email@domain.com.',
      'email@domain.com-',
      'email@domain.c',
      'email@domain.toolongtld',
      'a'.repeat(255) + '@domain.com', // Too long
      'email@' + 'a'.repeat(255) + '.com', // Domain too long
    ];

    invalidEmails.forEach(email => {
      it(`should reject invalid email: ${email}`, async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email,
            password: 'ValidPassword123!',
            locale: 'ja'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('INVALID_INPUT');
      });
    });

    it('should accept valid emails', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.jp',
        'user123@subdomain.example.com',
        '123user@example.com'
      ];

      for (const email of validEmails) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email,
            password: 'ValidPassword123!',
            locale: 'ja'
          });

        // Should not be rejected for email format
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Password Validation', () => {
    const weakPasswords = [
      'short',           // Too short
      '12345678',        // No letters
      'password',        // No numbers
      'Password',        // No numbers
      'password123',     // No uppercase
      'PASSWORD123',     // No lowercase
      'Password123',     // No special chars
      '        ',        // Only spaces
      ''                 // Empty
    ];

    weakPasswords.forEach(password => {
      it(`should reject weak password: ${password || '(empty)'}`, async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            password,
            locale: 'ja'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('INVALID_INPUT');
      });
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongP@ssw0rd',
        'MySecure123!',
        'C0mpl3x#Password',
        'Test@1234567'
      ];

      for (const password of strongPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            password,
            locale: 'ja'
          });

        // Should not be rejected for password strength
        expect([201, 409]).toContain(response.status); // 201 created or 409 already exists
      }
    });
  });

  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd',
        'valid/../../../etc/passwd'
      ];

      for (const attempt of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/v1/files/${attempt}`);

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Content Type Validation', () => {
    it('should reject requests with invalid content type', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=test@example.com&password=password');

      expect(response.status).toBe(400);
    });

    it('should accept valid JSON content type', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should process the request (even if credentials are invalid)
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Size Limits', () => {
    it('should reject oversized payloads', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'password',
        extra: 'x'.repeat(10 * 1024 * 1024) // 10MB of data
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(largePayload);

      expect(response.status).toBe(413); // Payload too large
    });
  });
});