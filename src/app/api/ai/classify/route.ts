import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, peopleAffected } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an emergency classification AI.
Classify the need into:
- category (food, medical, shelter, rescue, other)
- urgency (low, medium, high, critical)
- priority score (1-100)

Consider:
- number of people affected: ${peopleAffected || "unknown"}
- keywords like urgent, emergency, immediately
- risk level
- Title: ${title}
- Description: ${description}

Return JSON only:
{
  "category": "",
  "urgency": "",
  "priority": 0
}`;

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
    const validCategories = ["food", "medical", "shelter", "rescue", "other", "general", "education"];
    const validUrgency = ["low", "medium", "high", "critical"];
    
    if (!validCategories.includes(analysis.category)) analysis.category = "other";
    if (!validUrgency.includes(analysis.urgency)) analysis.urgency = "medium";
    
    const priorityScore = typeof analysis.priority === 'number' ? analysis.priority : parseInt(analysis.priority) || 50;

    return NextResponse.json({
      category: analysis.category,
      urgencyLabel: analysis.urgency,
      priorityScore: priorityScore,
      keywords: [],
      suggestedAction: ""
    });

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
