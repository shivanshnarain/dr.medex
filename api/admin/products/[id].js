const app = require("../../../server/index");

module.exports = (req, res) => {
  const id = req.query.id;
  const queryIdx = req.url ? req.url.indexOf("?") : -1;
  let queryString = "";
  if (queryIdx !== -1) {
    const sp = new URLSearchParams(req.url.substring(queryIdx));
    sp.delete("id");
    const qs = sp.toString();
    queryString = qs ? `?${qs}` : "";
  }
  req.url = `/api/admin/products/${id}${queryString}`;
  req.originalUrl = req.url;
  return app(req, res);
};
