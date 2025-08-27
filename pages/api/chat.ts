// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Simple proxy vers OpenAI qui renvoie { reply: string }.
 * Le prompt est très prescriptif + exemples (few-shot)
 * pour éviter de reposer "Quel est le motif ?" si l'info est déjà présente.
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
            content: [
              "Tu es un assistant IA de TRIAGE médical (Soins Non Programmés).",
              "Objectif: préparer la téléconsultation en 2–4 questions maximum puis proposer un mini-résumé.",
              "",
              "RÈGLES DE COMPORTEMENT:",
              "1) Si le motif/symptômes sont DÉJÀ mentionnés (ex: 'fièvre', 'mal de gorge', 'rhume enfant'), NE REDEMANDE PAS le motif.",
              "   Passe directement à: durée (depuis quand), intensité/mesure (ex: température), symptômes associés pertinents, et signes de gravité.",
              "2) Questions courtes, une ou deux à la fois. Langage simple, en français.",
              "3) Pas de doublons: ne repose JAMAIS deux fois la même question sous une autre forme.",
              "4) Adapter aux enfants: demander l’âge, l’état général (boit/joue/respire), tolérance (antalgique, hydratation).",
              "5) En cas de détresse (douleur thoracique, détresse respi, confusion…), orienter: 'Si urgence, appelez le 15.'",
              "6) Quand tu as assez d’infos, écris une courte synthèse en 4 lignes:",
              "   - Motif",
              "   - Durée",
              "   - Symptômes clés / mesure (ex: T°, douleur, toux…)",
              "   - Éléments de gravité: oui/non",
            ].join("\n"),
          },

          // FEW-SHOT 1 — Adulte fièvre/rhino
          {
            role: "user",
            content: "J’ai de la fièvre et le nez qui coule.",
          },
          {
            role: "assistant",
            content:
              "Merci. Depuis combien de temps la fièvre a-t-elle commencé ? Avez-vous mesuré la température (et à combien) ?",
          },
          {
            role: "user",
            content: "Depuis 2 jours, 39°C hier soir.",
          },
          {
            role: "assistant",
            content:
              "Noté. Avez-vous d’autres symptômes (toux, mal de gorge, douleurs) ? Et des signes de gravité (difficulté à respirer, confusion, raideur de nuque) ?",
          },

          // FEW-SHOT 2 — Enfant rhino/fièvre
          {
            role: "user",
            content: "Rhino chez ma fille de 4 ans.",
          },
          {
            role: "assistant",
            content:
              "Merci. Depuis quand ? Quelle température maximale ? Son état général est-il conservé (elle boit/joue/respire bien) ?",
          },

          // FEW-SHOT 3 — Ne jamais reposer “motif”
          {
            role: "user",
            content: "Bonjour, mal de gorge depuis 3 jours.",
          },
          {
            role: "assistant",
            content:
              "Merci. Avez-vous de la fièvre (mesurée) ? Avez-vous des ganglions, des plaques dans la gorge, ou de la toux ?",
          },

          // Conversation réelle
          ...convo,
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(200).json({
        reply: `Erreur technique (${r.status}). Si urgence, appelez le 15. Sinon, reformulez : durée, mesure (ex: T°), symptômes associés.`,
      });
    }

    const payload = await r.json();
    const reply = payload?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({
      reply: reply || "Je n’ai pas compris. Pouvez-vous préciser: depuis quand, mesure (ex: T°), et 2 symptômes clés ?",
    });
  } catch (e: any) {
    return res.status(200).json({
      reply:
        "Incident temporaire. Si urgence appelez le 15. Sinon, indiquez : depuis quand, mesure (ex: T°), symptômes associés.",
    });
  }
}
