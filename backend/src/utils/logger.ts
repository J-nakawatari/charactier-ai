import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define sensitive fields that should be sanitized
const SENSITIVE_FIELDS = [
  'password',
  'passwordStrength',
  'newPassword',
  'oldPassword',
  'currentPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'stripe',
  'SENDGRID_API_KEY',
  'MONGO_URI',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'creditCard',
  'cvv',
  'ssn',
  'bankAccount',
  'email',
  'phone',
  'address',
  'privateKey',
  'sessionId',
  'bearer'
];

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  /^sk_[a-zA-Z0-9]{24,}$/,  // Stripe secret key
  /^pk_[a-zA-Z0-9]{24,}$/,  // Stripe public key
  /^[A-Za-z0-9+/]{40,}={0,2}$/,  // Base64 encoded secrets
  /^[0-9a-f]{64}$/i,  // SHA256 hashes
  /^[0-9a-f]{128}$/i,  // SHA512 hashes
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/,  // Bearer tokens
];

// Sanitize sensitive data from objects
function sanitizeData(data: any, visited = new WeakSet()): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // Prevent circular references
  if (visited.has(data)) {
    return '[Circular Reference]';
  }
  visited.add(data);

  // Handle MongoDB ObjectId
  if (data._bsontype === 'ObjectId' || data.constructor?.name === 'ObjectId') {
    return data.toString();
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Buffer
  if (Buffer.isBuffer(data)) {
    return '[Buffer]';
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, visited));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this key contains sensitive information
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, visited);
    } else if (typeof value === 'string') {
      // Check against sensitive patterns
      let isSensitive = false;
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(value)) {
          isSensitive = true;
          break;
        }
      }
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value.length > 30 && /^[A-Za-z0-9+/=._-]+$/.test(value)) {
        // Potentially sensitive long string
        sanitized[key] = `[TRUNCATED: ${value.length} chars]`;
      } else if (value.includes('password') || value.includes('secret') || value.includes('token')) {
        // String contains sensitive keywords
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Custom format for console output
const consoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let output = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    // Sanitize metadata before logging
    const sanitizedMeta = sanitizeData(meta);
    output += '\n' + JSON.stringify(sanitizedMeta, null, 2);
  }
  
  return output;
});

// Create logger configuration
const createLogger = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logDir = process.env.LOG_DIR || path.join(__dirname, '../../../logs');

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const transports: winston.transport[] = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      level: isProduction ? 'info' : 'debug'
    })
  );

  // File transports for production
  if (isProduction) {
    // Daily rotate file for all logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
        level: 'info'
      })
    );

    // Separate file for errors
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
        level: 'error'
      })
    );
  }

  return winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: logFormat,
    transports,
    // Don't exit on uncaught errors
    exitOnError: false
  });
};

// Create the logger instance
const logger = createLogger();

// Helper functions for structured logging
export const log = {
  debug: (message: string, meta?: any) => {
    // Skip debug logs in production
    if (process.env.NODE_ENV === 'production') return;
    
    if (!meta) {
      logger.debug(message);
      return;
    }
    
    // Apply strict sanitization
    const sanitized = typeof meta === 'object' ? sanitizeData(meta) : meta;
    logger.debug(message, sanitized);
  },
  
  info: (message: string, meta?: any) => {
    if (!meta) {
      logger.info(message);
      return;
    }
    
    // Apply sanitization and ensure no sensitive data
    const sanitized = typeof meta === 'object' ? sanitizeData(meta) : meta;
    logger.info(message, sanitized);
  },
  
  warn: (message: string, meta?: any) => {
    // Ensure no sensitive data is logged
    if (!meta) {
      logger.warn(message);
      return;
    }
    
    // Deep sanitization with complete removal of sensitive fields
    const sanitized = typeof meta === 'object' ? sanitizeData(meta) : meta;
    
    // Final check - ensure no sensitive patterns remain
    const finalSanitized = JSON.parse(JSON.stringify(sanitized, (key, value) => {
      if (typeof value === 'string' && value.length > 20) {
        // Check for potential secrets/tokens
        if (/^[A-Za-z0-9+/=._-]{40,}$/.test(value) || 
            value.includes('secret') || 
            value.includes('token') ||
            value.includes('key')) {
          return '[REDACTED]';
        }
      }
      return value;
    }));
    
    logger.warn(message, finalSanitized);
  },
  
  error: (message: string, error?: Error | any, meta?: any) => {
    // Build error metadata safely
    let errorData: any = {};
    
    if (error instanceof Error) {
      errorData = {
        message: error.message,
        name: error.name,
        // Only include stack trace in development
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      };
    } else if (error) {
      errorData = sanitizeData(error);
    }
    
    // Sanitize additional metadata
    const additionalMeta = meta ? sanitizeData(meta) : {};
    
    // Combine and perform final sanitization
    const combinedMeta = { error: errorData, ...additionalMeta };
    
    // Final security check - remove any remaining sensitive patterns
    const finalSanitized = JSON.parse(JSON.stringify(combinedMeta, (key, value) => {
      // Remove any key that might contain sensitive info
      if (typeof key === 'string' && 
          SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        return '[REDACTED]';
      }
      
      // Check string values for potential secrets
      if (typeof value === 'string' && value.length > 20) {
        if (/^[A-Za-z0-9+/=._-]{40,}$/.test(value) || 
            /[A-Za-z0-9]{32,}/.test(value) ||
            value.includes('secret') || 
            value.includes('token') ||
            value.includes('password') ||
            value.includes('key')) {
          return '[REDACTED]';
        }
      }
      
      return value;
    }));
    
    logger.error(message, finalSanitized);
  },

  // Special logger for API requests
  api: (req: any, res: any, responseTime: number) => {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: (req as any).user?.userId,
      // Sanitize headers, removing authorization and cookie
      headers: sanitizeData({
        ...req.headers,
        authorization: undefined,
        cookie: undefined
      }),
      // Only log body for non-GET requests, and sanitize it
      body: req.method !== 'GET' ? sanitizeData(req.body) : undefined,
      query: sanitizeData(req.query)
    };

    if (res.statusCode >= 400) {
      logger.error('API Error', logData);
    } else {
      logger.info('API Request', logData);
    }
  },

  // Special logger for security events
  security: (event: string, meta?: any) => {
    logger.warn(`SECURITY: ${event}`, {
      type: 'SECURITY_EVENT',
      event,
      ...sanitizeData(meta)
    });
  },

  // Special logger for audit events
  audit: (action: string, userId: string, meta?: any) => {
    logger.info(`AUDIT: ${action}`, {
      type: 'AUDIT_EVENT',
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...sanitizeData(meta)
    });
  }
};

// Replace console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => log.info(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(sanitizeData(arg)) : arg
  ).join(' '));
  
  console.error = (...args) => log.error(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(sanitizeData(arg)) : arg
  ).join(' '));
  
  console.warn = (...args) => log.warn(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(sanitizeData(arg)) : arg
  ).join(' '));
  
  console.debug = (...args) => log.debug(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(sanitizeData(arg)) : arg
  ).join(' '));
}

export default log;