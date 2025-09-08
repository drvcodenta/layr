
export type Complexity = 'low' | 'medium' | 'high';

export type PlanStep = {
	id: number;
	title: string;
	description: string;
	dependencies: number[];
	templates?: string[];
	commands?: string[];
	complexity?: Complexity;
	estimatedTimeMin?: number;
};

export type Plan = {
	id: string;
	title: string;
	goal: string;
	steps: PlanStep[];
	templates?: string[];
	metadata?: Record<string, any>;
};
