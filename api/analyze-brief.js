const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { briefText } = req.body;
  if (!briefText || !briefText.trim()) {
    return res.status(400).json({ error: 'No brief text provided' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      // temperature=0 → deterministic parsing. Same brief always produces the
      // same JSON, so the same brief always produces the same match scores.
      temperature: 0,
      messages: [{
        role: 'user',
        content: `You are a music supervisor assistant. Analyze this sync licensing brief and extract structured musical requirements.

Brief:
${briefText}

Return ONLY valid JSON in exactly this format (no markdown, no explanation):
{
  "summary": "One concise sentence describing what this brief is looking for",
  "supervisorName": "supervisor name if found in the text, or null",
  "company": "company or network name if found, or null",
  "project": "show, film, or project name if found, or null",
  "genres": ["genre1", "genre2"],
  "moods": ["mood1", "mood2", "mood3"],
  "bpmMin": 90,
  "bpmMax": 120,
  "preferredKeys": ["minor"],
  "vocalsWanted": "Yes or No or Either",
  "energyMin": 40,
  "energyMax": 80,
  "themes": ["theme1", "theme2"],
  "explicit": false,
  "notes": "Any other important requirements not captured above"
}

Rules:
- bpmMin/bpmMax: use null if not specified
- energyMin/energyMax: 0–100 scale, estimate from descriptive language (e.g. "intense" = high energy, "subtle" = low)
- moods: use terms from this list when possible: Dark, Uplifting, Melancholic, Intense, Calm, Dreamy, Aggressive, Romantic, Nostalgic, Mysterious, Triumphant, Tense, Playful, Epic, Intimate, Cinematic, Ethereal, Gritty, Anthemic, Hopeful
- genres: standard genre names
- preferredKeys: ["minor"] or ["major"] or ["minor", "major"] or null`
      }]
    });

    let text = message.content[0].text.trim();
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(text);

    res.status(200).json({ parsed });
  } catch (err) {
    console.error('Brief analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
};