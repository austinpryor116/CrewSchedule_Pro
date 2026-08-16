const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const capConfigPath = path.join(rootDir, 'capacitor.config.ts');

console.log('🔄 Switching Capacitor back to USB Live Dev Mode (http://localhost:3000)...');

const devCapConfig = `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.crewschedule.pro",
  appName: "CrewSchedule Pro",
  webDir: "out",
  server: {
    // Over USB cable with adb reverse port forwarding:
    url: "http://localhost:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
`;

fs.writeFileSync(capConfigPath, devCapConfig, 'utf8');

console.log('🔄 Syncing Capacitor config to Android project...');
execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

console.log('📲 Building and installing Live Dev APK onto connected phone...');
const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat installDebug' : './gradlew installDebug';
execSync(gradlewCmd, {
  cwd: path.join(rootDir, 'android'),
  stdio: 'inherit',
  env: { ...process.env, JAVA_HOME: 'C:\\Users\\austi\\.jdks\\jbr-21.0.11' },
});

const adbPath = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
if (fs.existsSync(adbPath)) {
  execSync(`"${adbPath}" reverse tcp:3000 tcp:3000`, { stdio: 'inherit' });
  execSync(`"${adbPath}" shell am start -n com.crewschedule.pro/.MainActivity`, { stdio: 'inherit' });
}

console.log('✅ Switched to Live Dev Mode! You can develop with hot-reload over USB.');
