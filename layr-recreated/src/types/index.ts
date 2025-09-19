// Core data structures for the Layr planning system

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    estimatedDuration?: string;
    dependencies?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Plan {
    id: string;
    title: string;
    description: string;
    tasks: Task[];
    status: 'draft' | 'active' | 'completed' | 'archived';
    createdAt: string;
    updatedAt: string;
    metadata?: {
        complexity?: 'simple' | 'moderate' | 'complex';
        estimatedTotalDuration?: string;
        tags?: string[];
    };
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}

export interface Session {
    id: string;
    title?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    conversation: ConversationMessage[];
    currentPlan?: Plan;
    plans: Plan[];
    metadata?: {
        llmProvider?: string;
        totalInteractions?: number;
    };
}

// LLM integration types
export interface LLMProvider {
    name: string;
    generatePlan(prompt: string, context?: ConversationMessage[]): Promise<Plan>;
    refinePlan(plan: Plan, feedback: string, context?: ConversationMessage[]): Promise<Plan>;
    critique(plan: Plan, context?: ConversationMessage[]): Promise<string>;
}

export interface LLMConfig {
    apiKey: string;
    baseURL?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface MistralConfig extends LLMConfig {
    model?: 'mistral-large-latest' | 'mistral-medium-latest' | 'mistral-small-latest';
}

export interface DeepSeekConfig extends LLMConfig {
    model?: 'deepseek-chat' | 'deepseek-coder';
}

// Request/Response types for LLM APIs
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// Error handling types
export interface LayerError extends Error {
    code?: string;
    statusCode?: number;
    provider?: string;
}

// Utility types
export type PlanStatus = Plan['status'];
export type TaskStatus = Task['status'];
export type Priority = Task['priority'];

// API retry configuration
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

// Session management types
export interface SessionManager {
    createSession(title?: string, description?: string): Promise<Session>;
    getSession(id: string): Promise<Session | null>;
    updateSession(session: Session): Promise<void>;
    listSessions(): Promise<string[]>;
    deleteSession(id: string): Promise<void>;
}

// Plan generation context
export interface PlanGenerationContext {
    userPrompt: string;
    conversationHistory?: ConversationMessage[];
    existingPlan?: Plan;
    refinementFeedback?: string;
}

// Mock data types for fallback scenarios
export interface MockPlanData {
    title: string;
    description: string;
    tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
}
