const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'src', 'app', 'api');
const fallbackDir = path.join(rootDir, 'src', 'app', '[...proxyFallback]');

const backupBaseDir = path.resolve(rootDir, '..', '.crewschedule_temp_build_stash');
const apiBackupDir = path.join(backupBaseDir, 'api');
const fallbackBackupDir = path.join(backupBaseDir, '[...proxyFallback]');

const capConfigPath = path.join(rootDir, 'capacitor.config.ts');

console.log('🚀 Starting Standalone Offline APK Build for CrewSchedule Pro...');

if (!fs.existsSync(backupBaseDir)) {
  fs.mkdirSync(backupBaseDir, { recursive: true });
}

try {
  // 1. Stash dynamic server Route Handlers completely outside project root so TypeScript / Next.js doesn't type-check them
  if (fs.existsSync(apiDir)) {
    console.log('📦 Stashing API routes outside project root...');
    fs.renameSync(apiDir, apiBackupDir);
  }
  if (fs.existsSync(fallbackDir)) {
    console.log('📦 Stashing proxy fallback route outside project root...');
    fs.renameSync(fallbackDir, fallbackBackupDir);
  }

  // 2. Set capacitor.config.ts to standalone mode (no localhost server.url)
  console.log('⚙️ Configuring Capacitor for Standalone Offline mode...');
  const standaloneCapConfig = `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.crewschedule.pro",
  appName: "CrewSchedule Pro",
  webDir: "out",
  overrideUserAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  android: {
    allowMixedContent: true,
    backgroundColor: "#0A192F",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
`;
  fs.writeFileSync(capConfigPath, standaloneCapConfig, 'utf8');

  // 3. Clear .next cache and run Next.js static export build
  console.log('🧹 Clearing stale .next build cache...');
  fs.rmSync(path.join(rootDir, '.next'), { recursive: true, force: true });

  console.log('🔨 Building Next.js static export bundle (output: "export")...');
  execSync('npx next build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NEXT_EXPORT: 'true' },
  });

  // 4. Sync web assets into Android project
  console.log('📲 Syncing assets to Android native container via Capacitor...');
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

  // 5. Build Android standalone APK
  console.log('📦 Compiling Standalone Android APK with Gradle (Java 21)...');
  const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat assembleDebug' : './gradlew assembleDebug';
  execSync(gradlewCmd, {
    cwd: path.join(rootDir, 'android'),
    stdio: 'inherit',
    env: { ...process.env, JAVA_HOME: 'C:\\Users\\austi\\.jdks\\jbr-21.0.11' },
  });

  // 6. Copy output APK to project root
  const builtApkPath = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const targetApkPath = path.join(rootDir, 'CrewSchedule-Pro-Standalone.apk');
  if (fs.existsSync(builtApkPath)) {
    fs.copyFileSync(builtApkPath, targetApkPath);
    console.log(`\n🎉 STANDALONE APK READY: ${targetApkPath}`);
  }

  // 7. Install onto connected Android device if available
  try {
    const adbPath = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
    if (fs.existsSync(adbPath)) {
      console.log('📲 Installing Standalone APK onto connected Samsung Galaxy device...');
      execSync(`"${adbPath}" install -r "${targetApkPath}"`, { stdio: 'inherit' });
      execSync(`"${adbPath}" shell am start -n com.crewschedule.pro/.MainActivity`, { stdio: 'inherit' });
      console.log('✅ Installed & launched standalone app on your phone!');
    }
  } catch (e) {
    console.log('ℹ️ Phone not connected via USB or install skipped:', e.message);
  }

} catch (error) {
  console.error('❌ Build failed:', error);
} finally {
  // Always restore dynamic server routes so dev server works normally
  if (fs.existsSync(apiBackupDir)) {
    console.log('🔄 Restoring API routes for development...');
    fs.renameSync(apiBackupDir, apiDir);
  }
  if (fs.existsSync(fallbackBackupDir)) {
    console.log('🔄 Restoring proxy fallback route...');
    fs.renameSync(fallbackBackupDir, fallbackDir);
  }
  if (fs.existsSync(backupBaseDir)) {
    try { fs.rmdirSync(backupBaseDir); } catch {}
  }
}
