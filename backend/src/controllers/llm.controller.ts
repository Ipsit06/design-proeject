import type { Request, Response } from 'express';
import { llmAssistSchema } from '../validators/index.js';

export async function assistTokens(req: Request, res: Response): Promise<void> {
  const parsed = llmAssistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
    return;
  }

  const { tokens } = parsed.data;
  
  // Format tokens cleanly into sentence
  const words = tokens.map((t) => {
    const clean = t.replace(/_/g, ' ').toLowerCase();
    return clean;
  });

  const rawSentence = words.join(' ');
  const capitalized = rawSentence.charAt(0).toUpperCase() + rawSentence.slice(1);
  const sentence = capitalized.endsWith('.') ? capitalized : `${capitalized}.`;

  res.json({
    sentence,
    provider: 'local_heuristic',
    explanation: 'Heuristic sentence constructor for recognized sign tokens.',
  });
}
