// Run after stopping the development server. Keep production output, local
// settings, database files, browser data and dependencies intact.
const { rmSync } = require('node:fs');
const { resolve } = require('node:path');
rmSync(resolve(__dirname, '../.next-dev'), { recursive: true, force: true });
console.log('Development build cache removed.');
