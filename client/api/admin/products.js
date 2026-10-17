const app = require("../../server/index");

module.exports = (req, res) => {
  if (req.url && (req.url.startsWith("/api/admin/products") || req.url.startsWith("/admin/products"))) {
    return app(req, res);
  }

  const forwarded = req.headers && (req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-matched-path"]);
  if (forwarded && (forwarded.startsWith("/api/admin/products") || forwarded.startsWith("/admin/products"))) {
    req.url = forwarded;
    req.originalUrl = req.url;
    return app(req, res);
  }

  const queryIdx = req.url ? req.url.indexOf("?") : -1;
  const pathPart = queryIdx !== -1 ? req.url.substring(0, queryIdx) : req.url;
  const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
  const cleanSubpath = (!pathPart || pathPart === "/") ? "" : (pathPart.startsWith("/") ? pathPart : `/${pathPart}`);
  req.url = `/api/admin/products${cleanSubpath}${qs}`;
  req.originalUrl = req.url;
  return app(req, res);
};
