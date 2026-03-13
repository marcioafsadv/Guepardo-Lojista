import fs from 'fs';

const buffer = fs.readFileSync('stores_check.json');
const content = buffer.toString('utf16le');
const cleanContent = content.substring(content.indexOf('['));
const data = JSON.parse(cleanContent);

const jessica = data.find(s => s.id === 'fac5a0c7-8761-4c17-9913-903ed118742b');

if (jessica) {
    console.log('--- FINAL STATE ---');
    console.log(JSON.stringify(jessica, null, 2));
} else {
    console.log('Jessica not found.');
}
