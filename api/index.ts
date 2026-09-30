import app from '../server/src/app';

export default function handler(req: any, res: any) {
  let effectiveUrl = req.url || '/';

  // Handle Vercel rewrites where original requested path is stored in headers
  if (req.headers && typeof req.headers['x-matched-path'] === 'string') {
    effectiveUrl = req.headers['x-matched-path'];
  } else if (req.headers && typeof req.headers['x-forwarded-uri'] === 'string') {
    effectiveUrl = req.headers['x-forwarded-uri'];
  } else if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    effectiveUrl = req.originalUrl;
  }

  // Ensure path starts with /api for Express routing
  if (!effectiveUrl.startsWith('/api')) {
    effectiveUrl = '/api' + (effectiveUrl.startsWith('/') ? effectiveUrl : '/' + effectiveUrl);
  }

  // Preserve query string if not already present
  const queryIndex = (req.url || '').indexOf('?');
  const queryString = queryIndex !== -1 ? (req.url || '').slice(queryIndex) : '';
  if (!effectiveUrl.includes('?') && queryString) {
    effectiveUrl += queryString;
  }

  req.url = effectiveUrl;
  return app(req, res);
}
