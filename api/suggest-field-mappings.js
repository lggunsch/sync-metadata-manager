const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { columns } = req.body;
  if (!columns || !columns.length) return res.status(400).json({ error: 'No columns provided' });

  const columnList = columns.map(c =>
    `- "${c.header}": sample value "${c.sample}"`
  ).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are mapping CSV column headers to music metadata fields for a sync licensing app. Be VERY conservative — when uncertain, return null. The user will manually map any nulls themselves. False mappings are MUCH worse than nulls.

Available fields (the ONLY valid mapping targets — anything else must be null):
- title: song/track name
- artist: performing artist name
- featuring: featured artist
- albumArtist: album artist
- trackNum: track number or position
- duration: length/runtime of the track
- isrc: recording code, ISRC code, track ID
- isni: ISNI identifier
- ipi: IPI number, rights holder number
- iswc: ISWC code, work code
- upc: UPC, EAN, product code
- pro: PRO, rights org, performing rights organization, ASCAP/BMI/SESAC
- publisher: publishing company, publishing house
- label: record label, record company
- masterOwner: master rights holder, rights holder, master owner
- copyrightYear: copyright year, year registered, year
- releaseDate: release date, street date, drop date
- fileFormat: file format, audio quality, format
- sampleRate: sample rate, sample frequency, hz
- bitDepth: bit depth, bit resolution, resolution
- contactName: a HUMAN person's name only (e.g. "Jane Smith"). NEVER a mood, instrument, or genre word.
- contactEmail: an email address — sample value MUST contain "@"
- contactPhone: a phone number — sample value MUST be primarily digits/dashes/parentheses
- comments: notes, comments, additional info

CSV columns to map (header: sample value):
${columnList}

Mapping rules — follow strictly:
1. Examine the SAMPLE VALUE before mapping, not just the header.
2. NEVER map to contactName unless the sample value looks like a human name (first + last, or first name + last initial). Single descriptive words like "Intimate", "Epic", "Hopeful", "Cinematic", "Dark" → return null.
3. NEVER map to contactEmail unless the sample value contains "@". Instrument or descriptive values like "Acoustic Guitar", "Synth/Pad", "Piano" → return null.
4. NEVER map to contactPhone unless the sample value is primarily digits. Instrument or descriptive values → return null.
5. If a column references mood, vibe, feel, genre, sub-genre, instrument, instrumentation, key, BPM, tempo, time signature, vocals, energy, danceability, themes, language, explicit content, AI usage, or any musical attribute NOT in the available fields list above → return null. The user will map these manually.
6. When in doubt, return null.

Return ONLY a valid JSON object mapping each column header to the best FSM field name or null. No explanation, no markdown, just JSON.`
      }]
    });

    let text = message.content[0].text.trim();
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const mapping = JSON.parse(text);
    res.status(200).json({ mapping });
  } catch (err) {
    console.error('Mapping error:', err.message);
    res.status(500).json({ error: err.message });
  }
};