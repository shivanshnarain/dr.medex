const app = require("../server/index");

module.exports = (req, res) => {
  const matched = req.headers && (req.headers["x-matched-path"] || req.headers["x-forwarded-uri"]);
  if (matched && (matched.startsWith("/api/categories") || matched.startsWith("/categories"))) {
    const queryIdx = req.url ? req.url.indexOf("?") : -1;
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `${matched}${qs}`;
  } else if (req.url && !req.url.startsWith("/api/categories") && !req.url.startsWith("/categories")) {
    const queryIdx = req.url.indexOf("?");
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/categories${qs}`;
  }
  return app(req, res);
};
