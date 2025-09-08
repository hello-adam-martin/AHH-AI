import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import type { PolicyConfig, FAQConfig, PromptConfig } from '../types';

const PolicySchema = z.object({
  identity_verification: z.object({
    required_for: z.array(z.string()),
    steps: z.array(z.string()),
  }),
  red_lines: z.array(z.string()),
  escalation: z.object({
    triggers: z.array(z.string()),
    emergency_keywords: z.array(z.string()),
  }),
  defaults: z.object({
    checkin_time: z.string(),
    checkout_time: z.string(),
    max_guests_default: z.number(),
    pet_policy: z.string(),
    smoking_policy: z.string(),
    party_policy: z.string(),
  }),
  confidence_thresholds: z.object({
    auto_reply: z.number(),
    approval_required: z.number(),
    escalate_immediately: z.number(),
  }),
  approval_settings: z.object({
    draft_mode_default: z.boolean(),
    require_approval_first_contact: z.boolean(),
    max_auto_replies_per_hour: z.number(),
    approval_timeout_hours: z.number(),
  }),
});

const FAQSchema = z.object({
  defaults: z.record(z.string()),
  per_property_overrides: z.record(z.record(z.string())),
});

export class ConfigurationError extends Error {
  constructor(message: string, public readonly configType: string, public readonly filePath: string) {
    super(`Configuration error in ${configType} (${filePath}): ${message}`);
    this.name = 'ConfigurationError';
  }
}

export function getConfigPath(relativePath: string): string {
  const projectRoot = process.cwd();
  return path.join(projectRoot, 'config', relativePath);
}

export function loadYamlFile<T>(filePath: string, schema?: z.ZodSchema<T>): T {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents) as T;

    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        throw new ConfigurationError(
          `Schema validation failed: ${result.error.message}`,
          path.basename(filePath),
          filePath
        );
      }
      return result.data;
    }

    return data;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError(
      `Failed to load YAML: ${error instanceof Error ? error.message : String(error)}`,
      path.basename(filePath),
      filePath
    );
  }
}

export function loadPolicyConfig(): PolicyConfig {
  const filePath = getConfigPath('policies.yaml');
  return loadYamlFile(filePath, PolicySchema);
}

export function loadFAQConfig(): FAQConfig {
  const filePath = getConfigPath('faqs.yaml');
  return loadYamlFile(filePath, FAQSchema);
}

export function loadPromptConfig(): PromptConfig {
  const systemPath = getConfigPath('prompts/system.txt');
  const toolsPath = getConfigPath('prompts/tools.txt');

  try {
    const system = fs.readFileSync(systemPath, 'utf8');
    const tools = fs.readFileSync(toolsPath, 'utf8');

    return { system, tools };
  } catch (error) {
    throw new ConfigurationError(
      `Failed to load prompt files: ${error instanceof Error ? error.message : String(error)}`,
      'prompts',
      'config/prompts/'
    );
  }
}

export function validateConfigDirectory(): void {
  const configDir = getConfigPath('');
  if (!fs.existsSync(configDir)) {
    throw new ConfigurationError(
      'Config directory does not exist',
      'directory',
      configDir
    );
  }

  const requiredFiles = [
    'policies.yaml',
    'faqs.yaml',
    'prompts/system.txt',
    'prompts/tools.txt',
  ];

  for (const file of requiredFiles) {
    const filePath = getConfigPath(file);
    if (!fs.existsSync(filePath)) {
      throw new ConfigurationError(
        `Required configuration file missing: ${file}`,
        'file',
        filePath
      );
    }
  }
}