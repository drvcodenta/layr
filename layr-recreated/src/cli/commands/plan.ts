import * as readlineSync from 'readline-sync';
import { LayerOrchestrator } from '../../orchestrator';
import { Plan } from '../../types';
import { displayError, displaySuccess, createMockPlan } from '../../utils';

export async function planCommand(): Promise<void> {
    try {
        const orchestrator = new LayerOrchestrator();
        
        // Get the most recent session
        const sessions = await orchestrator.listSessions();
        if (sessions.length === 0) {
            displayError('No sessions found. Please run "layr init" first.');
            return;
        }
        
        const sessionId = sessions[0]; // Most recent session
        const session = await orchestrator.getSession(sessionId);
        
        if (!session) {
            displayError('Failed to load session. Please run "layr init" to create a new session.');
            return;
        }
        
        console.log(`Using session: ${sessionId.substring(0, 20)}...`);
        console.log(`Created: ${new Date(session.createdAt).toLocaleDateString()}\n`);
        
        // Get task description from user
        const taskDescription = readlineSync.question('Describe the task or project you want to plan: ');
        
        if (!taskDescription.trim()) {
            displayError('Task description cannot be empty.');
            return;
        }
        
        console.log('\nGenerating plan...');
        
        let plan: Plan;
        const availableProviders = orchestrator.availableProviders;
        
        try {
            if (availableProviders.length === 0) {
                console.log('Note: Using mock plan (no AI providers configured)');
                plan = createMockPlan(taskDescription);
                session.currentPlan = plan;
                session.plans.push(plan);
                await orchestrator.updateSession(session);
            } else {
                // Choose provider if multiple are available
                let provider: 'mistral' | 'deepseek' = 'mistral';
                if (availableProviders.length > 1) {
                    console.log('\nAvailable AI providers:');
                    availableProviders.forEach((p, index) => {
                        console.log(`${index + 1}. ${p}`);
                    });
                    
                    const choice = readlineSync.questionInt('\nSelect provider (1-' + availableProviders.length + '): ');
                    if (choice >= 1 && choice <= availableProviders.length) {
                        provider = availableProviders[choice - 1] as 'mistral' | 'deepseek';
                    }
                }
                
                plan = await orchestrator.generatePlan(sessionId, taskDescription, provider);
            }
            
            displayPlan(plan);
            
            // Plan refinement loop
            let continueRefining = true;
            while (continueRefining) {
                console.log('\nOptions:');
                console.log('1. Refine this plan');
                console.log('2. Get expert critique');
                console.log('3. Accept and save plan');
                console.log('4. Exit');
                
                const choice = readlineSync.questionInt('\nWhat would you like to do? (1-4): ');
                
                switch (choice) {
                    case 1:
                        await refinePlan(orchestrator, sessionId, availableProviders);
                        if (session.currentPlan) {
                            plan = session.currentPlan;
                            displayPlan(plan);
                        }
                        break;
                        
                    case 2:
                        await getCritique(orchestrator, sessionId, availableProviders);
                        break;
                        
                    case 3:
                        displaySuccess('Plan saved successfully!');
                        continueRefining = false;
                        break;
                        
                    case 4:
                        console.log('Exiting without saving changes.');
                        continueRefining = false;
                        break;
                        
                    default:
                        console.log('Invalid option. Please select 1-4.');
                }
            }
            
        } catch (error) {
            displayError('Failed to generate plan', error instanceof Error ? error.message : 'Unknown error');
            
            // Offer fallback option
            const useFallback = readlineSync.keyInYNStrict('Would you like to use a mock plan instead?');
            if (useFallback) {
                plan = createMockPlan(taskDescription);
                session.currentPlan = plan;
                session.plans.push(plan);
                await orchestrator.updateSession(session);
                displayPlan(plan);
            }
        }
        
    } catch (error) {
        displayError('Error in plan command', error instanceof Error ? error.message : 'Unknown error');
    }
}

function displayPlan(plan: Plan) {
    console.log(`\n${plan.title}`);
    console.log('='.repeat(50));
    console.log(`${plan.description}\n`);
    
    console.log('Tasks:');
    plan.tasks.forEach((task, index) => {
        const priority = task.priority === 'high' ? '[HIGH]' : task.priority === 'medium' ? '[MED]' : '[LOW]';
        const status = task.status === 'completed' ? '[DONE]' : task.status === 'in-progress' ? '[WIP]' : '[TODO]';
        
        console.log(`\n${index + 1}. ${status} ${task.title} ${priority}`);
        console.log(`   ${task.description}`);
        if (task.estimatedDuration) {
            console.log(`   Duration: ${task.estimatedDuration}`);
        }
        if (task.dependencies && task.dependencies.length > 0) {
            console.log(`   Dependencies: ${task.dependencies.join(', ')}`);
        }
    });
    
    console.log(`\nStatus: ${plan.status} | Tasks: ${plan.tasks.length} | Created: ${new Date(plan.createdAt).toLocaleDateString()}`);
}

async function refinePlan(orchestrator: LayerOrchestrator, sessionId: string, availableProviders: string[]) {
    try {
        const feedback = readlineSync.question('\nHow would you like to modify the plan? ');
        
        if (!feedback.trim()) {
            console.log('No feedback provided.');
            return;
        }
        
        if (availableProviders.length === 0) {
            console.log('Plan refinement requires AI providers. Using mock feedback...');
            console.log('Note: Set up API keys to enable real plan refinement.');
            return;
        }
        
        let provider: 'mistral' | 'deepseek' = availableProviders[0] as 'mistral' | 'deepseek';
        if (availableProviders.length > 1) {
            console.log('\nSelect provider for refinement:');
            availableProviders.forEach((p, index) => {
                console.log(`${index + 1}. ${p}`);
            });
            
            const choice = readlineSync.questionInt('\nSelect provider (1-' + availableProviders.length + '): ');
            if (choice >= 1 && choice <= availableProviders.length) {
                provider = availableProviders[choice - 1] as 'mistral' | 'deepseek';
            }
        }
        
        console.log('\nRefining plan...');
        await orchestrator.refinePlan(sessionId, feedback, provider);
        displaySuccess('Plan refined successfully!');
        
    } catch (error) {
        displayError('Failed to refine plan', error instanceof Error ? error.message : 'Unknown error');
    }
}

async function getCritique(orchestrator: LayerOrchestrator, sessionId: string, availableProviders: string[]) {
    try {
        if (availableProviders.length === 0) {
            console.log('\nExpert critique requires AI providers.');
            console.log('Set up API keys to enable expert critique functionality.');
            return;
        }
        
        let provider: 'mistral' | 'deepseek' = availableProviders[0] as 'mistral' | 'deepseek';
        if (availableProviders.length > 1) {
            console.log('\nSelect provider for critique:');
            availableProviders.forEach((p, index) => {
                console.log(`${index + 1}. ${p}`);
            });
            
            const choice = readlineSync.questionInt('\nSelect provider (1-' + availableProviders.length + '): ');
            if (choice >= 1 && choice <= availableProviders.length) {
                provider = availableProviders[choice - 1] as 'mistral' | 'deepseek';
            }
        }
        
        console.log('\nGetting expert critique...');
        const critique = await orchestrator.getCritique(sessionId, provider);
        
        console.log('\nExpert Critique:');
        console.log('-'.repeat(50));
        console.log(critique);
        console.log('-'.repeat(50));
        
    } catch (error) {
        displayError('Failed to get critique', error instanceof Error ? error.message : 'Unknown error');
    }
}
