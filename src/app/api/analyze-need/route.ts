import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

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
        "category": "food" | "medical" | "shelter" | "education" | "other",
        "priority": "low" | "medium" | "high" | "emergency",
        "skills": ["skill1", "skill2"],
        "summary": "a brief 1-sentence summary of the need"
      }
      
      Rules:
      - Category must be one of the specified strings.
      - Priority must be one of the specified strings (emergency is highest priority).
      - Skills should be relevant to the description.
      - Ensure the output is valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON response (sometimes Gemini wraps in ```json ... ```)
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
    const categories = ["food", "medical", "shelter", "education", "other"];
    const priorities = ["low", "medium", "high", "emergency"];
    
    if (!categories.includes(analysis.category)) analysis.category = "other";
    if (!priorities.includes(analysis.priority)) analysis.priority = "medium";
    if (!Array.isArray(analysis.skills)) analysis.skills = [];

    console.log("AI Analysis Success:", analysis);
    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Safety Fallback
    return NextResponse.json({
      category: "other",
      priority: "medium",
      skills: [],
      summary: "Description provided for manual review.",
      error: error.message
    }, { status: 200 }); // Return 200 with fallback to prevent frontend crash
  }
}
