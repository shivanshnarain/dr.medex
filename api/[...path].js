const app = require("../server/index");

module.exports = (req, res) => {
  if (req.url && req.url.includes("[...path]")) {
    const rawPath = req.query?.path;
    const pathStr = Array.isArray(rawPath) ? rawPath.join("/") : (rawPath || "");
    const queryIdx = req.url.indexOf("?");
    const queryString = queryIdx !== -1 ? req.url.substring(queryIdx) : "";
    req.url = `/api/${pathStr}${queryString}`;
  }
  return app(req, res);
};
