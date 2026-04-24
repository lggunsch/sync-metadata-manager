const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FSM_FIELDS = [
  'title', 'artist', 'featuring', 'albumArtist', 'trackNum', 'duration',
  'isrc', 'isni', 'ipi', 'iswc', 'upc', 'pro', 'publisher', 'label',
  'masterOwner', 'copyrightYear', 'releaseDate', 'fileFormat', 'sampleRate',
  'bitDepth', 'contactName', 'contactEmail', 'contactPhone', 'comments'
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { columns } = req.body;
  if (!columns || !columns.length) return res.status(400).json({ error: 'No columns provided' });

  const columnList = columns.map(c => 
    `- "${c.header}": sample value "${c.sample}"`
  ).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are helping map CSV columns to music metadata fields in a sync licensing app.

Available FSM fields: ${FSM_FIELDS.join(', ')}

CSV columns to map:
${columnList}

Return a JSON object where each key is the exact column header and the value is the best matching FSM field name, or null if no match. Only use field names from the available list. Return only valid JSON, no other text.

Example: {"Track Title": "title", "ISRC Code": "isrc", "Vibe": null}`
      }]
    });

    const text = message.content[0].text.trim();
    const mapping = JSON.parse(text);
    res.status(200).json({ mapping });
  } catch (err) {
    console.error('Mapping error:', err.message);
    res.status(500).json({ error: err.message });
  }
};