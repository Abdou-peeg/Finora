const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
}

export async function callGemini(opts: {
  systemInstruction: string;
  contents: GeminiMessage[];
  functionDeclarations?: GeminiFunctionDeclaration[];
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");

  const body: any = {
    systemInstruction: { parts: [{ text: opts.systemInstruction }] },
    contents: opts.contents,
  };
  if (opts.functionDeclarations?.length) {
    body.tools = [{ functionDeclarations: opts.functionDeclarations }];
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erreur Gemini (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts: any[] = candidate?.content?.parts || [];

  const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
  const text = parts.filter((p) => p.text).map((p) => p.text).join("\n");

  return { text, functionCalls, rawParts: parts };
}