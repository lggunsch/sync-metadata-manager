// src/lib/id3.js
// Embed FSM track metadata into MP3 ID3v2 tags at download time.
// So when supes save the file, all the metadata travels with it.

import { ID3Writer } from 'browser-id3-writer';

export async function downloadMp3WithTags(audioUrl, trackData, filename) {
  const res = await fetch(audioUrl);
  const arrayBuffer = await res.arrayBuffer();

  const writer = new ID3Writer(arrayBuffer);
  const d = trackData || {};

  // Standard ID3v2 frames
  if (d.title) writer.setFrame('TIT2', d.title);
  if (d.artist) {
    const artists = d.featuring ? [d.artist, d.featuring] : [d.artist];
    writer.setFrame('TPE1', artists);
  }
  if (d.albumArtist) writer.setFrame('TPE2', d.albumArtist);
  if (d.genre) writer.setFrame('TCON', [d.genre]);
  if (d.copyrightYear) writer.setFrame('TYER', parseInt(d.copyrightYear, 10) || 0);
  if (d.bpm) writer.setFrame('TBPM', String(d.bpm));
  if (d.key) writer.setFrame('TKEY', d.key);
  if (d.publisher) writer.setFrame('TPUB', d.publisher);
  if (d.isrc) writer.setFrame('TSRC', d.isrc);
  if (d.language) writer.setFrame('TLAN', d.language);

  // Combine the artist's comments with FSM-specific identifiers and contact info
  // into a single COMM frame, since most ID3 readers display it.
  const fsmExtras = [];
  if (d.iswc) fsmExtras.push(`ISWC: ${d.iswc}`);
  if (d.ipi) fsmExtras.push(`IPI: ${d.ipi}`);
  if (d.isni) fsmExtras.push(`ISNI: ${d.isni}`);
  if (d.upc) fsmExtras.push(`UPC: ${d.upc}`);
  if (d.pro) fsmExtras.push(`PRO: ${d.pro}`);
  if (d.label) fsmExtras.push(`Label: ${d.label}`);
  if (d.masterOwner) fsmExtras.push(`Master Owner: ${d.masterOwner}`);
  if (d.subGenre) fsmExtras.push(`Sub-Genre: ${d.subGenre}`);
  if (d.timeSig) fsmExtras.push(`Time Signature: ${d.timeSig}`);
  if (d.moods?.length) fsmExtras.push(`Moods: ${d.moods.join(', ')}`);
  if (d.instruments?.length) fsmExtras.push(`Instruments: ${d.instruments.join(', ')}`);
  if (d.themes) fsmExtras.push(`Themes: ${d.themes}`);
  if (d.contactName) fsmExtras.push(`Contact: ${d.contactName}`);
  if (d.contactEmail) fsmExtras.push(`Email: ${d.contactEmail}`);
  if (d.contactPhone) fsmExtras.push(`Phone: ${d.contactPhone}`);

  const commentParts = [];
  if (d.comments) commentParts.push(d.comments);
  if (fsmExtras.length > 0) {
    if (commentParts.length > 0) commentParts.push(''); // blank line separator
    commentParts.push('--- FSM Metadata ---');
    commentParts.push(...fsmExtras);
  }

  if (commentParts.length > 0) {
    writer.setFrame('COMM', {
      description: 'Comments',
      text: commentParts.join('\n'),
      language: 'eng'
    });
  }

  writer.addTag();
  const taggedBlob = writer.getBlob();

  const url = URL.createObjectURL(taggedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}