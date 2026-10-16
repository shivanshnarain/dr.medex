const app = require("../../server/index");

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api/admin/dashboard") && !req.url.startsWith("/admin/dashboard")) {
    const queryIdx = req.url.indexOf("?");
    const qs = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/admin/dashboard${qs}`;
  }
  return app(req, res);
};
