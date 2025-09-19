import * as fs from 'fs';
import * as path from 'path';
import { 
    Session, 
    Plan, 
    ConversationMessage, 
    SessionManager, 
    LLMProvider,
    PlanGenerationContext
} from '../types';
import { MistralClient, DeepSeekClient } from '../llm';

export class LayerOrchestrator implements SessionManager {
    private sessionsDir: string;
    private mistralClient?: MistralClient;
    private deepseekClient?: DeepSeekClient;

    constructor(sessionsDir: string = './sessions') {
        this.sessionsDir = sessionsDir;
        this.ensureSessionsDirectory();
        this.initializeLLMClients();
    }

    // Session Management
    async createSession(title?: string, description?: string): Promise<Session> {
        const sessionId = this.generateSessionId();
        const now = new Date().toISOString();

        const session: Session = {
            id: sessionId,
            title: title || 'New Planning Session',
            description: description || 'A new planning session',
            createdAt: now,
            updatedAt: now,
            conversation: [],
            plans: [],
            metadata: {
                totalInteractions: 0
            }
        };

        await this.saveSession(session);
        return session;
    }

    async getSession(id: string): Promise<Session | null> {
        try {
            const sessionPath = path.join(this.sessionsDir, `${id}.json`);
            if (!fs.existsSync(sessionPath)) {
                return null;
            }

            const data = fs.readFileSync(sessionPath, 'utf-8');
            return JSON.parse(data) as Session;
        } catch (error) {
            console.error('Error loading session:', error);
            return null;
        }
    }

    async updateSession(session: Session): Promise<void> {
        session.updatedAt = new Date().toISOString();
        await this.saveSession(session);
    }

