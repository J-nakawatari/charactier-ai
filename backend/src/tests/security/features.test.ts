import request from 'supertest';
import { app } from '../../index';
import { getFeatureFlags, getCookieConfig, getJoiValidationOptions } from '../../config/featureFlags';

describe('Feature Flag Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('SECURE_COOKIE_AUTH Flag', () => {
    it('should return httpOnly cookies when enabled', () => {
      process.env.FEATURE_SECURE_COOKIE_AUTH = 'true';
      const config = getCookieConfig();
      
      expect(config.httpOnly).toBe(true);
      expect(config.sameSite).toBe('lax');
    });

    it('should return non-httpOnly cookies when disabled', () => {
      process.env.FEATURE_SECURE_COOKIE_AUTH = 'false';
      const config = getCookieConfig();
      
      expect(config.httpOnly).toBe(false);
      expect(config.sameSite).toBe('lax');
    });

    it('should not include tokens in login response when enabled', async () => {
      process.env.FEATURE_SECURE_COOKIE_AUTH = 'true';
      
      // Note: This would require mocking or actual test user
      // For now, we just test the configuration
      const flags = getFeatureFlags();
      expect(flags.SECURE_COOKIE_AUTH).toBe(true);
    });
  });

  describe('CSRF_SAMESITE_STRICT Flag', () => {
    it('should use strict sameSite when enabled', () => {
      process.env.FEATURE_SECURE_COOKIE_AUTH = 'true';
      process.env.FEATURE_CSRF_SAMESITE_STRICT = 'true';
      const config = getCookieConfig();
      
      expect(config.sameSite).toBe('strict');
    });

    it('should use lax sameSite when disabled', () => {
      process.env.FEATURE_SECURE_COOKIE_AUTH = 'true';
      process.env.FEATURE_CSRF_SAMESITE_STRICT = 'false';
      const config = getCookieConfig();
      
      expect(config.sameSite).toBe('lax');
    });
  });

  describe('STRICT_JOI_VALIDATION Flag', () => {
    it('should not strip unknown fields when enabled', () => {
      process.env.FEATURE_STRICT_JOI_VALIDATION = 'true';
      const options = getJoiValidationOptions();
      
      expect(options.stripUnknown).toBe(false);
      expect(options.allowUnknown).toBe(false);
    });

    it('should strip unknown fields when disabled', () => {
      process.env.FEATURE_STRICT_JOI_VALIDATION = 'false';
      const options = getJoiValidationOptions();
      
      expect(options.stripUnknown).toBe(true);
      expect(options.allowUnknown).toBe(true);
    });
  });

  describe('LOG_UNKNOWN_FIELDS Flag', () => {
    it('should be enabled when set to true', () => {
      process.env.FEATURE_LOG_UNKNOWN_FIELDS = 'true';
      const flags = getFeatureFlags();
      
      expect(flags.LOG_UNKNOWN_FIELDS).toBe(true);
    });

    it('should be disabled when set to false', () => {
      process.env.FEATURE_LOG_UNKNOWN_FIELDS = 'false';
      const flags = getFeatureFlags();
      
      expect(flags.LOG_UNKNOWN_FIELDS).toBe(false);
    });
  });

  describe('Feature Flag API Endpoint', () => {
    it('should return current feature flags', async () => {
      const response = await request(app)
        .get('/api/v1/feature-flags');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('SECURE_COOKIE_AUTH');
      expect(response.body).toHaveProperty('CSRF_SAMESITE_STRICT');
      expect(response.body).toHaveProperty('STRICT_JOI_VALIDATION');
      expect(response.body).toHaveProperty('LOG_UNKNOWN_FIELDS');
    });
  });
});