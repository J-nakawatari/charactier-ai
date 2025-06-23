import helmet from 'helmet';
import { Express } from 'express';

/**
 * Configure security headers for the application
 * Following OWASP security best practices
 */
export function configureSecurityHeaders(app: Express): void {
  // Basic helmet configuration with custom options
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Next.js inline scripts
          "'unsafe-eval'", // Required for development (remove in production)
          "https://js.stripe.com", // Stripe
          "https://checkout.stripe.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Tailwind CSS
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "data:", // base64 encoded fonts
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:", // Allow all HTTPS images (for AI character images)
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://checkout.stripe.com",
          "https://api.openai.com",
          "wss:", // WebSocket connections
          process.env.NODE_ENV === 'development' ? 'http://localhost:*' : ''
        ].filter(Boolean),
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://checkout.stripe.com"
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        childSrc: ["'self'"],
        formAction: ["'self'"],
        ...(process.env.NODE_ENV === 'production' && {
          upgradeInsecureRequests: [],
          blockAllMixedContent: []
        })
      }
    },

    // Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny' // Prevent clickjacking
    },

    // X-Content-Type-Options
    noSniff: true, // Prevent MIME type sniffing

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: false,

    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false
    },

    // X-Download-Options
    ieNoOpen: true,

    // Remove X-Powered-By header
    hidePoweredBy: true,

    // X-XSS-Protection (legacy, but still useful for older browsers)
    xssFilter: true
  }));

  // Additional security headers not covered by helmet
  app.use((req, res, next) => {
    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()'
    );

    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Expect-CT (Certificate Transparency)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
    }

    next();
  });

  console.log('🛡️ Security headers configured successfully');
}

/**
 * Get security headers for Next.js configuration
 * These should be added to next.config.js
 */
export function getNextSecurityHeaders() {
  return [
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on'
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    {
      key: 'Permissions-Policy',
      value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()'
    },
    {
      key: 'X-Permitted-Cross-Domain-Policies',
      value: 'none'
    }
  ];
}