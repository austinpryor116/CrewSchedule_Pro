const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const adbPath = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');

console.log('🧹 [FreshDeploy] Step 1: Stopping existing servers & stale processes...');
try {
  if (process.platform === 'win32') {
    execSync('powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' });
  }
} catch (_) {}

console.log('🔄 [FreshDeploy] Step 2: Ensuring USB ADB reverse port forward...');
if (fs.existsSync(adbPath)) {
  try {
    execSync(`"${adbPath}" reverse tcp:3000 tcp:3000`, { stdio: 'inherit' });
    execSync(`"${adbPath}" shell am force-stop com.crewschedule.pro`, { stdio: 'ignore' });
  } catch (err) {
    console.warn('ADB command warning:', err.message);
  }
}

console.log('🚀 [FreshDeploy] Step 3: Launching clean Next.js server...');
const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  shell: true,
  detached: true,
  stdio: 'ignore',
});
devProcess.unref();

// Wait 3 seconds for server spin up
setTimeout(() => {
  if (fs.existsSync(adbPath)) {
    console.log('📲 [FreshDeploy] Step 4: Re-launching app fresh on phone...');
    try {
      execSync(`"${adbPath}" shell am start -n com.crewschedule.pro/.MainActivity`, { stdio: 'inherit' });
      console.log('✅ [FreshDeploy] App successfully restarted fresh on physical device!');
    } catch (e) {
      console.error('Failed to start activity:', e.message);
    }
  }
  process.exit(0);
}, 3000);
