const { randomBytes, scryptSync } = require('node:crypto');
if (!process.stdin.isTTY) {
  console.error('Run this command in an interactive terminal. Never paste a password into chat.');
  process.exit(1);
}
process.stdout.write('Choose an admin password (at least 12 characters; input hidden): ');
process.stdin.setRawMode(true);
process.stdin.resume();
let password = '';
process.stdin.on('data', (data) => {
  for (const char of data.toString()) {
    if (char === '\u0003') {
      process.stdin.setRawMode(false);
      process.exit(1);
    }
    if (char === '\r' || char === '\n') {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (password.length < 12 || password.length > 200) {
        console.error('Use 12–200 characters. Run the command again.');
        process.exit(1);
      }
      const salt = randomBytes(16);
      const hash = scryptSync(password, salt, 64).toString('hex');
      console.log(
        'Save the following as ADMIN_PASSWORD_HASH in your hosting environment settings:',
      );
      console.log(`scrypt:${salt.toString('hex')}:${hash}`);
      return;
    }
    if (char === '\u007f' || char === '\b') password = password.slice(0, -1);
    else if (char.charCodeAt(0) >= 32) password += char;
  }
});
