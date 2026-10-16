const app = require("../../server/index");

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api/admin/products") && !req.url.startsWith("/admin/products")) {
    const queryIdx = req.url.indexOf("?");
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/admin/products${qs}`;
  }
  return app(req, res);
};
