import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const app = require('../server/index');

export default function handler(req, res) {
  req.url = "/api";
  req.originalUrl = "/api";
  return app(req, res);
}
