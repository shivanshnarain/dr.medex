const app = require("../../../server/index");

module.exports = (req, res) => {
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
    req.url = `/api/admin/products/${pathStr}${queryString}`;
    req.originalUrl = req.url;
    return app(req, res);
  }

  if (req.url && (req.url.startsWith("/api/admin/products/") || req.url.startsWith("/admin/products/"))) {
    return app(req, res);
  }

  const forwarded = req.headers && (req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-matched-path"]);
  if (forwarded && (forwarded.startsWith("/api/admin/products/") || forwarded.startsWith("/admin/products/"))) {
    req.url = forwarded;
    req.originalUrl = req.url;
    return app(req, res);
  }

  return app(req, res);
};
