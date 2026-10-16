const app = require("../../server/index");

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api/admin/me") && !req.url.startsWith("/admin/me")) {
    req.url = "/api/admin/me";
  }
  return app(req, res);
};
