import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper function to generate content using Gemini API
export async function generateContent(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.warn('Gemini API key not found');
    return '';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      ...(systemInstruction && { systemInstruction }),
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

// Helper for chat-style conversations
export async function generateChatContent(
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction?: string,
  temperature: number = 0.4
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.warn('Gemini API key not found');
    return '';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      ...(systemInstruction && { systemInstruction }),
    });

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature,
      },
    });
    
    return result.response.text();
  } catch (error) {
    console.error('Error generating chat content:', error);
    throw error;
  }
}
