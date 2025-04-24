import { myProvider } from '@/lib/ai/providers';
import { sheetPrompt, SURVEY_JSON_PROMPT, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';

// Helper function to convert JSON survey data to CSV
function convertSurveyJsonToCsv(surveyData: any[]): string {
  if (!Array.isArray(surveyData) || surveyData.length === 0) {
    return '';
  }
  
  // Get headers from the first object's keys
  const headers = Object.keys(surveyData[0]);
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Add data rows
  surveyData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Handle strings with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += values.join(',') + '\n';
  });
  
  return csv;
}

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';
    
    // Check if this is a survey request
    const isSurveyRequest = title.startsWith("Survey Results:");
    
    // Extract the actual survey question if this is a survey request
    const prompt = isSurveyRequest 
      ? title.substring("Survey Results:".length).trim() 
      : title;
    
    if (isSurveyRequest) {
      // For surveys, use JSON approach for better structure
      const { fullStream } = streamObject({
        model: myProvider.languageModel('artifact-model'),
        system: SURVEY_JSON_PROMPT,
        prompt: prompt,
        schema: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            age: z.number(),
            gender: z.string(),
            location: z.string(),
            occupation: z.string(),
            income_bracket: z.string(),
            education: z.string(),
            response: z.string(),
            sentiment: z.string()
          })
        ).describe('Survey respondents data'),
      });
      
      // Collect the JSON data
      let surveyData: any[] = [];
      
      for await (const delta of fullStream) {
        const { type } = delta;
        
        if (type === 'object') {
          const { object } = delta;
          surveyData = object;
          
          // Convert JSON to CSV
          const csv = convertSurveyJsonToCsv(surveyData);
          draftContent = csv;
          
          // Stream the CSV to the client
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv,
          });
        }
      }
      
      return draftContent;
    } else {
      // For regular sheets, use the original CSV approach
      const { fullStream } = streamObject({
        model: myProvider.languageModel('artifact-model'),
        system: sheetPrompt,
        prompt: prompt,
        schema: z.object({
          csv: z.string().describe('CSV data'),
        }),
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === 'object') {
          const { object } = delta;
          const { csv } = object;

          if (csv) {
            dataStream.writeData({
              type: 'sheet-delta',
              content: csv,
            });

            draftContent = csv;
          }
        }
      }

      dataStream.writeData({
        type: 'sheet-delta',
        content: draftContent,
      });

      return draftContent;
    }
  },
  onUpdateDocument: async ({ document, description, dataStream }: { document: any; description: string; dataStream: any }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'sheet'),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
