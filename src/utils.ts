import * as fs from 'node:fs';
import * as path from 'node:path';

// Define a type for replacements
interface Replacements {
    [key: string]: string; // Assuming all replacements are strings
}

// Function to replace placeholders in Terraform file
function replaceVariableValues(terraformFilePath: string, replacements: Replacements) {
    let terraformFile = fs.readFileSync(terraformFilePath, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
        terraformFile = terraformFile.replaceAll(new RegExp(`\\$\{var.${key}}`, 'g'), value);
    }

    return terraformFile;
}
