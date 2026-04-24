import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze the following NGO need and categorize it.
      
      Title: ${title}
      Description: ${description}
      
      Return ONLY a JSON object with the following structure:
      {
        "category": "food" | "medical" | "shelter" | "general" | "other",
        "urgency": "low" | "medium" | "high",
        "priorityScore": 1-100,
        "keywords": ["array of 3-5 keywords"],
        "suggestedAction": "short recommendation for volunteers"
      }
      
      Rules:
      - Category must be one of: food, medical, shelter, general, other.
      - Urgency must be one of: low, medium, high.
      - PriorityScore must be an integer between 1 and 100 based on urgency, keywords (e.g. emergency, injured), and context.
      - Do not include any other text, markdown formatting, or explanations. Ensure the output is strictly valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON response to ensure safety if Gemini wraps it in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;
    
    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Invalid AI response format");
    }

    // Validation & Fallbacks
    const validCategories = ["food", "medical", "shelter", "general", "other"];
    const validUrgency = ["low", "medium", "high"];
    
    if (!validCategories.includes(analysis.category)) analysis.category = "general";
    if (!validUrgency.includes(analysis.urgency)) analysis.urgency = "medium";
    if (typeof analysis.priorityScore !== 'number') analysis.priorityScore = 50;
    if (!Array.isArray(analysis.keywords)) analysis.keywords = [];
    if (!analysis.suggestedAction) analysis.suggestedAction = "Assess the situation and provide appropriate assistance.";


    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Safety Fallback as requested
    return NextResponse.json({
      category: "general",
      urgency: "medium",
      priorityScore: 50,
      keywords: ["general"],
      suggestedAction: "Check details manually and coordinate.",
      error: error.message
    }, { status: 200 }); // Return 200 to not break frontend flow
  }
}
