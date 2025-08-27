// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API ultra-simple : on envoie la conversation à OpenAI
 * et on renvoie un champ { reply: string }.
 *
 * Prérequis Vercel :
 *   OPENAI_API_KEY = sk-********************************
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = (req.body ?? {}) as {
      messages?: { role: "user" | "assistant"; content: string }[];
    };

    const convo = Array.isArray(messages) ? messages : [];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant médical de triage (SNP). Tu poses des questions courtes et claires (motif, depuis quand, symptômes, éléments de gravité). Réponds en français.",
          },
          ...convo,
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("OpenAI HTTP error:", r.status, txt);
      return res.status(200).json({
        reply:
          "Petit souci technique. Pouvez-vous redire en une phrase : motif, depuis quand, et les 2 symptômes principaux ?",
      });
    }

    const payload = await r.json();
    const reply = payload?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({
      reply: reply || "Je n’ai pas compris. Motif, depuis quand, symptômes clés ?",
    });
  } catch (e) {
    console.error("API error:", e);
    return res.status(200).json({
      reply:
        "Je n’ai pas réussi à analyser. Pouvez-vous préciser : motif, depuis quand et symptômes principaux ?",
    });
  }
}
