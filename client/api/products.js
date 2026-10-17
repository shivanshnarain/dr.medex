import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export default function handler(req, res) {
  try {
    const app = require('../server/index');
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/products${qs}`;
    req.originalUrl = req.url;
    return app(req, res);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
}
