const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { brief, parsed, tracks, artistName, artistEmail } = req.body;
  if (!tracks || !tracks.length) {
    return res.status(400).json({ error: 'No tracks provided' });
  }

  const trackList = tracks.map(t => {
    const d = t.data || t;
    const parts = [
      `"${d.title || 'Untitled'}"`,
      d.genre,
      d.bpm ? `${d.bpm} BPM` : null,
      d.key,
      d.moods?.length ? `Moods: ${d.moods.slice(0, 3).join(', ')}` : null,
      d.hasVocals === 'No' ? 'Instrumental' : d.vocalType ? `Vocals: ${d.vocalType}` : null,
      d.isrc ? `ISRC: ${d.isrc}` : null,
      d.duration ? `Duration: ${d.duration}` : null,
    ].filter(Boolean);
    return `- ${parts.join(' | ')}`;
  }).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Write a professional, concise pitch email from a musician to a music supervisor.

Artist: ${artistName || 'the artist'}
Artist email: ${artistEmail || ''}
Supervisor: ${brief?.supervisorName || parsed?.supervisorName || 'the supervisor'}
Company: ${brief?.company || parsed?.company || 'their company'}
Project: ${brief?.project || parsed?.project || 'their project'}

Brief summary: ${parsed?.summary || (brief?.text || '').slice(0, 300)}

Tracks being pitched:
${trackList}

Guidelines:
- Professional but warm, human tone — not stiff or corporate
- Under 180 words
- Mention 1–2 specific details from the brief to show you read it carefully
- Reference the track titles naturally
- End with a clear CTA (happy to send files, stems, full metadata)
- Do NOT write a subject line — just the email body
- Sign off as ${artistName || 'the artist'}`
      }]
    });

    const email = message.content[0].text.trim();
    res.status(200).json({ email });
  } catch (err) {
    console.error('Email generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
