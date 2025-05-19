import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

// Initialize OpenAI provider with API key from environment variables
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const myProvider = isTestEnvironment
  ? customProvider({
      // Test environment configuration remains unchanged
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      // Production environment now uses OpenAI models
      languageModels: {
        // Main chat model for general interactions
        'chat-model': openai('gpt-4.1-nano'),
        
        // Chat model with reasoning capabilities for more complex tasks
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4.1-nano'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        
        // Model for generating titles
        'title-model': openai('gpt-4.1-nano'),
        
        // Model for generating document artifacts (text, sheets, etc.)
        'artifact-model': openai('gpt-4.1-nano'),
      },
      
      // Image generation model
      imageModels: {
        'small-model': openai.image('gpt-image-1'),
      },
    });
