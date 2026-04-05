import { NextRequest } from "next/server";
import { z } from "zod";

const EnhanceSchema = z.object({
  source: z.string().min(10).max(10000),
  instruction: z.string().min(5).max(2000),
  framework: z.enum(["next", "vite", "remix"]).default("next"),
});

// POST /api/magic/enhance — Improve existing TSX
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = EnhanceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const { source, instruction, framework } = parsed.data;

  const systemPrompt = `You are a senior design engineer. You will receive an existing TSX component and an improvement instruction.
Output ONLY the improved TSX file — no markdown fences, no commentary.
Framework: ${framework}
Use Tailwind CSS utility classes and shadcn/ui design system variables.`;

  // Use stub mode if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({
      data: {
        enhanced: source,
        stub: true,
        message: "ANTHROPIC_API_KEY not configured — returning original source",
      },
    });
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the existing component:\n\n${source}\n\nInstruction: ${instruction}`,
        },
      ],
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => ("text" in c ? c.text : ""))
      .join("");

    // Strip markdown fences
    const cleaned = text
      .replace(/^```(?:tsx|typescript)?\n?/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    return Response.json({ data: { enhanced: cleaned } });
  } catch {
    return Response.json({ error: "Enhancement failed", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
