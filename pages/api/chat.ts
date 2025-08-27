// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Msg = { role: "user" | "assistant"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = (req.body ?? {}) as { messages?: Msg[] };
    const convo: Msg[] = Array.isArray(body.messages) ? body.messages : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: [
              "Tu es un assistant IA de TRIAGE médical (Soins Non Programmés).",
              "Objectif: préparer la téléconsultation en 2–4 questions maximum puis proposer un mini-résumé.",
              "",
              "RÈGLES STRICTES:",
              "1) NE REPOSE JAMAIS une question déjà posée OU à laquelle le patient a déjà répondu, même partiellement.",
              "2) Si le motif est déjà donné (ex: fièvre + nez qui coule), NE REDEMANDE PAS 'Quel est le motif'. Avance: durée, mesure (T°), symptômes associés pertinents, signes de gravité.",
              "3) Pose 1 à 2 questions courtes à la fois. Langage simple, en français.",
              "4) Adapte aux enfants: âge, état général (boit/joue/respire), tolérance (antalgique, hydratation).",
              "5) Demande les signes de gravité une seule fois (dyspnée, confusion, raideur de nuque, douleur thoracique, déshydratation...). Si oui → 'Si urgence, appelez le 15.'",
              "6) Quand tu as assez d’infos, fournis une synthèse en 4 lignes (sans verbiage):",
              "   - Motif",
              "   - Durée",
              "   - Symptômes/mesures clés (ex: T°)",
              "   - Gravité: oui/non",
            ].join("\n"),
          },

          // FEW-SHOT 1 — Adulte fièvre/rhino (progression sans répétition)
          {
            role: "user",
            content: "J’ai de la fièvre et le nez qui coule.",
          },
          {
            role: "assistant",
            content: "Depuis quand ? Avez-vous mesuré la température ?",
          },
          {
            role: "user",
            content: "Depuis 2 jours, 39°C hier soir.",
          },
          {
            role: "assistant",
            content:
              "Merci. Avez-vous d’autres symptômes (toux, mal de gorge, douleurs) ? Des signes de gravité (difficulté à respirer, confusion, raideur de nuque) ?",
          },

          // FEW-SHOT 2 — Enfant rhino/fièvre
          {
            role: "user",
            content: "Rhino chez ma fille de 4 ans.",
          },
          {
            role: "assistant",
            content:
              "Depuis quand ? Quelle température maximale ? Son état général est-il conservé (elle boit/joue/respire bien) ?",
          },

          // FEW-SHOT 3 — Anti-répétition explicite
          {
            role: "user",
            content: "Mal de gorge depuis 3 jours, 38.5°C.",
          },
          {
            role: "assistant",
            content:
              "Merci. Avez-vous des plaques dans la gorge, des ganglions OU de la toux ?",
          },
          {
            role: "user",
            content: "Pas de plaques ni de ganglions.",
          },
          {
            role: "assistant",
            content:
              "Bien noté. Avez-vous de la toux, une difficulté à avaler, ou un essoufflement ? (Je ne repose pas les questions déjà traitées.)",
          },

          // Conversation réelle
          ...convo,
        ],
      }),
    });

    if (!response.ok) {
      // Ne pas exposer les détails en prod; message patient-safe
      return res.status(200).json({
        reply:
          "Erreur technique. Si urgence, appelez le 15. Sinon, précisez: depuis quand, température, et 2 symptômes clés.",
      });
    }

    const data = await response.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({
      reply: reply || "Pouvez-vous préciser: depuis quand, mesure (ex: T°), et 2 symptômes clés ?",
    });
  } catch {
    return res.status(200).json({
      reply:
        "Incident temporaire. Si urgence appelez le 15. Sinon, indiquez: depuis quand, mesure (ex: T°), symptômes associés.",
    });
  }
}
