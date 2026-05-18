const path = require('path');
const { spawnSync } = require('child_process');

process.env.PUPPETEER_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR ||
  path.join(__dirname, '..', '.cache', 'puppeteer');

const cliPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'whatsapp-web.js',
  'node_modules',
  'puppeteer',
  'lib',
  'cjs',
  'puppeteer',
  'node',
  'cli.js'
);

const install = spawnSync(
  process.execPath,
  [cliPath, 'browsers', 'install', 'chrome'],
  {
    stdio: 'inherit',
    env: process.env
  }
);

process.exit(install.status || 0);
