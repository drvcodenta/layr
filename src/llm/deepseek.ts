import axios, { AxiosError } from 'axios';
import { 
    LLMProvider, 
    Plan, 
    ConversationMessage, 
    DeepSeekConfig, 
    ChatCompletionRequest, 
    ChatCompletionResponse,
    RetryConfig,
    Task
} from '../types';

export class DeepSeekClient implements LLMProvider {
    public readonly name = 'DeepSeek';
    private config: DeepSeekConfig;
    private retryConfig: RetryConfig;

    constructor(config: DeepSeekConfig) {
        this.config = {
            model: 'deepseek-chat',
            baseURL: 'https://api.deepseek.com/v1/chat/completions',
            maxTokens: 4000,
            temperature: 0.7,
            ...config
        };

        this.retryConfig = {
            maxRetries: 5,
            baseDelay: 2000,
            maxDelay: 30000,
            backoffFactor: 2
        };
    }

    async generatePlan(prompt: string, context?: ConversationMessage[]): Promise<Plan> {
        const systemPrompt = `You are an expert planning assistant. Generate a detailed, structured plan based on the user's request.

CRITICAL: Your response must be valid JSON in exactly this format:
{
  "title": "Clear, actionable plan title",
  "description": "Brief description of what this plan accomplishes",
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed task description",
      "status": "todo",
      "priority": "high|medium|low",
      "estimatedDuration": "2 hours",
      "dependencies": []
    }
  ]
}

Rules:
- Break down complex tasks into smaller, manageable subtasks
- Set realistic priorities and time estimates
- Include dependencies where tasks must be done in order
- Ensure each task is actionable and specific
- Respond ONLY with valid JSON, no additional text`;

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...(context ? context.map(msg => ({ 
                role: msg.role as 'user' | 'assistant' | 'system', 
                content: msg.content 
            })) : []),
            { role: 'user' as const, content: prompt }
        ];

        try {
            const response = await this.makeRequest({
                model: this.config.model!,
                messages,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content in response');
            }

            return this.parseAndValidatePlan(content);
        } catch (error) {
            console.error('Failed to generate plan with DeepSeek:', error);
            return this.getFallbackPlan(prompt);
        }
    }

    async refinePlan(plan: Plan, feedback: string, context?: ConversationMessage[]): Promise<Plan> {
        const systemPrompt = `You are refining an existing plan based on user feedback. 

Current plan:
${JSON.stringify(plan, null, 2)}

User feedback: ${feedback}

CRITICAL: Respond with valid JSON in exactly this format:
{
  "title": "Updated plan title",
  "description": "Updated description",
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description", 
      "status": "todo|in-progress|completed",
      "priority": "high|medium|low",
      "estimatedDuration": "time estimate",
      "dependencies": []
    }
  ]
}

Modify the plan based on the feedback. Respond ONLY with valid JSON.`;

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...(context ? context.map(msg => ({ 
                role: msg.role as 'user' | 'assistant' | 'system', 
                content: msg.content 
            })) : []),
            { role: 'user' as const, content: feedback }
        ];

        try {
            const response = await this.makeRequest({
                model: this.config.model!,
                messages,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content in response');
            }

            const refinedPlan = this.parseAndValidatePlan(content);
            return {
                ...refinedPlan,
                id: plan.id,
                createdAt: plan.createdAt,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to refine plan with DeepSeek:', error);
            return plan;
        }
    }

    async critique(plan: Plan, context?: ConversationMessage[]): Promise<string> {
        const systemPrompt = `You are an expert consultant reviewing a project plan. Provide constructive feedback.

Plan to review:
${JSON.stringify(plan, null, 2)}

Provide a thoughtful critique covering:
- Completeness and feasibility
- Task organization and dependencies  
- Time estimates and priorities
- Potential risks or missing elements
- Suggestions for improvement

Be specific and actionable in your feedback.`;

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...(context ? context.map(msg => ({ 
                role: msg.role as 'user' | 'assistant' | 'system', 
                content: msg.content 
            })) : []),
            { role: 'user' as const, content: 'Please provide your expert critique of this plan.' }
        ];

        try {
            const response = await this.makeRequest({
                model: this.config.model!,
                messages,
                max_tokens: this.config.maxTokens,
                temperature: 0.8
            });

            return response.choices[0]?.message?.content || 'Unable to generate critique.';
        } catch (error) {
            console.error('Failed to generate critique with DeepSeek:', error);
            return 'Expert critique unavailable due to API error. Consider reviewing the plan manually for completeness, realistic timelines, and proper task organization.';
        }
    }

