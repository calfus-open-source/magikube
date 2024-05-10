#!/usr/bin/env node

import { execute } from '@oclif/core';
import clear from 'clear';
import figlet from 'figlet';
import chalk from 'chalk';

clear();

console.log(
  chalk.cyan(
    figlet.textSync('Magikube', { horizontalLayout: 'full' })
  )
);

await execute({ dir: new URL('.', import.meta.url).pathname });
