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
        content: `You are mapping CSV column headers to music metadata fields for a sync licensing app.

Available fields and what they mean:
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
- contactName: contact name, contact person, rep name
- contactEmail: email, contact email, contact address
- contactPhone: phone, contact phone, booking number
- comments: notes, comments, additional info

CSV columns to map (header: sample value):
${columnList}

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