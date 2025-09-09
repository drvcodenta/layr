import { Command } from 'commander';
import inquirer from 'inquirer';
const chalk = require('chalk');
import fs from 'fs-extra';
import path from 'path';
import { setKeyInteractive, clearKey, readKey } from './config';
import { generatePlan } from './planner';
import { generateCodeForStep } from './codegen';
import { Plan } from './types';
import * as filewriter from './filewriter';
import { printBanner, printFallbackWarning, printPlan, printSuccess, printError, createSpinner } from './ui';

const program = new Command();
let currentPlan: Plan | null = null;

printBanner();

program
	.command('set-key')
	.description('Set OpenAI API key')
	.action(async () => {
		await setKeyInteractive();
		printSuccess('API key set successfully.');
	});

program
	.command('clear-key')
	.description('Clear OpenAI API key')
	.action(async () => {
		await clearKey();
		printSuccess('API key cleared.');
	});

program
	.command('plan <goal>')
	.description('Generate a project plan for the given goal')
		.action(async (goal: string) => {
		const apiKey = await readKey();
		if (!apiKey) {
			printFallbackWarning();
		}
		currentPlan = await generatePlan(goal);
		printPlan(currentPlan);
	});

program
	.command('show')
	.description('Show the current plan')
		.action(() => {
		if (!currentPlan) {
			console.log(chalk.red('No plan loaded. Run "layr plan <goal>" first.'));
			return;
		}
		console.log(chalk.cyan(`Plan: ${currentPlan.title}`));
		currentPlan.steps.forEach(step => {
			console.log(chalk.bold(`#${step.id}: ${step.title}`));
			console.log(chalk.gray(step.description));
		});
	});

program
	.command('run <stepId>')
	.option('--apply', 'Write generated code to file')
	.description('Generate code for a plan step')
		.action(async (stepId: string, options: { apply?: boolean }) => {
		if (!currentPlan) {
			console.log(chalk.red('No plan loaded. Run "layr plan <goal>" first.'));
			return;
		}
		const step = currentPlan.steps.find(s => s.id === Number(stepId));
		if (!step) {
			console.log(chalk.red('Step not found.'));
			return;
		}
		const result = await generateCodeForStep(step, currentPlan, { apply: options.apply });
		console.log(chalk.green(`Filename: ${result.filename}`));
		console.log(chalk.gray(result.content));
		if (options.apply) {
			console.log(chalk.yellow('File written.'));
		}
	});

program
	.command('export [file]')
	.description('Export the current plan as JSON or markdown')
		.action(async (file?: string) => {
		if (!currentPlan) {
			console.log(chalk.red('No plan loaded. Run "layr plan <goal>" first.'));
			return;
		}
		await fs.ensureDir('plans');
		const outFile = file ? path.join('plans', file) : path.join('plans', `${currentPlan.title.replace(/\s+/g, '_')}.json`);
		if (outFile.endsWith('.md')) {
			let md = `# ${currentPlan.title}\n\nGoal: ${currentPlan.goal}\n\n## Steps\n`;
			currentPlan.steps.forEach(step => {
				md += `\n### #${step.id}: ${step.title}\n${step.description}\n`;
				if (step.dependencies?.length) md += `Depends on: ${step.dependencies.join(', ')}\n`;
				if (step.complexity) md += `Complexity: ${step.complexity}\n`;
				if (step.estimatedTimeMin) md += `Estimated Time: ${step.estimatedTimeMin} min\n`;
			});
			await fs.writeFile(outFile, md);
		} else {
			await fs.writeFile(outFile, JSON.stringify(currentPlan, null, 2));
		}
		console.log(chalk.green(`Plan exported to ${outFile}`));
	});

program.parseAsync(process.argv);
