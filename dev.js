const { spawn } = require("child_process");
const path = require("path");

console.log("\x1b[36m%s\x1b[0m", "===============================================================");
console.log("\x1b[36m%s\x1b[0m", "  Starting DR.MEDEX Global Fullstack Development Environment   ");
console.log("\x1b[36m%s\x1b[0m", "  - Backend API: http://localhost:4000                         ");
console.log("\x1b[36m%s\x1b[0m", "  - Frontend UI: http://localhost:5173                         ");
console.log("\x1b[36m%s\x1b[0m", "===============================================================\n");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

// Spawn backend server
const server = spawn(process.execPath, [path.join(__dirname, "server/index.js")], {
  cwd: __dirname,
  env: { ...process.env },
  stdio: ["inherit", "pipe", "pipe"],
});

// Spawn frontend Vite dev server
const client = spawn(npmCmd, ["run", "dev"], {
  cwd: path.join(__dirname, "client"),
  env: { ...process.env },
  stdio: ["inherit", "pipe", "pipe"],
});

function pipeOutput(stream, prefix, colorCode) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // Keep unfinished line
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line}`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer.trim().length > 0) {
      console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${buffer}`);
    }
  });
}

pipeOutput(server.stdout, "server", "32"); // Green
pipeOutput(server.stderr, "server", "31"); // Red
pipeOutput(client.stdout, "client", "34"); // Blue
pipeOutput(client.stderr, "client", "33"); // Yellow

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("\n\x1b[33m%s\x1b[0m", "Shutting down DR.MEDEX Global development processes...");

  try {
    if (server && !server.killed) {
      server.kill("SIGINT");
    }
  } catch (e) {}

  try {
    if (client && !client.killed) {
      client.kill("SIGINT");
    }
  } catch (e) {}

  setTimeout(() => {
    try {
      if (server && !server.killed) server.kill("SIGKILL");
      if (client && !client.killed) client.kill("SIGKILL");
    } catch (e) {}
    process.exit(0);
  }, 1000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("close", (code) => {
  if (!isShuttingDown && code !== 0 && code !== null) {
    console.error(`\x1b[31m[server] Process exited with code ${code}\x1b[0m`);
  }
});

client.on("close", (code) => {
  if (!isShuttingDown && code !== 0 && code !== null) {
    console.error(`\x1b[31m[client] Process exited with code ${code}\x1b[0m`);
  }
});
