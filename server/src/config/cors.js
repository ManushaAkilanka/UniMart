import { ENV } from './env.js';

const ipv4Octet = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const privateNetworkOrigin = new RegExp(
  `^http://(?:192\\.168\\.${ipv4Octet}\\.${ipv4Octet}|10\\.${ipv4Octet}\\.${ipv4Octet}\\.${ipv4Octet}|172\\.(?:1[6-9]|2\\d|3[01])\\.${ipv4Octet}\\.${ipv4Octet}):5173$`
);

export const allowedOrigins = [
  ENV.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...ENV.ALLOWED_ORIGINS,
].filter(Boolean);

export const isAllowedOrigin = (origin) =>
  allowedOrigins.includes(origin) ||
  (ENV.NODE_ENV !== 'production' && privateNetworkOrigin.test(origin));
