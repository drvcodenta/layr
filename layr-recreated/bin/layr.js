#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Determine if we're in development or production
const isProduction = fs.existsSync(path.join(__dirname, '../dist'));

if (isProduction) {
    // Production: use compiled JavaScript
    require('../dist/cli/index.js');
} else {
    // Development: use tsx to run TypeScript directly
    const { spawn } = require('child_process');
    const tsxPath = path.join(__dirname, '../node_modules/.bin/tsx');
    const srcPath = path.join(__dirname, '../src/cli/index.ts');
    
    // Pass through all command line arguments
    const args = process.argv.slice(2);
    
    const child = spawn('node', [tsxPath, srcPath, ...args], {
        stdio: 'inherit',
        cwd: path.dirname(__dirname)
    });
    
    child.on('exit', (code) => {
        process.exit(code || 0);
    });
}
