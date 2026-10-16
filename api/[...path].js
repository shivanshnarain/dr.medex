const app = require("../server/index");

module.exports = (req, res) => {
  const originalPath = req.headers["x-matched-path"] || req.headers["x-forwarded-uri"];
  if (originalPath) {
    req.url = originalPath;
  } else if (req.query && req.query.path) {
    const rawPath = req.query.path;
    const pathStr = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const queryString = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/${pathStr}${queryString}`;
  }
  return app(req, res);
};
