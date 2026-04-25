// src/lib/pdfExport.js
// Generates a print-friendly metadata PDF for one or more tracks.
// Used by PublicPlaylist.jsx (bulk) and SupervisorApp.jsx (per-track + bulk).

export function downloadMetadataPDF(tracks, playlistName) {
  const PRINT_CSS = `
    *{margin:0;padding:0;box-sizing:border-box;font-family:'Helvetica Neue',Arial,sans-serif}
    body{background:#f8f8f8}.page{background:#fff;padding:36px 40px;max-width:820px;margin:16px auto;box-shadow:0 1px 4px rgba(0,0,0,.08);border-radius:4px;page-break-after:always}
    .page:last-child{page-break-after:auto}.hdr{border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:20px}
    .ttl{font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#111}.sub{font-size:13px;color:#666;margin-top:3px}
    .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:18px}
    .sh{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;border-bottom:1px solid #e5e5e5;padding-bottom:5px;margin-bottom:10px}
    .meta{width:100%;border-collapse:collapse}.lbl{font-size:11px;color:#888;padding:3px 10px 3px 0;vertical-align:top;white-space:nowrap;width:130px}
    .val{font-size:12px;color:#111;font-weight:500;padding:3px 0}.tags-wrap{display:flex;flex-wrap:wrap;gap:4px}
    .tag{background:#f0f0f0;padding:2px 7px;border-radius:9px;font-size:10px;color:#333}
    .feat{display:flex;align-items:center;margin-bottom:5px}.fl{font-size:11px;color:#888;width:115px;flex-shrink:0}
    .bar-row{display:flex;align-items:center;gap:6px;flex:1}.bar{flex:1;height:5px;background:#eee;border-radius:3px;overflow:hidden}
    .fill{height:5px;background:#222;border-radius:3px}.bval{font-size:10px;color:#999;width:22px;text-align:right}
    .ai-badge{display:inline-block;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700}
    .ai-no{background:#d4edda;color:#155724}.ai-yes{background:#f8d7da;color:#721c24}.ai-partial{background:#fff3cd;color:#856404}
    @media print{.page{margin:0;border-radius:0;box-shadow:none}@page{margin:0.5in}}
  `;

  const buildPage = (t) => {
    const d = t.data || t;
    const f = (lbl, val) => val ? `<tr><td class="lbl">${lbl}</td><td class="val">${val}</td></tr>` : '';
    const tags = arr => arr && arr.length ? arr.map(x => `<span class="tag">${x}</span>`).join('') : '—';
    return `<div class="page">
      <div class="hdr"><div class="ttl">${d.title || 'Untitled Track'}</div>
      <div class="sub">${[d.artist, d.featuring ? 'feat. ' + d.featuring : ''].filter(Boolean).join(' ')} · ${playlistName}</div></div>
      <div class="cols">
        <div class="col"><div class="sh">Technical & Rights</div><table class="meta">
          ${f('ISRC', d.isrc)}${f('ISNI', d.isni)}${f('IPI', d.ipi)}${f('ISWC', d.iswc)}
          ${f('UPC/EAN', d.upc)}${f('PRO', d.pro)}${f('Publisher', d.publisher)}
          ${f('Label', d.label)}${f('Master Owner', d.masterOwner)}
          ${f('Copyright Year', d.copyrightYear)}${f('Release Date', d.releaseDate)}
          ${f('Duration', d.duration)}${f('File Format', d.fileFormat)}
          ${f('Sample Rate', d.sampleRate)}${f('Bit Depth', d.bitDepth)}
        </table></div>
        <div class="col"><div class="sh">Musical</div><table class="meta">
          ${f('BPM', d.bpm)}${f('Key', d.key)}${f('Genre', d.genre)}${f('Sub-Genre', d.subGenre)}
          ${f('Vocals', d.hasVocals === 'Yes' ? (d.vocalType || 'Yes') : d.hasVocals)}
          ${f('Language', d.language)}${f('Explicit', d.explicit ? 'Yes' : '')}
        </table>
        <div class="sh" style="margin-top:12px">Audio Features</div>
        <table class="meta">
          <tr><td class="lbl">Moods</td><td class="val"><div class="tags-wrap">${tags(d.moods)}</div></td></tr>
          <tr><td class="lbl">Instruments</td><td class="val"><div class="tags-wrap">${tags(d.instruments)}</div></td></tr>
        </table></div>
      </div>
      ${(d.contactName || d.contactEmail) ? `
      <div class="sh">Contact</div>
      <table class="meta">${f('Name', d.contactName)}${f('Email', d.contactEmail)}${f('Phone', d.contactPhone)}</table>` : ''}
    </div>`;
  };

  const html = `<!DOCTYPE html><html><head><style>${PRINT_CSS}</style></head><body>
    ${tracks.map(t => buildPage(t)).join('')}
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}