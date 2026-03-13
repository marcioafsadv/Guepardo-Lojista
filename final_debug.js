import fs from 'fs';

const buffer = fs.readFileSync('stores_check.json');
const content = buffer.toString('utf16le');
const cleanContent = content.substring(content.indexOf('['));
const data = JSON.parse(cleanContent);

data.forEach(s => {
    if (s.fantasy_name && s.fantasy_name.includes('Jessica')) {
        console.log('--- Found Jessica ---');
        console.log('Full Record:', JSON.stringify(s, null, 2));
    }
});
