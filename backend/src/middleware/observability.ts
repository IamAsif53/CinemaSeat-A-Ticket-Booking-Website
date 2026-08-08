import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface MetricsStore {
  totalRequests: number;
  successfulRequests: number;
  conflictCounts: number;
  errorCounts: number;
  activeHolds: number;
  confirmedBookings: number;
  startTime: string;
}

export const metrics: MetricsStore = {
  totalRequests: 0,
  successfulRequests: 0,
  conflictCounts: 0,
  errorCounts: 0,
  activeHolds: 0,
  confirmedBookings: 0,
  startTime: new Date().toISOString()
};

export function getMetricsData() {
  const uptimeSeconds = Math.floor((Date.now() - new Date(metrics.startTime).getTime()) / 1000);
  return {
    status: 'UP',
    service: 'CinemaSeat API',
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
    total_requests: metrics.totalRequests,
    successful_requests: metrics.successfulRequests,
    conflict_counts_409: metrics.conflictCounts,
    error_counts_500: metrics.errorCounts,
    memory_usage_mb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
  };
}

/**
 * Request ID Tracing & Structured Logging Middleware
 */
export function requestTracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  metrics.totalRequests++;
  const startMs = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const statusCode = res.statusCode;

    if (statusCode >= 200 && statusCode < 400) {
      metrics.successfulRequests++;
    } else if (statusCode === 409) {
      metrics.conflictCounts++;
    } else if (statusCode >= 500) {
      metrics.errorCounts++;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: statusCode,
      durationMs,
      userAgent: req.headers['user-agent']
    }));
  });

  next();
}
