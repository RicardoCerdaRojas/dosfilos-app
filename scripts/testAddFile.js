#!/usr/bin/env node
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testImportFile() {
    const storeName = 'fileSearchStores/dos-filos-biblioteca-de-gen-c5syg3czonna';
    const fileName = 'files/be0hn2wpzngl';

    console.log('🧪 Testing :importFile endpoint...\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/${storeName}:importFile?key=${GEMINI_API_KEY}`;

    console.log(`URL: ${url}`);
    console.log(`Body: ${JSON.stringify({ fileName }, null, 2)}\n`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
}

testImportFile();
