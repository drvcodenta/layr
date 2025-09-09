const chalk = require('chalk');
import { Plan, PlanStep } from './types';

export function printBanner() {
	console.log(chalk.cyan.bold('\n🚀 Layr - AI-Powered Project Planner\n'));
}

export function printFallbackWarning() {
	console.log(chalk.yellow.bold('⚠️  Warning: Running in fallback mode'));
	console.log(chalk.yellow('   No valid API key found. Using heuristic plans.'));
	console.log(chalk.yellow('   Run "layr set-key" to configure OpenAI API.\n'));
}

export function printPlan(plan: Plan) {
	console.log(chalk.cyan.bold(`\n📋 ${plan.title}`));
	console.log(chalk.gray(`Goal: ${plan.goal}\n`));
	
	console.log(chalk.bold('Steps:'));
	plan.steps.forEach(step => {
		printStep(step);
	});
}

export function printStep(step: PlanStep) {
	const stepHeader = chalk.bold.blue(`#${step.id}: ${step.title}`);
	console.log(`\n${stepHeader}`);
	console.log(chalk.gray(`   ${step.description}`));
	
	if (step.dependencies?.length) {
		console.log(chalk.magenta(`   Dependencies: ${step.dependencies.join(', ')}`));
	}
	
	if (step.complexity) {
		const complexityColor = step.complexity === 'high' ? 'red' : 
								step.complexity === 'medium' ? 'yellow' : 'green';
		console.log(chalk[complexityColor](`   Complexity: ${step.complexity}`));
	}
	
	if (step.estimatedTimeMin) {
		console.log(chalk.green(`   Estimated Time: ${step.estimatedTimeMin} min`));
	}
	
	if (step.templates?.length) {
		console.log(chalk.cyan(`   Templates: ${step.templates.join(', ')}`));
	}
	
	if (step.commands?.length) {
		console.log(chalk.blue(`   Commands: ${step.commands.join(', ')}`));
	}
}

export async function createSpinner(text: string) {
	const ora = (await import('ora')).default;
	return ora({
		text,
		color: 'cyan',
		spinner: 'dots'
	});
}

export function printSuccess(message: string) {
	console.log(chalk.green(`✅ ${message}`));
}

export function printError(message: string) {
	console.log(chalk.red(`❌ ${message}`));
}

export function printInfo(message: string) {
	console.log(chalk.blue(`ℹ️  ${message}`));
}

export function printWarning(message: string) {
	console.log(chalk.yellow(`⚠️  ${message}`));
}