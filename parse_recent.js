import fs from 'fs';

// Read file as buffer
const buffer = fs.readFileSync('recent_stores.json');
// Convert from UTF-16LE
const content = buffer.toString('utf16le');
// Some curls might produce weird starting characters, clean them up
const cleanContent = content.substring(content.indexOf('['));

const data = JSON.parse(cleanContent);
data.forEach(s => {
    console.log(`ID: ${s.id} | Fantasy: ${s.fantasy_name} | Company: ${s.company_name} | Address: ${JSON.stringify(s.address)} | Coords: ${s.lat}, ${s.lng}`);
});
