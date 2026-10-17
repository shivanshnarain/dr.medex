const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const cwd = process.cwd();
    const dir = __dirname;
    let parentFiles = [];
    try {
      parentFiles = fs.readdirSync(path.join(cwd, '..'));
    } catch (e) {
      parentFiles = [e.message];
    }
    let cwdFiles = [];
    try {
      cwdFiles = fs.readdirSync(cwd);
    } catch (e) {
      cwdFiles = [e.message];
    }

    res.status(200).json({
      ok: true,
      cwd,
      dir,
      parentFiles,
      cwdFiles,
      env: {
        hasMongo: !!process.env.MONGODB_URI,
        hasCloudinary: !!process.env.CLOUDINARY_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasAdminToken: !!process.env.ADMIN_TOKEN,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
