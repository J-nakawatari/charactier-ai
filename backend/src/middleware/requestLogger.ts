import { Request, Response, NextFunction } from 'express';
import log from '../utils/logger';

interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request logging middleware
 * Logs all incoming requests and their responses with proper sanitization
 */
export const requestLoggingMiddleware = (
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Skip logging for health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Generate request ID for tracing
  req.requestId = generateRequestId();
  req.startTime = Date.now();

  // Log incoming request
  log.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture response
  const originalSend = res.send;
  const originalJson = res.json;

  // Override send method
  res.send = function(body) {
    res.locals.body = body;
    logResponse(req, res);
    return originalSend.call(this, body);
  };

  // Override json method
  res.json = function(body) {
    res.locals.body = body;
    logResponse(req, res);
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Log the response details
 */
function logResponse(req: LoggedRequest, res: Response): void {
  const responseTime = Date.now() - (req.startTime || Date.now());
  
  const logData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime,
    userId: (req as any).user?.userId
  };

  // Log based on status code
  if (res.statusCode >= 500) {
    log.error('Server error response', undefined, logData);
  } else if (res.statusCode >= 400) {
    log.warn('Client error response', logData);
  } else {
    log.info('Request completed', logData);
  }

  // Use the structured API logger for detailed logging
  log.api(req, res, responseTime);
}

/**
 * Security audit logging middleware
 * Logs security-relevant events
 */
export const securityAuditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/admin',
    '/api/purchase',
    '/webhook'
  ];

  // Check if this is a security-relevant endpoint
  const isSecurityEvent = securityEvents.some(path => 
    req.path.startsWith(path)
  );

  if (isSecurityEvent) {
    // Log security event
    log.security(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.userId,
      // Only log specific security-relevant data
      action: req.path.split('/').pop(),
      timestamp: new Date().toISOString()
    });
  }

  // For admin endpoints, add audit logging
  if (req.path.startsWith('/api/admin') && (req as any).user) {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body) {
      if (res.statusCode < 400) {
        log.audit(`Admin action: ${req.method} ${req.path}`, (req as any).user.userId, {
          adminEmail: (req as any).user.email,
          targetResource: req.params.id || 'N/A'
        });
      }
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      if (res.statusCode < 400) {
        log.audit(`Admin action: ${req.method} ${req.path}`, (req as any).user.userId, {
          adminEmail: (req as any).user.email,
          targetResource: req.params.id || 'N/A'
        });
      }
      return originalJson.call(this, body);
    };
  }

  next();
};