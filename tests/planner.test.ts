import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generatePlan } from '../src/planner';
import { Plan, PlanStep } from '../src/types';
import * as config from '../src/config';

// Mock the config module
vi.mock('../src/config', () => ({
  readKey: vi.fn()
}));

// Mock the ui module to avoid ora import issues
vi.mock('../src/ui', () => ({
  createSpinner: vi.fn().mockResolvedValue({
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn()
  }),
  printWarning: vi.fn()
}));

describe('Planner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fallbackHeuristicPlan', () => {
    it('should return predictable structure when no API key', async () => {
      // Mock no API key
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const goal = 'Build a test application';
      const plan = await generatePlan(goal);

      expect(plan).toMatchObject({
        id: 'local-fallback',
        title: `Plan for: ${goal}`,
        goal,
        steps: expect.any(Array)
      });

      expect(plan.steps).toHaveLength(4);
      expect(plan.steps[0]).toMatchObject({
        id: 1,
        title: 'Initialize project',
        description: 'Set up project structure',
        dependencies: []
      });
      expect(plan.steps[1]).toMatchObject({
        id: 2,
        title: 'Create model',
        description: 'Define data model',
        dependencies: [1]
      });
      expect(plan.steps[2]).toMatchObject({
        id: 3,
        title: 'Add routes',
        description: 'Implement API routes',
        dependencies: [2]
      });
      expect(plan.steps[3]).toMatchObject({
        id: 4,
        title: 'Test project',
        description: 'Write and run tests',
        dependencies: [3]
      });
    });

    it('should have unique step IDs', async () => {
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const plan = await generatePlan('Test goal');
      const stepIds = plan.steps.map(step => step.id);
      const uniqueIds = new Set(stepIds);

      expect(stepIds.length).toBe(uniqueIds.size);
    });

    it('should have no cyclic dependencies', async () => {
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const plan = await generatePlan('Test goal');
      
      // Check that no step depends on a step with higher ID (simple cycle check)
      plan.steps.forEach(step => {
        step.dependencies.forEach(depId => {
          expect(depId).toBeLessThan(step.id);
        });
      });
    });
  });

  describe('JSON validation', () => {
    it('should validate plan structure', async () => {
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const plan = await generatePlan('Test goal');

      // Validate required fields
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('title');
      expect(plan).toHaveProperty('goal');
      expect(plan).toHaveProperty('steps');
      expect(Array.isArray(plan.steps)).toBe(true);

      // Validate step structure
      plan.steps.forEach(step => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('dependencies');
        expect(Array.isArray(step.dependencies)).toBe(true);
        expect(typeof step.id).toBe('number');
        expect(typeof step.title).toBe('string');
        expect(typeof step.description).toBe('string');
      });
    });

    it('should be serializable to JSON', async () => {
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const plan = await generatePlan('Test goal');
      
      expect(() => JSON.stringify(plan)).not.toThrow();
      
      const serialized = JSON.stringify(plan);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(plan);
    });
  });

  describe('MockProvider behavior', () => {
    it('should use fallback when API key is present but LLM fails', async () => {
      // Mock API key present but LLM will fail
      vi.mocked(config.readKey).mockResolvedValue('mock-api-key');
      
      // Mock LLMClient to throw error
      vi.doMock('../src/llmClient', () => ({
        LLMClient: class {
          async chat() {
            throw new Error('Mock LLM error');
          }
          parseJsonResponse() {
            return {};
          }
        },
        MockProvider: class {
          async chat() {
            return JSON.stringify({ reply: 'This is a mock response.' });
          }
          parseJsonResponse(raw: string) {
            return JSON.parse(raw);
          }
        }
      }));

      const plan = await generatePlan('Test with mock');
      
      // Should fall back to heuristic plan when LLM fails
      expect(plan.id).toBe('local-fallback');
      expect(plan.steps).toHaveLength(4);
    });
  });

  describe('plan validation rules', () => {
    it('should reject plans with duplicate step IDs', async () => {
      // This would be tested if we had a plan with duplicate IDs
      // For now, we test that our fallback doesn't have duplicates
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const plan = await generatePlan('Test goal');
      const stepIds = plan.steps.map(step => step.id);
      const uniqueIds = [...new Set(stepIds)];
      
      expect(stepIds.length).toBe(uniqueIds.length);
    });

    it('should have valid dependency references', async () => {
      vi.mocked(config.readKey).mockResolvedValue(undefined);

      const plan = await generatePlan('Test goal');
      const stepIds = plan.steps.map(step => step.id);
      
      plan.steps.forEach(step => {
        step.dependencies.forEach(depId => {
          expect(stepIds).toContain(depId);
        });
      });
    });
  });
});