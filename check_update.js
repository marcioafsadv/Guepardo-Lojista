import fs from 'fs';

const data = JSON.parse(fs.readFileSync('jessica_exact.json', 'utf8'));
const s = data[0];
console.log('--- Current Data ---');
console.log('ID:', s.id);
console.log('Fantasy:', s.fantasy_name);
console.log('Address:', JSON.stringify(s.address, null, 2));
console.log('Lat:', s.lat);
console.log('Lng:', s.lng);
