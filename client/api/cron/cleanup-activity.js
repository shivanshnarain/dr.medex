const app = require("../../server/index");

module.exports = (req, res) => {
  req.url = "/api/cron/cleanup-activity";
  req.originalUrl = req.url;
  return app(req, res);
};
