import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export default function handler(req, res) {
  res.status(200).json({ ok: true, createRequireWorked: typeof require === 'function' });
}
