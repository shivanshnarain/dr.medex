const app = require("../../server/index");

module.exports = (req, res) => {
  if (req.query && req.query.path) {
    const rawPath = req.query.path;
    const pathStr = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const queryString = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/admin/${pathStr}${queryString}`;
    req.originalUrl = req.url;
    return app(req, res);
  }

  if (req.url && (req.url.startsWith("/api/admin/") || req.url.startsWith("/admin/"))) {
    return app(req, res);
  }

  const forwarded = req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-matched-path"];
  if (forwarded && (forwarded.startsWith("/api/admin/") || forwarded.startsWith("/admin/"))) {
    req.url = forwarded;
    req.originalUrl = req.url;
    return app(req, res);
  }

  return app(req, res);
};
