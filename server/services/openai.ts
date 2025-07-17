import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || ''
});

export class OpenAIService {
  async generateMovieMetadata(title: string, year?: number): Promise<any> {
    if (!process.env.OPENAI_API_KEY && !process.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `Generate metadata for the movie "${title}"${year ? ` from ${year}` : ''}. Provide the following information in JSON format:
      {
        "title": "exact movie title",
        "year": release_year_number,
        "runtime": runtime_in_minutes_number,
        "rating": "MPAA_rating_string",
        "description": "detailed plot summary",
        "director": "director name",
        "cast": ["actor1", "actor2", "actor3", "actor4", "actor5"],
        "genres": ["genre1", "genre2", "genre3"]
      }
      
      Only provide real, accurate information. If you're unsure about any details, use null for that field.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a movie database expert. Provide accurate movie metadata in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI metadata generation error:', error);
      throw error;
    }
  }

  async enhanceMovieDescription(title: string, currentDescription?: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY && !process.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = currentDescription 
        ? `Enhance this movie description for "${title}": ${currentDescription}. Make it more engaging and detailed while keeping it factually accurate.`
        : `Write a compelling, detailed description for the movie "${title}". Focus on the plot, themes, and what makes this movie notable.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a film critic and movie database expert. Write engaging, accurate movie descriptions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      });

      return response.choices[0].message.content || currentDescription || '';
    } catch (error) {
      console.error('OpenAI description enhancement error:', error);
      return currentDescription || '';
    }
  }
}

export const openaiService = new OpenAIService();
