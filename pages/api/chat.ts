import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Assistant de pré-régulation SNP.
 * Répond STRICTEMENT en JSON (response_format= json_object) avec l’un des deux formats :
 *
 * a) Relance :
 *    { "ask": "question courte de relance" }
 *
 * b) Synthèse finale :
 *    {
 *      "final": {
 *        "session_id": "SNP-YYMMDD-XXXX",
 *        "patient": { "age": null | number, "sex": null | "F" | "M" },
 *        "context": { "is_child": boolean, "chronic_known": boolean },
 *        "chief_complaint": string,
 *        "onset_duration": string,
 *        "severity": "faible" | "modérée" | "élevée",
 *        "red_flags": string[],
 *        "triage": "URGENT_15" | "TC_PRIORITAIRE" | "TC_STANDARD",
 *        "recommendation": "appeler_15" | "teleconsultation_regulatrice" | "consultation_physique",
 *        "summary_patient": string,
 *        "summary_md": string,
 *        "estimated_slot_min": 10 | 15
 *      }
 *    }
 *
 * Règles :
 * - 2–4 relances max, style empathique, français, phrases courtes, pas de diagnostic.
 * - Red flags → triage="URGENT_15", recommendation="appeler_15".
 * - Sinon → recommendation="teleconsultation_regulatrice".
 * - Si âge/sex inconnus → null.
 */

const SYSTEM_PROMPT = `
Tu es un assistant IA de pré-régulation en soins non programmés (SNP) pour une MSP.
Ton but : poser quelques questions essentielles, détecter les signaux d’alerte, puis produire une synthèse exploitable.

Ne renvoie JAMAIS de texte hors JSON. Format autorisé :
- { "ask": "..." }
- { "final": { ... } }

Quand tu manques d'informations, pose UNE question pertinente (champ "ask").
Quand tu as assez d'éléments, renvoie "final" complet (voir schéma).
`;

type Msg = { role: "user" | "assistant"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = (req.body ?? {}) as { messages?: Msg[] };

    // Sécurité : tableau de messages
    const convo: Msg[] = Array.isArray(messages) ? messages : [];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...convo,
        ],
      }),
    });

    // Si OpenAI renvoie une erreur HTTP
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("OpenAI HTTP error:", r.status, errText);
      return res.status(200).json({
        ask: "Je n’ai pas réussi à analyser. Pouvez-vous reformuler en précisant le motif, depuis quand et les symptômes clés ?",
      });
    }

    const payload = await r.json();

    // Erreur formelle OpenAI
    if (payload?.error) {
      console.error("OpenAI payload error:", payload.error);
      return res.status(200).json({
        ask: "Un contretemps technique. Pouvez-vous redire le motif brièvement (motif, durée, symptômes) ?",
      });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(200).json({
        ask: "Je n’ai pas bien compris. Quel est le motif principal et depuis quand ?",
      });
    }

    let data: any;
    try {
      data = JSON.parse(content);
    } catch (e) {
      // Le modèle a répondu avec autre chose que du JSON pur
      console.warn("Non-JSON content from model:", content);
      return res.status(200).json({
        ask: "Pour être sûr, pouvez-vous préciser en une phrase : motif + depuis quand + symptômes majeurs ?",
      });
    }

    // Normalisation : si final sans session_id → en créer un
    if (data?.final && !data.final.session_id) {
      const d = new Date();
      const yymmdd = d.toISOString().slice(2, 10).replace(/-/g, "");
      data.final.session_id = `SNP-${yymmdd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }

    // Si ni ask ni final → relance claire
    if (!data?.ask && !data?.final) {
      return res.status(200).json({
        ask: "Pouvez-vous préciser : motif principal, durée, symptômes clés (ex : fièvre, douleur, vomissements) ?",
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error("API error:", e);
    // Fallback user-friendly
    return res.status(200).json({
      ask: "Petit souci technique. Pouvez-vous redire en une phrase : motif + depuis quand + 2 symptômes clés ?",
    });
  }
}
