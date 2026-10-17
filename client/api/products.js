const app = require("../server/index");

module.exports = (req, res) => {
  const queryIdx = req.url ? req.url.indexOf("?") : -1;
  const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
  req.url = `/api/products${qs}`;
  req.originalUrl = req.url;
  return app(req, res);
};
