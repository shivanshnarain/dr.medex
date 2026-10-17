import fs from 'node:fs';
import path from 'node:path';

export default function handler(req, res) {
  try {
    const cwd = process.cwd();
    let clientFiles = [];
    try {
      clientFiles = fs.readdirSync(path.join(cwd, 'client'));
    } catch (e) {
      clientFiles = [e.message];
    }
    
    let rootFiles = [];
    try {
      rootFiles = fs.readdirSync('/var/task');
    } catch (e) {
      rootFiles = [e.message];
    }

    res.status(200).json({
      ok: true,
      cwd,
      rootFiles,
      clientFiles,
      nodeVersion: process.version
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
