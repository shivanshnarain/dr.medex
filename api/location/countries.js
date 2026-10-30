const locationService = require("../../server/services/locationService");

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const countries = locationService.getAllCountries();
    return res.status(200).json({ success: true, count: countries.length, countries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
