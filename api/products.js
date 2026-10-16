const app = require("../server/index");

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api/products") && !req.url.startsWith("/products")) {
    const queryIdx = req.url.indexOf("?");
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/products${qs}`;
  }
  return app(req, res);
};
