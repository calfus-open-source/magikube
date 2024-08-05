#!/usr/bin/env node

import {execute} from '@oclif/core'
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

clear();

console.log(
  chalk.cyan(
    figlet.textSync('magikube', { horizontalLayout: 'full' })
  )
);


console.log(`import.meta.url: ${import.meta.url}`)
await execute({dir: import.meta.url})
