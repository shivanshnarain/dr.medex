const app = require("../../server/index");

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api/admin/login") && !req.url.startsWith("/admin/login")) {
    req.url = "/api/admin/login";
  }
  return app(req, res);
};
