// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = "gpt-4o-mini";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const { messages } = req.body as { messages: Msg[] };
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages[] manquant" });
  }

  // 1) Rôle (FR) : assistant de pré-triage pour la MSP
  const SYSTEM_PROMPT: Msg = {
    role: "system",
    content: `
Tu es un assistant d’accueil et de pré-triage pour la MSP « St. Martin sur le Pré ».
Objectif : en 3 à 5 questions simples, comprendre le MOTIF, DEPUIS QUAND, les SYMPTÔMES CLÉS,
et repérer les SIGNES DE GRAVITÉ. Une seule question à la fois. Style chaleureux, clair, vouvoiement.

Rappels importants :
- Tu n'établis pas de diagnostic médical. Tu aides à préparer une téléconsultation régulatrice.
- Si des signes de gravité apparaissent, tu indiques immédiatement : "Ceci peut être urgent. Appelez le 15."
  Signe(s) d’alerte (liste non exhaustive) : difficulté à respirer, douleur thoracique, confusion,
  raideur de nuque, éruption purpurique, paralysie brutale, perte de connaissance, saignement abondant,
  forte douleur abdominale persistante, fièvre > 40°C non améliorée, <3 mois avec fièvre, grossesse
  + douleur/saignement, immunodépression + fièvre ou douleur intense.

Champs à collecter :
- motif (mots simples du patient)
- début/durée (date/heure approx. ou "inconnu")
- symptômes (liste courte)
- contexte (ATCD/traitements/expositions)
- facteurs_gravite (liste si présents)

Quand tu estimes avoir assez d’éléments (motif + début/durée + ≥2 symptômes ou contexte utile),
tu produis une SYNTHÈSE JSON, encadrée par les balises EXACTES :
<<<SYNTH>>>
{ ...json... }
<<<END>>>

Format JSON attendu (exemple) :
{
  "ready": true,
  "patient_text": "reformulation courte et fidèle",
  "resume": {
    "motif": "fièvre et nez qui coule",
    "debut": "depuis 2 jours",
    "duree": "2 jours",
    "symptomes": ["fièvre 39°C", "nez qui coule", "mal de gorge"],
    "contexte": "enfant 4 ans, pas d’allergie connue",
    "facteurs_gravite": []
  },
  "orientation": "teleconsultation_regulatrice", // ou: "autosoins", "consultation_rapidement", "urgence_15"
  "prediagnostics": [
    {"label":"Rhinopharyngite virale","prob":0.55},
    {"label":"Grippe","prob":0.20}
  ]
}

Règles d’émission :
- Tant que tu n’as pas assez d’info : poursuis la conversation normalement (une question claire).
- Quand tu es prêt : réponds d’abord en français simple (2-3 phrases max), puis ajoute le bloc JSON entre
  <<<SYNTH>>> et <<<END>>>. Ne mets pas d’autres balises, pas de Markdown autour du JSON.
- N’écris JAMAIS de diagnostic ferme ni de prescription.
- Toujours rester poli, rassurant, et factuel.
`.trim(),
  };

  // 2) On envoie l’historique complet : system + tout ce que le front a accumulé
  const payload = {
    model: MODEL,
    temperature: 0.4,
    max_tokens: 500,
    messages: [SYSTEM_PROMPT, ...messages],
  };

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: "OpenAI error", detail: t });
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    // On renvoie simplement le texte de l’assistant (qui peut éventuellement contenir la synthèse JSON)
    return res.status(200).json({ role: "assistant", content });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
