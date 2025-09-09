import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
let keytar: typeof import('keytar') | undefined;
try {
	keytar = require('keytar');
} catch {
	keytar = undefined;
}

const SERVICE = 'layr';
const ACCOUNT = 'openai_api_key';
const ENV_PATH = path.join(os.homedir(), '.config', 'layr', '.env');

dotenv.config({ path: ENV_PATH });

export async function readKey(): Promise<string | undefined> {
	if (keytar) {
		return await keytar.getPassword(SERVICE, ACCOUNT) || process.env.OPENAI_API_KEY;
	}
	if (await fs.pathExists(ENV_PATH)) {
		dotenv.config({ path: ENV_PATH });
		return process.env.OPENAI_API_KEY;
	}
	return undefined;
}

export async function setKeyInteractive(): Promise<void> {
	const inquirer = require('inquirer');
	const { apiKey } = await inquirer.default.prompt([
		{
			type: 'input',
			name: 'apiKey',
			message: 'Enter your OpenAI API key:',
			validate: (input: string) => input.length > 0 || 'API key required',
		},
	]);
	if (keytar) {
		await keytar.setPassword(SERVICE, ACCOUNT, apiKey);
	} else {
		await fs.ensureDir(path.dirname(ENV_PATH));
		await fs.writeFile(ENV_PATH, `OPENAI_API_KEY=${apiKey}\n`, { mode: 0o600 });
	}
	dotenv.config({ path: ENV_PATH });
}

export async function clearKey(): Promise<void> {
	if (keytar) {
		await keytar.deletePassword(SERVICE, ACCOUNT);
	}
	if (await fs.pathExists(ENV_PATH)) {
		await fs.remove(ENV_PATH);
	}
}

export async function confirmKey(): Promise<boolean> {
	const key = await readKey();
	if (!key) return false;
	try {
		const { OpenAI } = await import('openai');
		const openai = new OpenAI({ apiKey: key });
		// Lightweight ping: list models (should be fast and not billable)
		await openai.models.list();
		return true;
	} catch {
		return false;
	}
}
