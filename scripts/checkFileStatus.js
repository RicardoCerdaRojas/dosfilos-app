#!/usr/bin/env node
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function checkFileStatus(fileName) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
    );

    if (!response.ok) {
        console.error(`❌ Error: ${response.status}`);
        const text = await response.text();
        console.error(text);
        return;
    }

    const file = await response.json();
    console.log('📄 File Status:');
    console.log('   Name:', file.name);
    console.log('   State:', file.state);
    console.log('   DisplayName:', file.displayName);
    console.log('   URI:', file.uri);
    console.log('   CreateTime:', file.createTime);
    console.log('\nFull response:', JSON.stringify(file, null, 2));
}

const fileName = process.argv[2] || 'files/be0hn2wpzngl';
checkFileStatus(fileName);
