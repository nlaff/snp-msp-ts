import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const hasKey = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-"));
  res.status(200).json({ hasKey, nodeEnv: process.env.NODE_ENV });
}