    async listSessions(): Promise<string[]> {
        try {
            if (!fs.existsSync(this.sessionsDir)) {
                return [];
            }

            const files = fs.readdirSync(this.sessionsDir);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''))
                .sort((a, b) => {
                    // Sort by creation time (newest first)
                    const timeA = parseInt(a.split('_')[1]) || 0;
                    const timeB = parseInt(b.split('_')[1]) || 0;
                    return timeB - timeA;
                });
        } catch (error) {
            console.error('Error listing sessions:', error);
            return [];
        }
    }

    async deleteSession(id: string): Promise<void> {
        try {
            const sessionPath = path.join(this.sessionsDir, `${id}.json`);
            if (fs.existsSync(sessionPath)) {
                fs.unlinkSync(sessionPath);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    // Plan Generation
    async generatePlan(
        sessionId: string, 
        userPrompt: string, 
        provider: 'mistral' | 'deepseek' = 'mistral'
    ): Promise<Plan> {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Add user message to conversation
        const userMessage: ConversationMessage = {
            role: 'user',
            content: userPrompt,
            timestamp: new Date().toISOString()
        };
        session.conversation.push(userMessage);

        let plan: Plan | null = null;
        let lastError: Error | null = null;

        // Try primary provider first
        try {
            plan = await this.tryGeneratePlan(provider, userPrompt, session.conversation);
            console.log(`Plan generated successfully using ${provider}`);
        } catch (error) {
            lastError = error as Error;
            console.log(`${provider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // If primary provider failed, try fallback provider
        if (!plan && this.availableProviders.length > 1) {
            const fallbackProvider = provider === 'mistral' ? 'deepseek' : 'mistral';
            if (this.availableProviders.includes(fallbackProvider)) {
                try {
                    console.log(`Trying fallback provider: ${fallbackProvider}`);
                    plan = await this.tryGeneratePlan(fallbackProvider as 'mistral' | 'deepseek', userPrompt, session.conversation);
                    console.log(`Plan generated successfully using fallback provider ${fallbackProvider}`);
                } catch (error) {
                    console.log(`Fallback provider ${fallbackProvider} also failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }

        if (!plan) {
            // Add error to conversation for context
            const errorMessage: ConversationMessage = {
                role: 'assistant',
                content: `Failed to generate plan: ${lastError instanceof Error ? lastError.message : 'All providers failed'}`,
                timestamp: new Date().toISOString()
            };
            session.conversation.push(errorMessage);
            await this.updateSession(session);
            
            throw lastError || new Error('All providers failed');
        }

        // Add assistant response to conversation
        const assistantMessage: ConversationMessage = {
            role: 'assistant',
            content: `Generated plan: ${plan.title}`,
            timestamp: new Date().toISOString()
        };
        session.conversation.push(assistantMessage);

        // Update session with new plan
        session.plans.push(plan);
        session.currentPlan = plan;
        session.metadata = {
            ...session.metadata,
            llmProvider: provider,
            totalInteractions: (session.metadata?.totalInteractions || 0) + 1
        };

        await this.updateSession(session);
        return plan;
    }

    private async tryGeneratePlan(provider: 'mistral' | 'deepseek', prompt: string, context: ConversationMessage[]): Promise<Plan> {
        const client = this.getLLMClient(provider);
        if (!client) {
            throw new Error(`${provider} client not available. Check your API key configuration.`);
        }

        return await client.generatePlan(prompt, context);
    }

    async refinePlan(
        sessionId: string, 
        feedback: string, 
        provider: 'mistral' | 'deepseek' = 'mistral'
    ): Promise<Plan> {
        const session = await this.getSession(sessionId);
        if (!session || !session.currentPlan) {
            throw new Error('Session or current plan not found');
        }

        // Add user feedback to conversation
        const userMessage: ConversationMessage = {
            role: 'user',
            content: `Refine plan: ${feedback}`,
            timestamp: new Date().toISOString()
        };
        session.conversation.push(userMessage);

        let refinedPlan: Plan | null = null;
        let lastError: Error | null = null;

        // Try primary provider first
        try {
            refinedPlan = await this.tryRefinePlan(provider, session.currentPlan, feedback, session.conversation);
            console.log(`Plan refined successfully using ${provider}`);
        } catch (error) {
            lastError = error as Error;
            console.log(`${provider} refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // If primary provider failed, try fallback provider
        if (!refinedPlan && this.availableProviders.length > 1) {
            const fallbackProvider = provider === 'mistral' ? 'deepseek' : 'mistral';
            if (this.availableProviders.includes(fallbackProvider)) {
                try {
                    console.log(`Trying fallback provider for refinement: ${fallbackProvider}`);
                    refinedPlan = await this.tryRefinePlan(fallbackProvider as 'mistral' | 'deepseek', session.currentPlan, feedback, session.conversation);
                    console.log(`Plan refined successfully using fallback provider ${fallbackProvider}`);
                } catch (error) {
                    console.log(`Fallback provider ${fallbackProvider} refinement also failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }

        if (!refinedPlan) {
            // Add error to conversation for context
            const errorMessage: ConversationMessage = {
                role: 'assistant',
                content: `Failed to refine plan: ${lastError instanceof Error ? lastError.message : 'All providers failed'}`,
                timestamp: new Date().toISOString()
            };
            session.conversation.push(errorMessage);
            await this.updateSession(session);
            
            throw lastError || new Error('All providers failed for plan refinement');
        }

        // Add assistant response to conversation
        const assistantMessage: ConversationMessage = {
            role: 'assistant',
            content: `Refined plan: ${refinedPlan.title}`,
            timestamp: new Date().toISOString()
        };
        session.conversation.push(assistantMessage);

        // Update session with refined plan
        session.currentPlan = refinedPlan;
        session.plans.push(refinedPlan);
        session.metadata = {
            ...session.metadata,
            totalInteractions: (session.metadata?.totalInteractions || 0) + 1
        };

        await this.updateSession(session);
        return refinedPlan;
    }

    private async tryRefinePlan(provider: 'mistral' | 'deepseek', plan: Plan, feedback: string, context: ConversationMessage[]): Promise<Plan> {
        const client = this.getLLMClient(provider);
        if (!client) {
            throw new Error(`${provider} client not available. Check your API key configuration.`);
        }

        return await client.refinePlan(plan, feedback, context);
    }

    async getCritique(
        sessionId: string, 
        provider: 'mistral' | 'deepseek' = 'mistral'
    ): Promise<string> {
        const session = await this.getSession(sessionId);
        if (!session || !session.currentPlan) {
            throw new Error('Session or current plan not found');
        }

        const client = this.getLLMClient(provider);
        if (!client) {
            throw new Error(`${provider} client not available. Check your API key configuration.`);
        }

        try {
            const critique = await client.critique(session.currentPlan, session.conversation);

            // Add critique request and response to conversation
            const requestMessage: ConversationMessage = {
                role: 'user',
                content: 'Request expert critique of current plan',
                timestamp: new Date().toISOString()
            };
            
            const critiqueMessage: ConversationMessage = {
                role: 'assistant',
                content: `Expert critique: ${critique}`,
                timestamp: new Date().toISOString()
            };

            session.conversation.push(requestMessage, critiqueMessage);
            session.metadata = {
                ...session.metadata,
                totalInteractions: (session.metadata?.totalInteractions || 0) + 1
            };

            await this.updateSession(session);
            return critique;

        } catch (error) {
            console.error('Error getting critique:', error);
            throw error;
        }
    }

    // Helper Methods
    private ensureSessionsDirectory(): void {
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    private async saveSession(session: Session): Promise<void> {
        try {
            const sessionPath = path.join(this.sessionsDir, `${session.id}.json`);
            const data = JSON.stringify(session, null, 2);
            fs.writeFileSync(sessionPath, data, 'utf-8');
        } catch (error) {
            console.error('Error saving session:', error);
            throw error;
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private initializeLLMClients(): void {
        // Initialize Mistral client if API key is available
        const mistralApiKey = process.env.MISTRAL_API_KEY;
        if (mistralApiKey) {
            const config: any = { apiKey: mistralApiKey };
            if (process.env.MISTRAL_API_URL) {
                config.baseURL = process.env.MISTRAL_API_URL;
            }
            this.mistralClient = new MistralClient(config);
        }

        // Initialize DeepSeek client if API key is available
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        if (deepseekApiKey) {
            const config: any = { apiKey: deepseekApiKey };
            if (process.env.DEEPSEEK_API_URL) {
                config.baseURL = process.env.DEEPSEEK_API_URL;
            }
            this.deepseekClient = new DeepSeekClient(config);
        }
    }

    private getLLMClient(provider: 'mistral' | 'deepseek'): LLMProvider | undefined {
        switch (provider) {
            case 'mistral':
                return this.mistralClient;
            case 'deepseek':
                return this.deepseekClient;
            default:
                return undefined;
        }
    }

    // Public getters for checking client availability
    public get hasMistralClient(): boolean {
        return !!this.mistralClient;
    }

    public get hasDeepSeekClient(): boolean {
        return !!this.deepseekClient;
    }

    public get availableProviders(): string[] {
        const providers: string[] = [];
        if (this.hasMistralClient) providers.push('mistral');
        if (this.hasDeepSeekClient) providers.push('deepseek');
        return providers;
    }
}
