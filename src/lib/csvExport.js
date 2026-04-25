// src/lib/csvExport.js
// Export FSM tracks to a CSV file matching the import format.

const COLUMNS = [
  ['Title', 'title'],
  ['Artist', 'artist'],
  ['Featuring', 'featuring'],
  ['Album Artist', 'albumArtist'],
  ['Track Number', 'trackNum'],
  ['Duration', 'duration'],
  ['ISRC', 'isrc'],
  ['ISNI', 'isni'],
  ['IPI', 'ipi'],
  ['ISWC', 'iswc'],
  ['UPC', 'upc'],
  ['PRO', 'pro'],
  ['Publisher', 'publisher'],
  ['Label', 'label'],
  ['Master Owner', 'masterOwner'],
  ['Copyright Year', 'copyrightYear'],
  ['Release Date', 'releaseDate'],
  ['File Format', 'fileFormat'],
  ['Sample Rate', 'sampleRate'],
  ['Bit Depth', 'bitDepth'],
  ['BPM', 'bpm'],
  ['Key', 'key'],
  ['Time Signature', 'timeSig'],
  ['Genre', 'genre'],
  ['Sub-Genre', 'subGenre'],
  ['Tempo Feel', 'tempoFeel'],
  ['Moods', d => (d.moods || []).join('; ')],
  ['Instruments', d => (d.instruments || []).join('; ')],
  ['Vocals', 'hasVocals'],
  ['Vocal Type', 'vocalType'],
  ['Language', 'language'],
  ['Explicit', d => d.explicit ? 'Yes' : 'No'],
  ['Energy', 'energy'],
  ['Danceability', 'danceability'],
  ['Acousticness', 'acousticness'],
  ['Instrumentalness', 'instrumentalness'],
  ['AI Assisted', 'aiAssisted'],
  ['Themes', 'themes'],
  ['Comments', 'comments'],
  ['Publishers', d => (d.pubOwners || []).filter(o => o.name).map(o => `${o.name}${o.role ? ' (' + o.role + ')' : ''}${o.pct ? ' ' + o.pct + '%' : ''}`).join('; ')],
  ['Master Owners', d => (d.masterOwners || []).filter(o => o.name).map(o => `${o.name}${o.role ? ' (' + o.role + ')' : ''}${o.pct ? ' ' + o.pct + '%' : ''}`).join('; ')],
  ['Contact Name', 'contactName'],
  ['Contact Email', 'contactEmail'],
  ['Contact Phone', 'contactPhone'],
];

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTracksToCsv(tracks, filename = 'tracks.csv') {
  const headers = COLUMNS.map(c => c[0]);
  const rows = tracks.map(track => {
    const data = track.data || track;
    return COLUMNS.map(([_, getter]) => {
      const value = typeof getter === 'function' ? getter(data) : data[getter];
      return escapeCsv(value);
    }).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}