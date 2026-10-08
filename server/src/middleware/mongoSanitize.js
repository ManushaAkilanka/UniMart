/**
 * MongoDB Operator Injection Sanitization Middleware
 *
 * Recursively strips keys starting with '$' or containing '.' from req.body, req.query, and req.params.
 * This prevents NoSQL injection attacks where attackers send MongoDB operators (e.g. { "$gt": "" }).
 */

export function hasMongoOperators(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.some(item => hasMongoOperators(item));
  }
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (hasMongoOperators(obj[key])) {
      return true;
    }
  }
  return false;
}

export function sanitize(obj, replaceWith) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitize(obj[i], replaceWith);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      if (replaceWith) {
        const cleanKey = key.replace(/^\$|\./g, replaceWith);
        obj[cleanKey] = sanitize(obj[key], replaceWith);
      }
      delete obj[key];
    } else {
      sanitize(obj[key], replaceWith);
    }
  }
  return obj;
}

export default function mongoSanitize(options = {}) {
  const replaceWith = options.replaceWith;
  return (req, _res, next) => {
    if (req.body) sanitize(req.body, replaceWith);
    if (req.query) sanitize(req.query, replaceWith);
    if (req.params) sanitize(req.params, replaceWith);
    next();
  };
}
