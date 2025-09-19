import { Plan, Task, MockPlanData } from '../types';

export function displayWelcome(): void {
    console.log(`
╔═══════════════════════════════════════╗
║              LAYR                    ║
╚═══════════════════════════════════════╝

A simplified planning layer for complex tasks

Create structured plans with AI assistance
Iteratively refine plans through conversation
Get expert critiques and suggestions

Run 'layr init' to get started!
`);
}

export function displayError(message: string, details?: string): void {
    console.error(`Error: ${message}`);
    if (details) {
        console.error(`   Details: ${details}`);
    }
}

export function displaySuccess(message: string): void {
    console.log(`Success: ${message}`);
}

export function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

export function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDuration(duration: string): string {
    // Simple duration formatting - could be enhanced
    return duration;
}

export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
        return dateString;
    }
}

export function validateTaskStatus(status: string): boolean {
    return ['todo', 'in-progress', 'completed'].includes(status);
}

export function validateTaskPriority(priority: string): boolean {
    return ['low', 'medium', 'high'].includes(priority);
}

export function createMockPlan(prompt: string): Plan {
    const mockData: MockPlanData = {
        title: `Mock Plan: ${prompt.substring(0, 50)}...`,
        description: 'This is a fallback plan created when AI services are unavailable. Please review and customize according to your needs.',
        tasks: [
            {
                title: 'Initial Research and Planning',
                description: 'Gather requirements, research best practices, and create a detailed implementation plan',
                status: 'todo',
                priority: 'high',
                estimatedDuration: '2 hours',
                dependencies: []
            },
            {
                title: 'Core Implementation',
                description: 'Implement the main functionality based on the planning phase',
                status: 'todo',
                priority: 'high',
                estimatedDuration: '4 hours',
                dependencies: []
            },
            {
                title: 'Testing and Quality Assurance',
                description: 'Test the implementation thoroughly and ensure quality standards are met',
                status: 'todo',
                priority: 'medium',
                estimatedDuration: '1.5 hours',
                dependencies: []
            },
            {
                title: 'Documentation and Review',
                description: 'Create documentation and conduct final review',
                status: 'todo',
                priority: 'low',
                estimatedDuration: '1 hour',
                dependencies: []
            }
        ]
    };

    const now = new Date().toISOString();
    const tasks: Task[] = mockData.tasks.map((task, index) => ({
        id: generateId('task'),
        title: task.title,
        description: task.description,
        status: task.status as 'todo' | 'in-progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        estimatedDuration: task.estimatedDuration,
        dependencies: task.dependencies,
        createdAt: now,
        updatedAt: now
    }));

    return {
        id: generateId('plan'),
        title: mockData.title,
        description: mockData.description,
        tasks,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        metadata: {
            complexity: 'moderate',
            estimatedTotalDuration: '8.5 hours',
            tags: ['mock', 'fallback']
        }
    };
}

export function summarizePlan(plan: Plan): string {
    const totalTasks = plan.tasks.length;
    const completedTasks = plan.tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = plan.tasks.filter(task => task.status === 'in-progress').length;
    const todoTasks = plan.tasks.filter(task => task.status === 'todo').length;

    const highPriorityTasks = plan.tasks.filter(task => task.priority === 'high').length;
    const mediumPriorityTasks = plan.tasks.filter(task => task.priority === 'medium').length;
    const lowPriorityTasks = plan.tasks.filter(task => task.priority === 'low').length;

    return `Plan Summary:
- Total Tasks: ${totalTasks}
- Completed: ${completedTasks} | In Progress: ${inProgressTasks} | Todo: ${todoTasks}
- Priority Distribution: High: ${highPriorityTasks} | Medium: ${mediumPriorityTasks} | Low: ${lowPriorityTasks}
- Status: ${plan.status}
- Created: ${formatDate(plan.createdAt)}`;
}

export function getTaskStatusIcon(status: string): string {
    switch (status) {
        case 'completed':
            return '[DONE]';
        case 'in-progress':
            return '[WIP]';
        case 'todo':
        default:
            return '[TODO]';
    }
}

export function getPriorityLabel(priority: string): string {
    switch (priority) {
        case 'high':
            return '[HIGH]';
        case 'medium':
            return '[MED]';
        case 'low':
            return '[LOW]';
        default:
            return '[MED]';
    }
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
    return input.trim().replace(/\n/g, ' ').substring(0, 1000);
}

export function parseTimeEstimate(estimate: string): number {
    // Simple time parsing - returns minutes
    const matches = estimate.match(/(\d+\.?\d*)\s*(hour|hr|h|minute|min|m)/i);
    if (!matches) return 60; // Default to 1 hour

    const value = parseFloat(matches[1]);
    const unit = matches[2].toLowerCase();

    if (unit.startsWith('h')) {
        return Math.round(value * 60);
    } else {
        return Math.round(value);
    }
}

export function formatTimeEstimate(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} minutes`;
    } else if (minutes < 1440) {
        const hours = Math.round(minutes / 60 * 10) / 10;
        return `${hours} hours`;
    } else {
        const days = Math.round(minutes / 1440 * 10) / 10;
        return `${days} days`;
    }
}

export function calculatePlanComplexity(plan: Plan): 'simple' | 'moderate' | 'complex' {
    const taskCount = plan.tasks.length;
    const hasHighPriority = plan.tasks.some(task => task.priority === 'high');
    const hasDependencies = plan.tasks.some(task => task.dependencies && task.dependencies.length > 0);

    if (taskCount <= 3 && !hasHighPriority && !hasDependencies) {
        return 'simple';
    } else if (taskCount <= 8 && (!hasHighPriority || !hasDependencies)) {
        return 'moderate';
    } else {
        return 'complex';
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
