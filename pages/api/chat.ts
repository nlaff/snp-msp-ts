// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Msg = { role: "user" | "assistant"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Méthode non autorisée" });
  }

  try {
    const { messages } = req.body as { messages?: Msg[] };
    const convo: Msg[] = Array.isArray(messages) ? messages : [];

    // Sécurité : limite simple
    if (convo.length > 20) {
      return res.status(200).json({
        reply:
          "Merci. Pour continuer, résumez en une phrase : motif, depuis quand, 2 symptômes clés.",
      });
    }

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
              "Objectif: préparer la téléconsultation en 2–4 questions maximum puis proposer un mini-résumé.",
              "",
              "RÈGLES STRICTES:",
              "1) NE REPOSE JAMAIS une question déjà posée OU à laquelle le patient a déjà répondu.",
              "2) Si le motif est déjà donné (ex: fièvre + nez qui coule), NE REDEMANDE PAS 'Quel est le motif'. Avance (durée, mesure T°, symptômes associés, signes de gravité).",
              "3) Pose 1 à 2 questions courtes à la fois. Français simple.",
              "4) Enfant: âge, état général (boit/joue/respire), tolérance (antalgique, hydratation).",
              "5) Demande les signes de gravité une seule fois (dyspnée, confusion, raideur de nuque, douleur thoracique, déshydratation...). Si oui → 'Si urgence, appelez le 15.'",
              "6) Quand assez d’infos, fournis une synthèse en 4 lignes : Motif / Durée / Mesures & symptômes clés / Gravité oui/non.",
            ].join("\n"),
          },

          // Micro-priming (Q/R ultra courtes pour pousser le modèle à avancer)
          { role: "user", content: "J’ai de la fièvre et le nez qui coule." },
          { role: "assistant", content: "Depuis quand ? Température mesurée ?" },
          { role: "user", content: "Depuis 2 jours, 39°C hier soir." },
          {
            role: "assistant",
            content:
              "Merci. Un autre symptôme marquant (toux, mal de gorge, douleurs) ? Un signe de gravité (difficulté à respirer, confusion) ?",
          },

          // Conversation réelle envoyée par l’UI
          ...convo,
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
