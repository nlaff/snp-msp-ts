// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

// --- petits utilitaires de parsing ----------------------------------------------------------------

function normalize(txt: string) {
  return txt
    .toLowerCase()
    .replace(/[àáâãä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùü]/g, "u");
}

function extractTemp(all: string): number | null {
  // 39 / 39.5 / 39,2 / 39° / 39.2°C
  const m = all.match(/(\d{2}(?:[.,]\d)?)\s*°?\s*c?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (n >= 34 && n <= 43) return n;
  return null;
}

function extractDays(all: string): number | null {
  // "2 jours", "depuis 3 j", "3j", "4 jours", "48h" (≈2 jours)
  const mDays = all.match(/(\d+)\s*(?:j|jour|jours)\b/i);
  if (mDays) return parseInt(mDays[1], 10);
  const mHours = all.match(/(\d+)\s*(?:h|heures?)/i);
  if (mHours) return Math.round(parseInt(mHours[1], 10) / 24);
  return null;
}

const SYMPTOMS = [
  "toux",
  "nez qui coule",
  "rhinite",
  "rhume",
  "maux de gorge",
  "mal a la gorge",
  "plaques dans la gorge",
  "ganglions",
  "douleurs musculaires",
  "courbatures",
  "maux de tete",
  "cephalee",
  "vomissements",
  "diarrhee",
  "essoufflement",
];

function extractSymptoms(all: string): string[] {
  const L = normalize(all);
  const found = new Set<string>();
  for (const s of SYMPTOMS) {
    const n = normalize(s);
    if (L.includes(n)) found.add(s);
  }
  return Array.from(found);
}

function hasMotif(all: string): boolean {
  const L = normalize(all);
  return (
    L.includes("fievre") ||
    L.includes("rhinite") ||
    L.includes("rhume") ||
    L.includes("toux") ||
    L.includes("gorge") ||
    L.includes("otite") ||
    L.includes("diarrhee") ||
    L.includes("vomissements") ||
    L.includes("douleur")
  );
}

// --- handler --------------------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Le front t’envoie { messages: [{role:"user"|"assistant", content:string}, ...] }
  const body = req.body || {};
  const messages: Array<{ role: "user" | "assistant"; content: string }> = body.messages || [];

  // On lit les 6 derniers échanges pour extraire des infos globales
  const recent = messages.slice(-6);
  const allText = recent.map((m) => m.content).join("\n");

  // extraction
  const has_motif = hasMotif(allText);
  const temp = extractTemp(allText);
  const days = extractDays(allText);
  const symptoms = extractSymptoms(allText);

  // logique "une question à la fois"
  let reply = "";

  if (!has_motif) {
    reply = "Quel est le motif de votre consultation (ex. fièvre, rhinite, toux, mal de gorge) ?";
  } else if (temp === null && normalize(allText).includes("fievre")) {
    reply =
      "Merci. Avez-vous mesuré la température ? Si oui, quelle valeur (ex. 38.5°C) ? Sinon, dites juste « pas prise ».";
  } else if (days === null) {
    reply = "Depuis combien de temps cela dure-t-il (ex. 2 jours, 48h) ?";
  } else if (symptoms.length === 0) {
    reply =
      "Quels sont vos 1 à 2 symptômes principaux associés (ex. nez qui coule, toux, maux de gorge, ganglions) ?";
  } else {
    // On a l'essentiel : motif présent, durée trouvée, ≥1 symptôme (et temp si fièvre)
    const tempPart =
      temp !== null ? `Température mesurée : ${temp.toFixed(1)}°C. ` : "";
    reply =
      `Parfait, j’ai bien noté. ${tempPart}Durée : ${days} jour(s). ` +
      `Symptômes clés : ${symptoms.slice(0, 3).join(", ")}. ` +
      `Si tout est correct, écrivez « synthèse » pour que je prépare le résumé pour le médecin.`;
  }

  // Si la personne tape "synthèse", on renvoie un petit JSON prêt à être affiché côté front
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  if (normalize(lastUser).includes("synthese")) {
    return res.status(200).json({
      summary: {
        motif_present: has_motif,
        temperature_c: temp,
        duree_jours: days,
        symptomes: symptoms,
        note: "Exemple de payload de synthèse (à pousser dans MadeForMed plus tard).",
      },
    });
  }

  // réponse "assistant" classique
  return res.status(200).json({ reply });
}
