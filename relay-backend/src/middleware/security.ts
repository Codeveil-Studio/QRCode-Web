import { Request, Response, NextFunction } from 'express';

export const productionSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin') || req.get('Referer');
  const userAgent = req.get('User-Agent') || '';
  
  // Allow health checks and webhooks
  if (req.path === '/health' || req.path.includes('/webhook')) {
    return next();
  }
  
  // Block suspicious user agents (bot protection)
  const suspiciousPatterns = [
    /curl/i, /wget/i, /postman/i, /insomnia/i, /httpie/i,
    /python-requests/i, /axios\/0\./i, /node-fetch/i, /apache-httpclient/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn(`🚨 Blocked suspicious user agent: ${userAgent} from ${req.ip}`);
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied: Automated requests not allowed' 
    });
  }
  
  // Validate origin for browser requests
  if (origin) {
    try {
      const originDomain = new URL(origin).hostname;
      const allowedDomains = ['app.qresolve.io', process.env.PRODUCTION_DOMAIN].filter(Boolean);
      
      if (!allowedDomains.includes(originDomain)) {
        console.warn(`🚨 Blocked unauthorized origin: ${origin} from ${req.ip}`);
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied: Invalid origin' 
        });
      }
    } catch (error) {
      console.warn(`🚨 Invalid origin format: ${origin} from ${req.ip}`);
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied: Invalid origin format' 
      });
    }
  }
  
  next();
};

export const rateLimitByIP = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
  const ipRequests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of ipRequests.entries()) {
      if (now > data.resetTime) {
        ipRequests.delete(ip);
      }
    }
    
    // Get or create entry for this IP
    let ipData = ipRequests.get(clientIP);
    if (!ipData || now > ipData.resetTime) {
      ipData = { count: 0, resetTime: now + windowMs };
      ipRequests.set(clientIP, ipData);
    }
    
    // Check rate limit
    if (ipData.count >= maxRequests) {
      console.warn(`🚨 Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((ipData.resetTime - now) / 1000)
      });
    }
    
    // Increment counter
    ipData.count++;
    
    // Add headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - ipData.count).toString(),
      'X-RateLimit-Reset': new Date(ipData.resetTime).toISOString()
    });
    
    next();
  };
}; 