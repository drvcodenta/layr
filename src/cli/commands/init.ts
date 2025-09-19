import * as readlineSync from 'readline-sync';
import { LayerOrchestrator } from '../../orchestrator';
import { displayWelcome, displaySuccess, displayError } from '../../utils';

export async function initCommand(): Promise<void> {
    try {
        console.log('Initializing Layr session...');
        
        const orchestrator = new LayerOrchestrator();
        
        // Create a new session
        const session = await orchestrator.createSession();
        
        console.log('');
        displaySuccess('Session initialized successfully!');
        console.log(`Session ID: ${session.id}`);
        console.log(`Created: ${new Date(session.createdAt).toLocaleString()}`);
        
        console.log('\nNext steps:');
        console.log('   • Use "layr plan" to create and refine plans');
        console.log('   • Set your API keys in .env file if you haven\'t already');
        console.log('   • Plan refinement is available during plan creation');
        
        // Check for available LLM providers
        const availableProviders = orchestrator.availableProviders;
        if (availableProviders.length === 0) {
            console.log('\nWarning: No LLM providers configured.');
            console.log('To enable AI-powered planning, create a .env file with:');
            console.log('  MISTRAL_API_KEY=your_key_here');
            console.log('  DEEPSEEK_API_KEY=your_key_here');
            console.log('Mock plans will be used until API keys are configured.');
        } else {
            console.log(`\nAvailable AI providers: ${availableProviders.join(', ')}`);
        }
        
    } catch (error) {
        displayError('Failed to initialize session', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