    private async makeRequest(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const response = await axios.post<ChatCompletionResponse>(
                    this.config.baseURL!,
                    request,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );

                return response.data;
            } catch (error) {
                lastError = error as Error;
                
                if (error instanceof AxiosError) {
                    if (error.response?.status === 429) {
                        // Rate limited - wait longer with exponential backoff
                        const delay = Math.min(
                            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt) * 3,
                            this.retryConfig.maxDelay
                        );
                        console.log(`DeepSeek rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
                        await this.sleep(delay);
                        continue;
                    } else if (error.response?.status === 402) {
                        // Payment required - wait and retry with longer delay
                        const delay = Math.min(
                            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt) * 2,
                            this.retryConfig.maxDelay
                        );
                        console.log(`DeepSeek payment/quota issue. Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
                        await this.sleep(delay);
                        continue;
                    } else if (error.response?.status === 503 || error.response?.status === 502) {
                        // Service unavailable - retry with shorter delay
                        const delay = Math.min(
                            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
                            this.retryConfig.maxDelay / 2
                        );
                        console.log(`DeepSeek service unavailable. Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
                        await this.sleep(delay);
                        continue;
                    } else if (error.response?.status && error.response.status < 500) {
                        // Other client errors - don't retry
                        throw error;
                    }
                }

                if (attempt < this.retryConfig.maxRetries) {
                    const delay = Math.min(
                        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
                        this.retryConfig.maxDelay
                    );
                    console.log(`DeepSeek request failed. Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    private parseAndValidatePlan(content: string): Plan {
        try {
            let jsonContent = content.trim();
            
            if (jsonContent.startsWith('```json')) {
                jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Try to find JSON in the content using regex - be more aggressive
            const jsonMatch = jsonContent.match(/\{[\s\S]*?\}(?=\s*$)/);
            if (jsonMatch) {
                jsonContent = jsonMatch[0];
            }

            // Clean up control characters that might cause JSON parsing issues
            jsonContent = jsonContent
                .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                .replace(/\\n/g, '\\n') // Ensure newlines are properly escaped
                .replace(/\\r/g, '\\r') // Ensure carriage returns are properly escaped
                .replace(/\\t/g, '\\t') // Ensure tabs are properly escaped
                .replace(/\\\\/g, '\\'); // Fix double escaping

            const parsed = JSON.parse(jsonContent);
            
            if (!parsed.title || !parsed.description || !Array.isArray(parsed.tasks)) {
                throw new Error('Invalid plan structure');
            }

            const tasks: Task[] = parsed.tasks.map((task: any, index: number) => ({
                id: `task_${Date.now()}_${index}`,
                title: task.title || `Task ${index + 1}`,
                description: task.description || '',
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                estimatedDuration: task.estimatedDuration || '1 hour',
                dependencies: task.dependencies || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));

            return {
                id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: parsed.title,
                description: parsed.description,
                tasks,
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.log('Warning: DeepSeek JSON parsing failed, using fallback plan...');
            throw new Error(`Failed to parse plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private getFallbackPlan(prompt: string): Plan {
        const tasks: Task[] = [
            {
                id: `task_${Date.now()}_1`,
                title: 'Analysis and Planning',
                description: 'Analyze requirements and create a detailed approach',
                status: 'todo',
                priority: 'high',
                estimatedDuration: '1.5 hours',
                dependencies: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: `task_${Date.now()}_2`,
                title: 'Core Implementation',
                description: 'Build the main components and functionality',
                status: 'todo',
                priority: 'high',
                estimatedDuration: '3 hours',
                dependencies: [`task_${Date.now()}_1`],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: `task_${Date.now()}_3`,
                title: 'Testing and Validation',
                description: 'Test implementation and validate against requirements',
                status: 'todo',
                priority: 'medium',
                estimatedDuration: '1 hour',
                dependencies: [`task_${Date.now()}_2`],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        return {
            id: `plan_${Date.now()}_deepseek_fallback`,
            title: `DeepSeek Plan: ${prompt.substring(0, 50)}...`,
            description: 'This is a fallback plan generated when DeepSeek API is unavailable. Please review and customize as needed.',
            tasks,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
