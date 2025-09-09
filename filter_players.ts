#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Input and output file paths
const inputFile = './src/MCP/Sleeper/resources/sleeper_players_def.json';
const outputFile = './src/MCP/Sleeper/resources/sleeper_players_def.json';

// Fields to keep (note: weiht should be weight)
const fieldsToKeep = [
    'player_id',
    'full_name', 
    'number',
    'weight',  // Corrected from 'weiht'
    'height',
    'age',
    'fantasy_positions'
];

console.log('Reading large JSON file...');

// Read the JSON file
let playersData;
try {
    const rawData = fs.readFileSync(inputFile, 'utf8');
    playersData = JSON.parse(rawData);
} catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    process.exit(1);
}

console.log('Processing players data...');
const filteredData = {};

// Process each player
let processed = 0;
const total = Object.keys(playersData).length;

for (const [playerId, playerData] of Object.entries(playersData)) {
    const filteredPlayer = {};
    const pd = playerData as Record<string, any>;
    
    // Keep only the specified fields
    fieldsToKeep.forEach(field => {
        if (pd.hasOwnProperty(field)) {
            filteredPlayer[field] = pd[field];
        }
    });
    
    filteredData[playerId] = filteredPlayer;
    processed++;
    
    // Progress indicator
    if (processed % 1000 === 0) {
        console.log(`Processed ${processed}/${total} players...`);
    }
}

console.log('Writing filtered data to file...');

// Write the filtered data back to the file
try {
    fs.writeFileSync(outputFile, JSON.stringify(filteredData, null, 2));
    console.log(`Successfully filtered players data. Processed ${total} players.`);
    
    // Show file size comparison
    const originalStats = fs.statSync(inputFile);
    const newStats = fs.statSync(outputFile);
    console.log(`Original file size: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`New file size: ${(newStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Size reduction: ${((1 - newStats.size / originalStats.size) * 100).toFixed(1)}%`);
} catch (error) {
    console.error('Error writing filtered data:', error);
    process.exit(1);
}