import type { NextApiRequest, NextApiResponse } from "next";

const SYSTEM_PROMPT = `
Tu es un assistant IA de pré-régulation SNP. 
Pose quelques questions, puis sors une synthèse JSON exploitable par un médecin.
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = req.body ?? {};

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(Array.isArray(messages) ? messages : [])
        ]
      })
    });

    const payload = await r.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: "no_content_from_ai" });

    const data = JSON.parse(content);
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "chat_failed" });
  }
}
