import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'Asian@2026';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log(`\nPassword: ${password}`);
console.log(`Bcrypt Hash: ${hash}\n`);
console.log(`Add this to your .env or Render Environment Variables:`);
console.log(`ADMIN_PASSWORD_HASH='${hash}'\n`);
