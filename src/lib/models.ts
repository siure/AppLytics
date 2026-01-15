export type Provider = "openai" | "google";

export interface Model {
  id: string;
  name: string;
  description: string;
  provider: Provider;
}

export const providers: { id: Provider; name: string }[] = [
  { id: "openai", name: "OpenAI" },
  { id: "google", name: "Google" },
];

export const models: Model[] = [
  // OpenAI Models
  {
    id: "gpt-5.2-instant",
    name: "GPT 5.2 Instant",
    description: "Fast and efficient for quick modifications",
    provider: "openai",
  },
  {
    id: "gpt-5.2-reasoning-medium",
    name: "GPT 5.2 Reasoning Medium",
    description: "Enhanced reasoning capabilities",
    provider: "openai",
  },
  {
    id: "gpt-5-mini",
    name: "GPT 5 Mini",
    description: "Compact but powerful model",
    provider: "openai",
  },
  // Google Models
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Ultra-fast responses",
    provider: "google",
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    description: "Advanced capabilities for complex tasks",
    provider: "google",
  },
];

export function getModelsByProvider(provider: Provider): Model[] {
  return models.filter((model) => model.provider === provider);
}

export function getModelById(id: string): Model | undefined {
  return models.find((model) => model.id === id);
}

export function getDefaultModel(provider: Provider): Model {
  const providerModels = getModelsByProvider(provider);
  return providerModels[0];
}
