import { readKey } from './config';
import { OpenAI } from 'openai';

type Message = { role: 'system' | 'user'; content: string };

export class LLMClient {
	private openai: OpenAI | null = null;
	private provider: 'OpenAI' = 'OpenAI';

	constructor() {}

	async init() {
		const apiKey = await readKey();
		if (!apiKey) throw new Error('API key not found');
		this.openai = new OpenAI({ apiKey });
	}

	async chat(messages: Message[]): Promise<string> {
		if (!this.openai) await this.init();
		let attempt = 0;
		const maxAttempts = 3;
		let delay = 5000; // Start with 5 seconds
		while (attempt < maxAttempts) {
			try {
				const res = await this.openai!.chat.completions.create({
					model: 'gpt-3.5-turbo',
					messages,
				});
				return res.choices[0].message.content || '';
			} catch (err: any) {
				if (err.status === 429) {
					console.log(`Rate limited, waiting ${delay/1000}s before retry ${attempt + 1}/${maxAttempts}...`);
					await new Promise(r => setTimeout(r, delay));
					delay *= 2;
					attempt++;
				} else if (err.status === 401) {
					throw new Error('Unauthorized: Invalid API key');
				} else {
					throw err;
				}
			}
		}
		throw new Error('Rate limit exceeded. Please wait a few minutes and try again.');
	}

	parseJsonResponse<T>(raw: string): T {
		try {
			return JSON.parse(raw) as T;
		} catch (e) {
			throw new Error('Failed to parse JSON response');
		}
	}
}

export class MockProvider {
	async chat(messages: Message[]): Promise<string> {
		return JSON.stringify({ reply: 'This is a mock response.' });
	}
	parseJsonResponse<T>(raw: string): T {
		return JSON.parse(raw) as T;
	}
}
