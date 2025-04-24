import { myProvider } from '@/lib/ai/providers';
import { sheetPrompt, SURVEY_JSON_PROMPT, SYNTHETIC_PROFILE_PROMPT, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Load the synthetic profile schema
let syntheticProfileSchema: any;
try {
  syntheticProfileSchema = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'lib/schemas/synthetic_profile_schema.json'), 'utf-8')
  );
} catch (error) {
  console.error('Error loading synthetic profile schema:', error);
  // Fallback to an empty schema if the file can't be loaded
  syntheticProfileSchema = {};
}

// Helper function to flatten a nested object for CSV conversion
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  // Special handling for important fields to ensure they appear prominently in the CSV
  const result: Record<string, any> = {};
  
  // First add demographic fields if they exist
  if (obj.demographics) {
    result['ID'] = obj.demographics.id;
    result['Name'] = obj.demographics.name;
    result['Age'] = obj.demographics.age;
    result['Gender'] = obj.demographics.gender;
    result['Location'] = obj.demographics.location;
    result['Ethnicity'] = obj.demographics.ethnicity;
    result['Income Bracket'] = obj.demographics.income_bracket;
    result['Education Level'] = obj.demographics.education_level;
  }
  
  // Then add survey response fields if they exist
  if (obj.survey_response) {
    result['Survey Question'] = obj.survey_response.question;
    result['Survey Response'] = obj.survey_response.answer;
    result['Response Sentiment'] = obj.survey_response.sentiment;
  }
  
  // Then add all other flattened fields
  Object.keys(obj).forEach(key => {
    // Skip fields we've already handled
    if (key === 'demographics' || key === 'survey_response') return;
    
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], prefixedKey));
    } else if (Array.isArray(obj[key])) {
      result[prefixedKey] = obj[key].join(', ');
    } else {
      result[prefixedKey] = obj[key];
    }
  });
  
  return result;
}

// Helper function to convert synthetic profiles to CSV
function convertSyntheticProfilesToCSV(profiles: any[]): string {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return '';
  }
  
  // Flatten each profile
  const flattenedProfiles = profiles.map(profile => flattenObject(profile));
  
  // Get all unique headers
  const headers = Array.from(
    new Set(flattenedProfiles.flatMap(profile => Object.keys(profile)))
  );
  
  // Create CSV header row with formatted headers
  const headerRow = headers.map(header => {
    // Replace underscores with spaces and capitalize each word
    return header.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }).join(',');
  
  let csv = headerRow + '\n';
  
  // Add data rows
  flattenedProfiles.forEach(profile => {
    const values = headers.map(header => {
      const value = profile[header];
      
      // Handle undefined or null values
      if (value === undefined || value === null) {
        return '';
      }
      
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

// Helper function to convert JSON survey data to CSV
function convertSurveyJsonToCsv(surveyData: any[]): string {
  if (!Array.isArray(surveyData) || surveyData.length === 0) {
    return '';
  }
  
  // Define the exact headers we want in the specific order for the sheet
  const orderedHeaders = [
    'id', 'name', 'age', 'gender', 'location', 'occupation', 
    'income_bracket', 'education', 'response', 'sentiment'
  ];
  
  // Create CSV header row with capitalized headers
  const headerRow = orderedHeaders.map(header => {
    // Capitalize and replace underscores with spaces
    return header.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }).join(',');
  
  let csv = headerRow + '\n';
  
  // Add data rows in the correct order
  surveyData.forEach(row => {
    const values = orderedHeaders.map(header => {
      const value = row[header];
      // Handle strings with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      // Handle undefined or null values
      if (value === undefined || value === null) {
        return '';
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
    
    // Check if this is a survey or synthetic profile request
    const isSurveyRequest = title.startsWith("Survey Results:");
    const isSyntheticProfileRequest = title.startsWith("Synthetic Profiles:");
    
    // Extract the actual prompt
    let prompt = title;
    if (isSurveyRequest) {
      prompt = title.substring("Survey Results:".length).trim();
    } else if (isSyntheticProfileRequest) {
      prompt = title.substring("Synthetic Profiles:".length).trim();
    }
    
    if (isSyntheticProfileRequest) {
      // For synthetic profiles, use the schema-based approach
      try {
        const { fullStream } = streamObject({
          model: myProvider.languageModel('artifact-model'), // Using artifact-model as fallback if gpt-4.1-nano isn't available
          system: SYNTHETIC_PROFILE_PROMPT,
          prompt: prompt,
          schema: syntheticProfileSchema,
          maxTokens: 4000,
        });
        
        // Collect the profiles
        let profiles: any[] = [];
        
        for await (const delta of fullStream) {
          const { type } = delta;
          
          if (type === 'object') {
            const { object } = delta;
            // Add this profile to our collection
            profiles.push(object);
            
            // Convert profiles to CSV
            const csv = convertSyntheticProfilesToCSV(profiles);
            draftContent = csv;
            
            // Stream the CSV to the client
            dataStream.writeData({
              type: 'sheet-delta',
              content: csv,
            });
          }
        }
        
        return draftContent;
      } catch (error) {
        console.error('Error generating synthetic profiles:', error);
        // Fallback to a simple error message
        const errorMessage = 'Error generating synthetic profiles. Please try again.';
        dataStream.writeData({
          type: 'sheet-delta',
          content: errorMessage,
        });
        return errorMessage;
      }
    } else if (isSurveyRequest) {
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
