const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Targets: Direct Google Drive cloud folder + Desktop OneDrive sync folder
const TARGET_DIRS = [
  'G:\\My Drive\\Apex Hospitality Holdings - Envoy App Codebase & Development Hub\\CrewSchedule_Pro',
  'C:\\Users\\austi\\OneDrive\\Desktop\\Apex\\CrewSchedule_Pro'
];

console.log('🚀 Starting Google Drive Backup for CrewSchedule Pro...');
console.log(`Source: ${PROJECT_ROOT}`);

// Helper to recursively copy directories while excluding heavy/temp folders
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    const baseName = path.basename(src);
    if (
      baseName === 'node_modules' ||
      baseName === '.next' ||
      baseName === '.git' ||
      baseName === 'dist' ||
      baseName === 'out' ||
      baseName === '.tempmediaStorage' ||
      baseName === '.gemini'
    ) {
      return;
    }

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else if (stats.isFile()) {
    const baseName = path.basename(src);
    if (
      baseName === 'decs_debug.log' ||
      baseName.endsWith('.log') ||
      baseName.endsWith('.tmp')
    ) {
      return;
    }
    fs.copyFileSync(src, dest);
  }
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const zipFileName = `CrewSchedule_Pro_${timestamp}.zip`;

for (const targetDir of TARGET_DIRS) {
  try {
    console.log(`\n📍 Processing target: ${targetDir}`);
    const latestSourceDir = path.join(targetDir, 'latest_source');
    const archivesDir = path.join(targetDir, 'archives');

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    if (!fs.existsSync(latestSourceDir)) fs.mkdirSync(latestSourceDir, { recursive: true });
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });

    console.log('📦 Updating latest source tree...');
    copyRecursive(PROJECT_ROOT, latestSourceDir);

    const zipFilePath = path.join(archivesDir, zipFileName);
    console.log(`🗜️ Creating timestamped archive: ${zipFileName}...`);

    const psCommand = `powershell -Command "Compress-Archive -Path '${latestSourceDir}\\*' -DestinationPath '${zipFilePath}' -Force"`;
    execSync(psCommand, { stdio: 'ignore' });
    console.log(`✅ Backup successfully saved to: ${targetDir}`);
  } catch (err) {
    console.error(`⚠️ Error backing up to ${targetDir}:`, err.message);
  }
}

console.log('\n🎉 Backup cycle completed for all Google Drive targets!');
