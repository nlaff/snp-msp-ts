// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Msg = { role: "user" | "assistant"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Méthode non autorisée" });
  }

  try {
    const { messages } = (req.body ?? {}) as { messages?: Msg[] };
    const convo: Msg[] = Array.isArray(messages) ? messages : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: [
              "Tu es un assistant IA de TRIAGE médical (Soins Non Programmés).",
              "Objectif: en 2–4 questions max, collecter: durée, mesures (ex: température), symptômes associés, signes de gravité.",
              "Règles:",
              "- NE REPOSE JAMAIS une question déjà posée ou déjà répondue.",
              "- Si le motif est donné, ne le redemande pas; avance vers durée/mesure/symptômes/gravité.",
              "- Questions courtes, 1–2 à la fois, français simple.",
              "- Enfant: âge, état général (boit/joue/respire), tolérance (antalgique/hydratation).",
              "- Si signes de gravité → rappeler d’appeler le 15.",
            ].join("\n"),
          },
          ...convo
        ],
      }),
    });

    if (!response.ok) {
      return res.status(200).json({
        reply:
          "Erreur technique. Si urgence, appelez le 15. Sinon, précisez: depuis quand, température, et 2 symptômes clés.",
      });
    }

    const data = await response.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({
      reply:
        reply ||
        "Pouvez-vous préciser: depuis quand, température mesurée, et 2 symptômes clés ?",
    });
  } catch (e) {
    return res.status(200).json({
      reply:
        "Incident temporaire. Si urgence appelez le 15. Sinon, indiquez: depuis quand, mesure (ex: T°), symptômes associés.",
    });
  }
}
