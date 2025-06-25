import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define sensitive fields that should be sanitized
const SENSITIVE_FIELDS = [
  'password',
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
  'bankAccount'
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
      // Check for patterns that look like tokens or secrets
      if (value.length > 20 && /^[A-Za-z0-9+/=._-]+$/.test(value)) {
        // Might be a token, show only first and last 4 characters
        sanitized[key] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
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
    logger.debug(message, sanitizeData(meta));
  },
  
  info: (message: string, meta?: any) => {
    logger.info(message, sanitizeData(meta));
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, sanitizeData(meta));
  },
  
  error: (message: string, error?: Error | any, meta?: any) => {
    const errorMeta = error instanceof Error ? {
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        name: error.name
      },
      ...sanitizeData(meta)
    } : sanitizeData({ error, ...meta });
    
    logger.error(message, errorMeta);
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