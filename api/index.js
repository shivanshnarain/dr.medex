const app = require("../server/index");

module.exports = (req, res) => {
  const originalPath = req.headers["x-matched-path"] || req.headers["x-forwarded-uri"] || req.headers["x-now-route-matches"];
  if (originalPath && (!req.url || req.url === "/" || req.url === "/api" || req.url === "/api/")) {
    req.url = originalPath;
  }
  return app(req, res);
};
