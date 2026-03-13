import fs from 'fs';

const buffer = fs.readFileSync('jessica_refined_coords.json');
const content = buffer.toString('utf16le');
const cleanContent = content.substring(content.indexOf('{'));
const data = JSON.parse(cleanContent);

if (data.features && data.features.length > 0) {
    const f = data.features[0];
    console.log('--- REFINED COORDS ---');
    console.log('Place Name:', f.place_name);
    console.log('Coords:', f.geometry.coordinates); // [lng, lat]
} else {
    console.log('No features found.');
}
