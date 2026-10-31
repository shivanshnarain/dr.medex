const locationService = require("../../server/services/locationService");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { lat, lng, acc } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng query parameters are required" });
    }
    const result = await locationService.reverseGeocode(lat, lng, acc);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

