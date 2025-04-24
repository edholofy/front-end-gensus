import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { updateDocumentPrompt, SURVEY_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    // Check if this is a survey request
    const isSurveyRequest = title.startsWith("Survey Results:");
    
    // Extract the actual survey question if this is a survey request
    const prompt = isSurveyRequest 
      ? title.substring("Survey Results:".length).trim() 
      : title;
    
    // Use the appropriate system prompt based on request type
    const systemPrompt = isSurveyRequest 
      ? SURVEY_SYSTEM_PROMPT 
      : 'Write about the given topic. Markdown is supported. Use headings wherever appropriate.';

    // For survey requests, use the chat model which has better capabilities for structured output
    // For regular documents, continue using the artifact model
    const { fullStream } = streamText({
      model: myProvider.languageModel(isSurveyRequest ? 'chat-model' : 'artifact-model'),
      system: systemPrompt,
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: prompt,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { textDelta } = delta;

        draftContent += textDelta;

        dataStream.writeData({
          type: 'text-delta',
          content: textDelta,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'text'),
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: description,
      experimental_providerMetadata: {
        openai: {
          prediction: {
            type: 'content',
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { textDelta } = delta;

        draftContent += textDelta;
        dataStream.writeData({
          type: 'text-delta',
          content: textDelta,
        });
      }
    }

    return draftContent;
  },
});
