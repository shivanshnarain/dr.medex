const app = require("../server/index");

module.exports = (req, res) => {
  if (req.query && req.query.path) {
    const rawPath = req.query.path;
    const pathStr = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const queryString = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/${pathStr}${queryString}`;
    req.originalUrl = req.url;
    return app(req, res);
  }

  if (req.url && (req.url.startsWith("/api/") || req.url.startsWith("/admin/"))) {
    return app(req, res);
  }

  const forwarded = req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-matched-path"];
  if (forwarded && (forwarded.startsWith("/api/") || forwarded.startsWith("/admin/"))) {
    req.url = forwarded;
    req.originalUrl = req.url;
    return app(req, res);
  }

  const originalPath = req.headers["x-matched-path"];
  if (originalPath && !originalPath.includes("[...path]") && (originalPath.startsWith("/api/") || originalPath.startsWith("/admin/"))) {
    req.url = originalPath;
  }

  return app(req, res);
};
