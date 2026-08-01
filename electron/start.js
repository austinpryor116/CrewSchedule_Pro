const { spawn } = require("child_process");
const http = require("http");

console.log("==================================================");
console.log("🚀 LAUNCHING CREWSCHEDULE PRO ELECTRON DESKTOP");
console.log("   Full Security Header Bypass & Canvas Scraper Engine");
console.log("==================================================\n");

function launchElectron() {
  console.log("[2/2] Launching Electron Desktop Window with Security Bypass...\n");
  const electronApp = spawn("npx", ["electron", "."], {
    stdio: "inherit",
    shell: true,
  });

  electronApp.on("close", (code) => {
    console.log("\nElectron Desktop Window closed.");
    process.exit(code || 0);
  });
}

function checkAndStart() {
  http.get("http://localhost:3000", (res) => {
    console.log("[1/2] Dev Server detected live at http://localhost:3000!");
    launchElectron();
  }).on("error", () => {
    console.log("[1/2] Starting Next.js Dev Server on http://localhost:3000...");
    spawn("npx", ["next", "dev"], { stdio: "inherit", shell: true });
    
    const poll = () => {
      http.get("http://localhost:3000", (res) => {
        launchElectron();
      }).on("error", () => {
        setTimeout(poll, 500);
      });
    };
    setTimeout(poll, 1500);
  });
}

checkAndStart();
