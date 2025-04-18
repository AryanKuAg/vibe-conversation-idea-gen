import { ChatTogetherAI } from '@langchain/community/chat_models/together_ai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

// This is a placeholder for the Together API key
// In production, this should be stored in an environment variable
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';

// Initialize the Together AI model
export const chatModel = new ChatTogetherAI({
  apiKey: TOGETHER_API_KEY,
  modelName: 'mistralai/Mixtral-8x7B-Instruct-v0.1', // You can change this to any model supported by Together AI
  temperature: 0.7,
});

// Create a prompt template for analyzing conversations
export const conversationAnalysisPrompt = PromptTemplate.fromTemplate(`
You are an expert business analyst and product developer. Your task is to analyze the following conversation
and identify business opportunities based on the pain points and inefficiencies mentioned.

Conversation:
{conversation}

Please analyze this conversation and identify:
1. The main pain points or inefficiencies in the person's workflow
2. Potential business solutions that would address these pain points
3. Why people would be willing to pay for these solutions
4. The viability of each solution (score from 1-10)

Format your response as JSON with the following structure:
{
  "ideas": [
    {
      "title": "Brief title of the business idea",
      "description": "A short description of the business opportunity",
      "painPoints": ["Pain point 1", "Pain point 2", ...],
      "solution": "Detailed description of the proposed solution",
      "viabilityScore": 8,
      "reasonsToPay": ["Reason 1", "Reason 2", ...]
    },
    ...
  ]
}

Only include ideas that you believe are truly viable and that people would pay for.
`);

// Create a runnable sequence for analyzing conversations
export const conversationAnalyzer = RunnableSequence.from([
  conversationAnalysisPrompt,
  chatModel,
  new StringOutputParser(),
]);

// Function to parse the LLM output into a structured format
export const parseAnalysisOutput = (output: string) => {
  try {
    // Try to parse the output as JSON
    return JSON.parse(output);
  } catch (error) {
    console.error('Error parsing LLM output:', error);
    // If parsing fails, return null
    return null;
  }
};
