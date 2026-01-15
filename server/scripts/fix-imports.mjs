#!/usr/bin/env node

/**
 * Script to convert @/ path aliases to relative imports with .js extensions
 * Run this after removing path aliases from tsconfig
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { relative, dirname, join } from 'path';

const files = glob.sync('src/**/*.ts', { ignore: ['**/*.d.ts'] });

files.forEach(file => {
    let content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    const newLines = lines.map(line => {
        // Match import statements with @/ aliases
        const match = line.match(/^(import .* from ['"])@\/(.+)(['"];?)$/);

        if (match) {
            const [, prefix, importPath, suffix] = match;
            const currentDir = dirname(file);
            const targetPath = join('src', importPath);
            let relativePath = relative(currentDir, targetPath);

            // Ensure it starts with ./  or ../
            if (!relativePath.startsWith('.')) {
                relativePath = './' + relativePath;
            }

            // Add .js extension if not already there
            if (!relativePath.endsWith('.js')) {
                relativePath += '.js';
            }

            // Fix Windows backslashes
            relativePath = relativePath.replace(/\\/g, '/');

            return `${prefix}${relativePath}${suffix}`;
        }

        return line;
    });

    const newContent = newLines.join('\n');

    if (newContent !== content) {
        writeFileSync(file, newContent);
        console.log(`✓ Fixed: ${file}`);
    }
});

console.log('\n✅ All imports converted!');
