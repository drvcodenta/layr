#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { initCommand } from './commands/init';
import { planCommand } from './commands/plan';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('layr')
  .description('CLI tool for task management and planning using LLMs')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new planning session')
  .action(initCommand);

program
  .command('plan')
  .description('Generate a structured plan based on your task description')
  .action(planCommand);

// Parse command line arguments
program.parse();
