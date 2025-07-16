#!/usr/bin/env node

const { Command } = require('commander');
const submit = require('./submit');
const status = require('./status');

const program = new Command();

program
  .name('qgjob')
  .description('CLI to submit and check test jobs for QA infrastructure')
  .version('1.0.0');

program
  .command('submit')
  .description('Submit a new test job')
  .requiredOption('--org-id <id>', 'Organization ID')
  .requiredOption('--app-version-id <id>', 'App version ID')
  .requiredOption('--test <path>', 'Path to test file')
  .requiredOption('--priority <number>', 'Priority level')
  .requiredOption('--target <device>', 'Target device type')
  .action(submit);

program
  .command('status')
  .description('Check job status')
  .requiredOption('--job-id <id>', 'Job ID to check')
  .action(status);

program.parse();
