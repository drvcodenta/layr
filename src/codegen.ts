import { Plan, PlanStep } from './types';
import { LLMClient, MockProvider } from './llmClient';
import { readKey } from './config';
import * as filewriter from './filewriter';

const CODEGEN_PROMPT = (step: PlanStep, plan: Plan) => [
	{
		role: 'system' as const,
		content:
			'You are a concise TypeScript developer. Given project context and one PlanStep, return exactly { filename, content, stepId } JSON only.'
	},
	{
		role: 'user' as const,
		content: JSON.stringify({ plan, step })
	}
];

function validateCodegenJson(obj: any): obj is { filename: string; content: string; stepId: number } {
	return (
		typeof obj === 'object' &&
		typeof obj.filename === 'string' &&
		typeof obj.content === 'string' &&
		typeof obj.stepId === 'number'
	);
}

export async function generateCodeForStep(
	step: PlanStep,
	plan: Plan,
	options?: { apply?: boolean }
): Promise<{ filename: string; content: string; stepId: number }> {
	const apiKey = await readKey();
	const llm = apiKey ? new LLMClient() : new MockProvider();
	const raw = await llm.chat(CODEGEN_PROMPT(step, plan));
	let result;
	try {
		result = llm.parseJsonResponse<{ filename: string; content: string; stepId: number }>(raw);
	} catch (e) {
		throw new Error('Failed to parse codegen JSON: ' + (e as Error).message);
	}
	if (!validateCodegenJson(result)) {
		throw new Error('Codegen response missing required fields');
	}
	if (options?.apply) {
		await filewriter.writeFile(result.filename, result.content);
	}
	return result;
}
