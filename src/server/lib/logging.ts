import { Request, Response, NextFunction } from 'express';

export interface LogContext {
  method: string;
  url: string;
  userId?: string | undefined;
  userAgent?: string | undefined;
  ip?: string | undefined;
  timestamp: string;
}

export interface LogEntry extends LogContext {
  statusCode?: number;
  duration?: number;
  error?: string;
}

interface ExtendedRequest extends Request {
  userId?: string;
}

/**
 * Creates a standardized log entry for API requests
 */
export function createLogContext(req: ExtendedRequest): LogContext {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

  return {
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.userId, // Will be set by authentication middleware if available
    userAgent: req.get('User-Agent') || undefined,
    ip,
    timestamp,
  };
}

/**
 * Logs an incoming API request
 */
export function logRequest(req: ExtendedRequest): void {
  const context = createLogContext(req);
  console.log(`API REQUEST: ${context.method} ${context.url}`, {
    userId: context.userId || 'anonymous',
    userAgent: context.userAgent?.substring(0, 100), // Truncate long user agents
    ip: context.ip,
    timestamp: context.timestamp,
  });
}

/**
 * Logs an API response with timing and status
 */
export function logResponse(
  req: ExtendedRequest,
  res: Response,
  startTime: number,
  error?: Error
): void {
  const duration = Date.now() - startTime;
  const context = createLogContext(req);

  const logEntry: LogEntry = {
    ...context,
    statusCode: res.statusCode,
    duration,
  };

  if (error) {
    logEntry.error = error.message || String(error);
  }

  const status = logEntry.statusCode || 200; // Default to 200 if statusCode is undefined

  console.log(`API RESPONSE: ${context.method} ${context.url} - ${status} (${duration}ms)`, {
    userId: context.userId || 'anonymous',
    duration: `${duration}ms`,
    statusCode: status,
    ...(error && { error: logEntry.error }),
  });
}

/**
 * Express middleware that logs all API requests and responses
 */
export function apiLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const extendedReq = req as ExtendedRequest;

  // Log the incoming request
  logRequest(extendedReq);

  let responseFinished = false;

  // Handle response finish event
  res.on('finish', () => {
    if (!responseFinished) {
      responseFinished = true;
      logResponse(extendedReq, res, startTime);
    }
  });

  // Handle errors
  res.on('error', (error) => {
    if (!responseFinished) {
      responseFinished = true;
      logResponse(extendedReq, res, startTime, error);
    }
  });

  next();
}

/**
 * Helper function to log route-specific information within handlers
 */
export function logRouteInfo(routeName: string, additionalData?: Record<string, unknown>): void {
  console.log(`ROUTE: ${routeName}`, additionalData || {});
}

/**
 * Helper function to log errors with context
 */
export function logError(
  routeName: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`ERROR in ${routeName}:`, {
    message: errorMessage,
    ...(errorStack && { stack: errorStack }),
    ...context,
  });
}
