import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const app = require('../../server/index');

export default function handler(req, res) {
  if (req.query && req.query.path) {
    const rawPath = req.query.path;
    const pathStr = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    let queryString = "";
    if (queryIdx !== -1) {
      const sp = new URLSearchParams(req.url.substring(queryIdx));
      sp.delete("path");
      const qs = sp.toString();
      queryString = qs ? `?${qs}` : "";
    }
    req.url = `/api/products/${pathStr}${queryString}`;
    req.originalUrl = req.url;
    return app(req, res);
  }

  if (req.url && req.url.startsWith("/api/products/")) {
    return app(req, res);
  }

  return app(req, res);
}
