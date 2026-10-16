const app = require("../server/index");

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api/categories") && !req.url.startsWith("/categories")) {
    const queryIdx = req.url.indexOf("?");
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/categories${qs}`;
  }
  return app(req, res);
};
