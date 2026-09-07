const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const webDistDir = path.resolve(rootDir, 'apps/web/dist');
const serverDistDir = path.resolve(rootDir, 'apps/server/dist');
const serverDir = path.resolve(rootDir, 'apps/server');
const uploadsDir = path.resolve(rootDir, 'public/uploads');

const outputFrontendZip = path.resolve(rootDir, 'frontend_build.zip');
const outputBackendZip = path.resolve(rootDir, 'backend_build.zip');
const outputUploadsZip = path.resolve(rootDir, 'uploads.zip');

function zipDirectory(sourceDir, zipPath) {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const isWin = process.platform === 'win32';
  if (isWin) {
    const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
  } else {
    // macOS / Linux native zip - includes hidden files like .htaccess
    const cmd = `cd "${sourceDir}" && zip -r -q "${zipPath}" . -x "*.DS_Store"`;
    execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
  }
}

console.log('====================================================');
console.log('🚀 Building EduForge Production Archives for cPanel');
console.log('====================================================\n');

// 1. Build Shared package
console.log('=== [1/4] Building @eduforge/shared Types & Models ===');
execSync('npm run build --workspace=packages/shared', { cwd: rootDir, stdio: 'inherit' });

// 2. Build Web Frontend
console.log('\n=== [2/4] Building @eduforge/web Production Bundle ===');
execSync('npm run build --workspace=apps/web', {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_BASE_URL: 'https://eduforge.haegl.in/api' }
});


// Ensure frontend dist is clean of heavy uploads directory (backend handles serving /uploads)
const distUploadsDir = path.resolve(webDistDir, 'uploads');
if (fs.existsSync(distUploadsDir)) {
  fs.rmSync(distUploadsDir, { recursive: true, force: true });
}


// Ensure .htaccess is in web dist
const publicHtaccess = path.resolve(rootDir, 'apps/web/public/.htaccess');
const distHtaccess = path.resolve(webDistDir, '.htaccess');
if (fs.existsSync(publicHtaccess)) {
  fs.copyFileSync(publicHtaccess, distHtaccess);
}

// 3. Bundle Server into Standalone JS
console.log('\n=== [3/4] Bundling @eduforge/server Standalone Bundle ===');
if (fs.existsSync(serverDistDir)) {
  fs.rmSync(serverDistDir, { recursive: true, force: true });
}
fs.mkdirSync(serverDistDir, { recursive: true });

execSync(
  'npx -y esbuild apps/server/src/server.ts --bundle --platform=node --target=node22 --outfile=apps/server/dist/server.js',
  { cwd: rootDir, stdio: 'inherit' }
);

// Production package.json for backend
const prodPkg = {
  name: "eduforge-api",
  version: "1.0.0",
  private: true,
  main: "server.js",
  scripts: {
    start: "node server.js"
  }
};
fs.writeFileSync(path.resolve(serverDistDir, 'package.json'), JSON.stringify(prodPkg, null, 2));

// Production .env template for cPanel backend
const prodEnvContent = `# cPanel Production Environment Configuration
# PORT is dynamically assigned by cPanel Phusion Passenger
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=agrikart_EduForge_user
DB_PASSWORD=EduForge@2026
DB_NAME=agrikart_EduForge_db
`;
fs.writeFileSync(path.resolve(serverDistDir, '.env'), prodEnvContent);

// Ensure backend has public/uploads directory structure
const serverUploadsDir = path.resolve(serverDistDir, 'public/uploads');
fs.mkdirSync(serverUploadsDir, { recursive: true });

// Production .htaccess for cPanel Phusion Passenger / LiteSpeed
const backendHtaccessContent = `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/agrikart/eduforge.haegl.in/api"
PassengerBaseURI "/api"
PassengerNodejs "/home/agrikart/nodevenv/eduforge.haegl.in/api/22/bin/node"
PassengerAppType node
PassengerStartupFile server.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

# Protect sensitive environment and configuration files
<FilesMatch "^(\\.env|package\\.json|package-lock\\.json)$">
    Order allow,deny
    Deny from all
</FilesMatch>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>
`;
fs.writeFileSync(path.resolve(serverDistDir, '.htaccess'), backendHtaccessContent);


// 4. Create ZIP Archives
console.log('\n=== [4/4] Creating ZIP Archives ===');

// Compress Frontend
zipDirectory(webDistDir, outputFrontendZip);
const frontendSizeMb = (fs.statSync(outputFrontendZip).size / (1024 * 1024)).toFixed(2);
console.log(`✓ frontend_build.zip created (${frontendSizeMb} MB)`);

// Compress Backend (Code & Config only)
zipDirectory(serverDistDir, outputBackendZip);
const backendSizeMb = (fs.statSync(outputBackendZip).size / (1024 * 1024)).toFixed(2);
console.log(`✓ backend_build.zip created (${backendSizeMb} MB)`);

// Compress Image Assets separately
if (fs.existsSync(uploadsDir)) {
  zipDirectory(uploadsDir, outputUploadsZip);
  const uploadsSizeMb = (fs.statSync(outputUploadsZip).size / (1024 * 1024)).toFixed(2);
  console.log(`✓ uploads.zip created (${uploadsSizeMb} MB)`);
}

console.log('\n====================================================');
console.log('✅ CPANEL PRODUCTION BUILDS GENERATED SUCCESSFULLY!');
console.log('====================================================');
console.log(`1. Frontend ZIP: ${outputFrontendZip} (${frontendSizeMb} MB)`);
console.log(`2. Backend ZIP:  ${outputBackendZip} (${backendSizeMb} MB)`);
if (fs.existsSync(outputUploadsZip)) {
  const uploadsSizeMb = (fs.statSync(outputUploadsZip).size / (1024 * 1024)).toFixed(2);
  console.log(`3. Uploads ZIP:  ${outputUploadsZip} (${uploadsSizeMb} MB)`);
}
console.log('====================================================\n');
