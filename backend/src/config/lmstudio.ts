export interface LMStudioConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  temperature: number;
  maxTokens: number;
}

export const lmstudioConfig: LMStudioConfig = {
  baseUrl: process.env.LMSTUDIO_BASE_URL || 'http://192.168.0.18:1234',
  model: process.env.LMSTUDIO_MODEL || 'default',
  timeout: parseInt(process.env.LMSTUDIO_TIMEOUT || '30000', 10),
  temperature: parseFloat(process.env.LMSTUDIO_TEMPERATURE || '0.8'),
  maxTokens: parseInt(process.env.LMSTUDIO_MAX_TOKENS || '150', 10),
};
