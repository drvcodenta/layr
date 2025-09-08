import { Plan } from './types';
import { LLMClient, MockProvider } from './llmClient';
import { readKey } from './config';

const PLAN_PROMPT = (goal: string) => [
	{
		role: 'system' as const,
		content:
			'You are an expert software architect. Given a goal, return exactly one JSON object matching this schema: { title, goal, steps: [{id,title,description,dependencies,templates,commands,complexity,estimatedTimeMin}] }. No extra text. If clarification needed, return { "clarify": "question text" }.'
	},
	{
		role: 'user' as const,
		content: JSON.stringify({ goal })
	}
];

function hasUniqueIds(steps: { id: number }[]): boolean {
	const ids = steps.map(s => s.id);
	return ids.length === new Set(ids).size;
}

function hasCycles(steps: { id: number; dependencies: number[] }[]): boolean {
	const visited = new Set<number>();
	const recStack = new Set<number>();
	const graph: Record<number, number[]> = {};
	steps.forEach(s => { graph[s.id] = s.dependencies || []; });
	function dfs(id: number): boolean {
		if (!visited.has(id)) {
			visited.add(id);
			recStack.add(id);
			for (const dep of graph[id]) {
				if (!visited.has(dep) && dfs(dep)) return true;
				else if (recStack.has(dep)) return true;
			}
		}
		recStack.delete(id);
		return false;
	}
	return steps.some(s => dfs(s.id));
}

function fallbackHeuristicPlan(goal: string): Plan {
	return {
		id: 'local-fallback',
		title: `Plan for: ${goal}`,
		goal,
		steps: [
			{ id: 1, title: 'Initialize project', description: 'Set up project structure', dependencies: [] },
			{ id: 2, title: 'Create model', description: 'Define data model', dependencies: [1] },
			{ id: 3, title: 'Add routes', description: 'Implement API routes', dependencies: [2] },
			{ id: 4, title: 'Test project', description: 'Write and run tests', dependencies: [3] },
		],
	};
}

export async function generatePlan(goal: string): Promise<Plan> {
	const apiKey = await readKey();
	const llm = apiKey ? new LLMClient() : new MockProvider();
	let raw: string;
	if (apiKey) {
		raw = await llm.chat(PLAN_PROMPT(goal));
		try {
			const plan = llm.parseJsonResponse<Plan>(raw);
			if (!hasUniqueIds(plan.steps)) throw new Error('Step IDs must be unique');
			if (hasCycles(plan.steps)) throw new Error('Plan has cyclic dependencies');
			return plan;
		} catch (e) {
			throw new Error('Invalid plan format: ' + (e as Error).message);
		}
	} else {
		return fallbackHeuristicPlan(goal);
	}
}

export async function refinePlan(plan: Plan, instruction: string): Promise<Plan> {
	const apiKey = await readKey();
	const llm = apiKey ? new LLMClient() : new MockProvider();
	let raw: string;
	if (apiKey) {
			const prompt = [
				{ role: 'system' as const, content: 'You are a helpful planning assistant. Refine the following plan as a valid JSON.' },
				{ role: 'user' as const, content: `Plan: ${JSON.stringify(plan)}\nInstruction: ${instruction}` }
			];
		raw = await llm.chat(prompt);
		try {
			const newPlan = llm.parseJsonResponse<Plan>(raw);
			if (!hasUniqueIds(newPlan.steps)) throw new Error('Step IDs must be unique');
			if (hasCycles(newPlan.steps)) throw new Error('Plan has cyclic dependencies');
			return newPlan;
		} catch (e) {
			throw new Error('Invalid plan format: ' + (e as Error).message);
		}
	} else {
		// Fallback: just return the original plan
		return plan;
	}
}
