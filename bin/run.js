#!/usr/bin/env node

import {execute} from '@oclif/core'
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

clear();

console.log(
  chalk.cyan(
    figlet.textSync('Magikube', { horizontalLayout: 'full' })
  )
);


await execute({dir: import.meta.url})
