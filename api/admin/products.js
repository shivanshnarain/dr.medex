const app = require("../../server/index");

module.exports = (req, res) => {
  const matched = req.headers && (req.headers["x-matched-path"] || req.headers["x-forwarded-uri"]);
  if (matched && (matched.startsWith("/api/admin/products") || matched.startsWith("/admin/products"))) {
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `${matched}${qs}`;
  } else if (req.url && !req.url.startsWith("/api/admin/products") && !req.url.startsWith("/admin/products")) {
    const queryIdx = req.url.indexOf("?");
    const pathPart = queryIdx !== -1 ? req.url.substring(0, queryIdx) : req.url;
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    const cleanSubpath = pathPart === "/" ? "" : (pathPart.startsWith("/") ? pathPart : `/${pathPart}`);
    req.url = `/api/admin/products${cleanSubpath}${qs}`;
  }
  return app(req, res);
};
