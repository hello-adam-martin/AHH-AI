import type { PolicyConfig, FAQConfig, PromptConfig, AppConfig, PropertyFAQResult } from './types';
import { loadPolicyConfig, loadFAQConfig, loadPromptConfig, validateConfigDirectory } from './loaders/yaml';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async loadConfiguration(): Promise<AppConfig> {
    const now = Date.now();
    
    // Return cached config if still fresh
    if (this.config && (now - this.lastLoadTime) < this.CACHE_TTL) {
      return this.config;
    }

    try {
      validateConfigDirectory();

      const policies = loadPolicyConfig();
      const faqs = loadFAQConfig();
      const prompts = loadPromptConfig();

      this.config = {
        policies,
        faqs,
        prompts,
      };

      this.lastLoadTime = now;
      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  public async getPolicyConfig(): Promise<PolicyConfig> {
    const config = await this.loadConfiguration();
    return config.policies;
  }

  public async getFAQConfig(): Promise<FAQConfig> {
    const config = await this.loadConfiguration();
    return config.faqs;
  }

  public async getPromptConfig(): Promise<PromptConfig> {
    const config = await this.loadConfiguration();
    return config.prompts;
  }

  public async getPropertyFAQ(propertyId: string, topic: string): Promise<PropertyFAQResult | null> {
    const config = await this.loadConfiguration();
    
    // Check for property-specific override first
    const propertyOverrides = config.faqs.per_property_overrides[propertyId];
    if (propertyOverrides && propertyOverrides[topic]) {
      return {
        topic,
        answer: propertyOverrides[topic],
        source: 'property_override',
        property_id: propertyId,
      };
    }

    // Fall back to default FAQ
    const defaultAnswer = config.faqs.defaults[topic];
    if (defaultAnswer) {
      return {
        topic,
        answer: defaultAnswer,
        source: 'default',
      };
    }

    return null;
  }

  public async getAllFAQTopics(): Promise<string[]> {
    const config = await this.loadConfiguration();
    return Object.keys(config.faqs.defaults);
  }

  public async getPropertyOverrideTopics(propertyId: string): Promise<string[]> {
    const config = await this.loadConfiguration();
    const overrides = config.faqs.per_property_overrides[propertyId];
    return overrides ? Object.keys(overrides) : [];
  }

  public async isEscalationKeyword(text: string): Promise<boolean> {
    const config = await this.loadConfiguration();
    const keywords = config.policies.escalation.emergency_keywords;
    const lowercaseText = text.toLowerCase();
    
    return keywords.some(keyword => lowercaseText.includes(keyword.toLowerCase()));
  }

  public async requiresIdentityVerification(infoType: string): Promise<boolean> {
    const config = await this.loadConfiguration();
    return config.policies.identity_verification.required_for.includes(infoType);
  }

  public async getConfidenceThresholds(): Promise<PolicyConfig['confidence_thresholds']> {
    const config = await this.loadConfiguration();
    return config.policies.confidence_thresholds;
  }

  public async getApprovalSettings(): Promise<PolicyConfig['approval_settings']> {
    const config = await this.loadConfiguration();
    return config.policies.approval_settings;
  }

  public clearCache(): void {
    this.config = null;
    this.lastLoadTime = 0;
  }

  public getLastLoadTime(): Date | null {
    return this.lastLoadTime > 0 ? new Date(this.lastLoadTime) : null;
  }
}

// Singleton instance for easy access
export const configManager = ConfigManager.getInstance();