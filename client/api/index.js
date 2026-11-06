const app = require("../server/index");

module.exports = (req, res) => {
  // If req.url is already a valid full API path
  if (req.url && !req.url.startsWith("/api/index.js") && !req.url.startsWith("/api/[...path]") && !req.url.startsWith("/index.js") && (req.url.startsWith("/api/") || req.url.startsWith("/admin/"))) {
    return app(req, res);
  }

  // Handle __subpath rewritten by vercel.json: /api/(.*) -> /api/index.js?__subpath=$1
  if (req.query && req.query.__subpath) {
    const rawSubpath = Array.isArray(req.query.__subpath) ? req.query.__subpath.join("/") : req.query.__subpath;
    const cleanSubpath = rawSubpath.startsWith("/") ? rawSubpath : `/${rawSubpath}`;
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    let qs = "";
    if (queryIdx !== -1) {
      const sp = new URLSearchParams(req.url.substring(queryIdx));
      sp.delete("__subpath");
      const qsStr = sp.toString();
      qs = qsStr ? `?${qsStr}` : "";
    }
    req.url = `/api${cleanSubpath}${qs}`;
    req.originalUrl = req.url;
    return app(req, res);
  }

  // Handle catch-all parameter if routed via [...path]
  if (req.query && req.query.path) {
    const rawPath = req.query.path;
    const pathStr = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/${pathStr}${qs}`;
    req.originalUrl = req.url;
    return app(req, res);
  }

  // Forwarded header checks
  const forwarded = req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-matched-path"];
  if (forwarded && (forwarded.startsWith("/api/") || forwarded.startsWith("/admin/"))) {
    req.url = forwarded;
    req.originalUrl = req.url;
    return app(req, res);
  }

  // Check x-now-route-matches
  const routeMatches = req.headers["x-now-route-matches"];
  if (routeMatches) {
    const match = routeMatches.match(/1=([^&]+)/);
    if (match) {
      const captured = decodeURIComponent(match[1]);
      const cleanCaptured = captured.startsWith("/") ? captured : `/${captured}`;
      const queryIdx = req.url ? req.url.indexOf("?") : -1;
      const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
      req.url = `/api${cleanCaptured}${qs}`;
    req.originalUrl = req.url;
      return app(req, res);
    }
  }

  return app(req, res);
};
