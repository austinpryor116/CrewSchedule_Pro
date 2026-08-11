const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

console.log("==================================================");
console.log("🚀 LAUNCHING CREWSCHEDULE PRO ELECTRON DESKTOP");
console.log("   Full Security Header Bypass & Canvas Scraper Engine");
console.log("==================================================\n");

const isWin = process.platform === "win32";
const cwd = process.cwd();
const electronBin = isWin
  ? path.join(cwd, "node_modules", ".bin", "electron.cmd")
  : path.join(cwd, "node_modules", ".bin", "electron");
const nextBin = isWin
  ? path.join(cwd, "node_modules", ".bin", "next.cmd")
  : path.join(cwd, "node_modules", ".bin", "next");

function killStalePort(port) {
  try {
    if (isWin) {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a >nul 2>&1`, { stdio: "ignore" });
    }
  } catch (e) {}
}

let electronLaunched = false;
function launchElectron() {
  if (electronLaunched) return;
  electronLaunched = true;

  console.log("\n[2/2] Launching Electron Desktop Window...\n");
  const electronApp = spawn(electronBin, ["."], {
    cwd: cwd,
    stdio: "inherit",
    shell: isWin,
  });

  electronApp.on("close", (code) => {
    console.log("\nElectron Desktop Window closed.");
    process.exit(code || 0);
  });
}

function checkPort(port, callback) {
  const req = http.get({ host: "127.0.0.1", port: port, path: "/", timeout: 4000 }, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 500) {
      callback(true);
    } else {
      callback(false);
    }
  });
  req.on("error", () => callback(false));
  req.on("timeout", () => {
    req.destroy();
    callback(false);
  });
}

function pollAndLaunch() {
  console.log("[1/2] Waiting for local server on http://127.0.0.1:3000 to be ready...");
  let attempts = 0;
  const maxAttempts = 60;
  const poll = () => {
    if (electronLaunched) return;
    attempts++;
    checkPort(3000, (isReady) => {
      if (electronLaunched) return;
      if (isReady) {
        console.log("[1/2] CrewSchedule Pro server ready!");
        launchElectron();
      } else if (attempts < maxAttempts) {
        setTimeout(poll, 400);
      } else {
        console.log("[1/2] Timeout waiting for server response, launching window anyway...");
        launchElectron();
      }
    });
  };
  poll();
}

function start() {
  checkPort(3000, (isLive) => {
    if (isLive) {
      console.log("[1/2] Server detected live at http://127.0.0.1:3000!");
      launchElectron();
    } else {
      const hasBuild = fs.existsSync(path.join(cwd, ".next", "BUILD_ID"));
      killStalePort(3000);

      setTimeout(() => {
        if (hasBuild) {
          console.log("[1/2] Launching Production Server (next start) on http://127.0.0.1:3000...");
          spawn(nextBin, ["start", "-p", "3000", "-H", "127.0.0.1"], { cwd: cwd, stdio: "inherit", shell: isWin });
        } else {
          console.log("[1/2] Launching Dev Server (next dev) on http://127.0.0.1:3000...");
          spawn(nextBin, ["dev", "-p", "3000", "-H", "127.0.0.1"], { cwd: cwd, stdio: "inherit", shell: isWin });
        }
        pollAndLaunch();
      }, 400);
    }
  });
}

start();

