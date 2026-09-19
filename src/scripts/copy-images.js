const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const srcLogo = path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', '29d1eb8f-ac80-4310-96d3-d79549b3428e', 'education_logo_1774946010339.png');
const srcHero = path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', '29d1eb8f-ac80-4310-96d3-d79549b3428e', 'hero_education_1774946047478.png');

try {
  fs.copyFileSync(srcLogo, path.join(publicDir, 'logo.png'));
  console.log('Copied logo.png');
} catch (e) {
  console.error('Failed to copy logo:', e.message);
}

try {
  fs.copyFileSync(srcHero, path.join(publicDir, 'hero.png'));
  console.log('Copied hero.png');
} catch (e) {
  console.error('Failed to copy hero:', e.message);
}
