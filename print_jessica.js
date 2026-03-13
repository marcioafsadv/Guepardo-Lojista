import fs from 'fs';

const buffer = fs.readFileSync('jessica_exact.json');
const content = buffer.toString('utf16le');
const cleanContent = content.substring(content.indexOf('['));
const data = JSON.parse(cleanContent);
console.log(JSON.stringify(data[0], null, 2));
