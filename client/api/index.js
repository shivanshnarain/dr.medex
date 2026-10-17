const app = require("../server/index");

module.exports = (req, res) => {
  req.url = "/api";
  req.originalUrl = "/api";
  return app(req, res);
};
