import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const MOODS = ['Dark','Uplifting','Melancholic','Intense','Calm','Dreamy','Aggressive','Romantic','Nostalgic','Mysterious','Triumphant','Tense','Playful','Epic','Intimate','Cinematic','Ethereal','Gritty','Anthemic','Hopeful'];
const INSTRUMENTS = ['Acoustic Guitar','Electric Guitar','Bass Guitar','Drums','Piano','Keys/Organ','Strings','Synth/Pad','Brass','Woodwinds','Choir','Full Orchestra','Electronic/808','Percussion','Violin','Cello','Trumpet','Saxophone','Flute','Banjo','Mandolin','Ukulele','Harp','Harmonica'];
const KEYS = ['C Major','C Minor','C♯/D♭ Major','C♯/D♭ Minor','D Major','D Minor','D♯/E♭ Major','D♯/E♭ Minor','E Major','E Minor','F Major','F Minor','F♯/G♭ Major','F♯/G♭ Minor','G Major','G Minor','G♯/A♭ Major','G♯/A♭ Minor','A Major','A Minor','A♯/B♭ Major','A♯/B♭ Minor','B Major','B Minor'];
const PROS = ['ASCAP','BMI','SESAC','GMR','SOCAN','PRS for Music','APRA AMCOS','GEMA','SACEM','BUMA/STEMRA','Other'];
const TIME_SIGS = ['4/4','3/4','6/8','5/4','7/8','12/8','2/4','2/2','9/8','Other'];
const FORMATS = ['WAV','AIFF','FLAC','MP3','AAC','OGG','STEM'];
const SAMPLE_RATES = ['44.1 kHz','48 kHz','88.2 kHz','96 kHz','176.4 kHz','192 kHz'];
const BIT_DEPTHS = ['16-bit','24-bit','32-bit (float)'];
const TEMPO_FEELS = ['Very Slow','Slow','Medium-Slow','Medium','Medium-Fast','Fast','Very Fast'];
const VOCAL_TYPES = ['Lead Male','Lead Female','Lead Non-binary','Choir','Harmonies','Spoken Word','Rap/Hip-hop','Ad libs only'];
const LANGUAGES = ['English','Spanish','French','Portuguese','German','Italian','Japanese','Korean','Mandarin','Arabic','Hindi','Instrumental/No Lyrics'];
const WRITER_ROLES = ['Songwriter','Composer','Lyricist','Co-writer','Arranger','Producer'];
const PUB_ROLES = ['Publisher','Co-Publisher','Administrator','Sub-Publisher','Self-Published'];
const PROJECT_TYPES = ['Album','EP','Single','Compilation','Soundtrack'];
const SECTIONS = ['Basic Info','Technical & Rights','Musical','Audio Features','AI Disclosure','Ownership','Additional'];
const PITCH_STATUSES = ['Sent','Viewed','In Consideration','Passed','Licensed','No Response'];
const PITCH_METHODS = ['Email','Submission Portal','In Person','Phone','Social Media','Other'];

const STATUS_COLORS = {
  'Sent': 'bg-blue-900/50 text-blue-400',
  'Viewed': 'bg-purple-900/50 text-purple-400',
  'In Consideration': 'bg-yellow-900/50 text-yellow-400',
  'Passed': 'bg-red-900/50 text-red-400',
  'Licensed': 'bg-green-900/50 text-green-400',
  'No Response': 'bg-gray-800 text-gray-500',
};

const newTrackData = () => ({
  title:'', artist:'', featuring:'', albumArtist:'', trackNum:'', duration:'',
  isrc:'', isni:'', ipi:'', iswc:'', upc:'', pro:'', label:'', publisher:'', masterOwner:'',
  copyrightYear:'', releaseDate:'', fileFormat:'', sampleRate:'', bitDepth:'',
  bpm:'', key:'', timeSig:'', genre:'', subGenre:'',
  energy:50, danceability:50, acousticness:50, instrumentalness:50, valence:50,
  tempoFeel:'', moods:[], instruments:[], hasVocals:'', vocalType:'', language:'', explicit:false, themes:'',
  aiAssisted:'No', aiNotes:'',
  masterOwners:[{name:'',role:'',pct:''}],
  pubOwners:[{name:'',role:'',pct:''}],
  contactName:'', contactEmail:'', contactPhone:'', comments:''
});

const newPitch = () => ({
  track_id:'', track_title:'', supervisor_name:'', company:'', project_name:'',
  date_sent:'', method:'Email', status:'Sent', follow_up_date:'', notes:''
});

// ── Metadata field mapping for CSV/Excel import ──────────────────────────────
const FIELD_MAP = {
  'title': 'title', 'track title': 'title', 'song title': 'title', 'song': 'title',
  'artist': 'artist', 'artist name': 'artist',
  'featuring': 'featuring', 'feat': 'featuring', 'feature': 'featuring',
  'bpm': 'bpm', 'tempo': 'bpm',
  'key': 'key', 'musical key': 'key',
  'genre': 'genre',
  'subgenre': 'subGenre', 'sub genre': 'subGenre', 'sub-genre': 'subGenre',
  'isrc': 'isrc',
  'isni': 'isni',
  'ipi': 'ipi',
  'iswc': 'iswc',
  'upc': 'upc', 'upc/ean': 'upc', 'ean': 'upc',
  'pro': 'pro',
  'publisher': 'publisher',
  'label': 'label',
  'master owner': 'masterOwner', 'masterowner': 'masterOwner',
  'copyright year': 'copyrightYear', 'copyrightyear': 'copyrightYear',
  'release date': 'releaseDate', 'releasedate': 'releaseDate',
  'duration': 'duration', 'length': 'duration',
  'file format': 'fileFormat', 'fileformat': 'fileFormat', 'format': 'fileFormat',
  'sample rate': 'sampleRate', 'samplerate': 'sampleRate',
  'bit depth': 'bitDepth', 'bitdepth': 'bitDepth',
  'language': 'language',
  'explicit': 'explicit',
  'themes': 'themes', 'keywords': 'themes',
  'moods': 'moods', 'mood': 'moods',
  'instruments': 'instruments', 'instrument': 'instruments',
  'vocals': 'hasVocals', 'has vocals': 'hasVocals',
  'vocal type': 'vocalType', 'vocaltype': 'vocalType',
  'energy': 'energy',
  'danceability': 'danceability',
  'acousticness': 'acousticness',
  'instrumentalness': 'instrumentalness',
  'valence': 'valence',
  'ai assisted': 'aiAssisted', 'aiassisted': 'aiAssisted', 'ai': 'aiAssisted',
  'comments': 'comments', 'notes': 'comments',
  'contact name': 'contactName', 'contactname': 'contactName', 'contact': 'contactName',
  'email': 'contactEmail', 'contact email': 'contactEmail',
  'phone': 'contactPhone', 'contact phone': 'contactPhone',
};

function mapRow(row) {
  const track = newTrackData();
  for (const [col, val] of Object.entries(row)) {
    const key = FIELD_MAP[col.toLowerCase().trim()];
    if (key && val !== undefined && val !== null && val !== '') {
      if (key === 'moods' || key === 'instruments') {
        track[key] = String(val).split(',').map(s => s.trim()).filter(Boolean);
      } else if (key === 'explicit') {
        track[key] = String(val).toLowerCase() === 'yes' || val === true || val === 1;
      } else if (['energy','danceability','acousticness','instrumentalness','valence'].includes(key)) {
        track[key] = Math.min(100, Math.max(0, parseFloat(val) || 50));
      } else {
        track[key] = String(val);
      }
    }
  }
  return track;
}

function buildTrackHTML(t, projectName) {
  const d = t.data || t;
  const f = (lbl, val) => val ? `<tr><td class="lbl">${lbl}</td><td class="val">${val}</td></tr>` : '';
  const bar = v => `<div class="bar-row"><div class="bar"><div class="fill" style="width:${v}%"></div></div><span class="bval">${v}</span></div>`;
  const tags = arr => arr && arr.length ? arr.map(x => `<span class="tag">${x}</span>`).join('') : '—';
  const aiCls = d.aiAssisted==='No' ? 'ai-no' : d.aiAssisted==='Yes' ? 'ai-yes' : 'ai-partial';
  const ownerTable = owners => {
    if (!owners) return '<p class="none">Not specified</p>';
    const v = owners.filter(o => o.name);
    if (!v.length) return '<p class="none">Not specified</p>';
    return `<table class="owners"><tr><th>Name</th><th>Role</th><th>%</th></tr>${v.map(o => `<tr><td>${o.name}</td><td>${o.role}</td><td>${o.pct}%</td></tr>`).join('')}</table>`;
  };
  return `<div class="page">
    <div class="hdr"><div class="ttl">${d.title||'Untitled Track'}</div>
    <div class="sub">${[d.artist,d.featuring?'feat. '+d.featuring:''].filter(Boolean).join(' ')} · ${projectName}${d.trackNum?' · Track '+d.trackNum:''}</div></div>
    <div class="cols">
      <div class="col"><div class="sh">Technical &amp; Rights</div><table class="meta">
        ${f('ISRC',d.isrc)}${f('ISNI',d.isni)}${f('IPI',d.ipi)}${f('ISWC',d.iswc)}
        ${f('UPC/EAN',d.upc)}${f('PRO',d.pro)}${f('Publisher',d.publisher)}
        ${f('Label',d.label)}${f('Master Owner',d.masterOwner)}
        ${f('Copyright Year',d.copyrightYear)}${f('Release Date',d.releaseDate)}
        ${f('Duration',d.duration)}${f('File Format',d.fileFormat)}
        ${f('Sample Rate',d.sampleRate)}${f('Bit Depth',d.bitDepth)}
      </table></div>
      <div class="col"><div class="sh">Musical</div><table class="meta">
        ${f('BPM',d.bpm)}${f('Key',d.key)}${f('Time Signature',d.timeSig)}
        ${f('Genre',d.genre)}${f('Sub-Genre',d.subGenre)}${f('Tempo Feel',d.tempoFeel)}
        ${f('Vocals',d.hasVocals==='Yes'?(d.vocalType||'Yes'):d.hasVocals)}
        ${f('Language',d.language)}${f('Explicit',d.explicit?'Yes':'No')}
      </table>
      <div class="sh" style="margin-top:12px">Audio Features</div>
      <table class="meta">
        <tr><td class="lbl">Moods</td><td class="val"><div class="tags-wrap">${tags(d.moods)}</div></td></tr>
        <tr><td class="lbl">Instruments</td><td class="val"><div class="tags-wrap">${tags(d.instruments)}</div></td></tr>
        ${d.themes?`<tr><td class="lbl">Themes</td><td class="val">${d.themes}</td></tr>`:''}
      </table>
      <div style="margin-top:10px">
        <div class="feat"><span class="fl">Energy</span>${bar(d.energy)}</div>
        <div class="feat"><span class="fl">Danceability</span>${bar(d.danceability)}</div>
        <div class="feat"><span class="fl">Acousticness</span>${bar(d.acousticness)}</div>
        <div class="feat"><span class="fl">Instrumentalness</span>${bar(d.instrumentalness)}</div>
        <div class="feat"><span class="fl">Valence</span>${bar(d.valence)}</div>
      </div></div>
    </div>
    <div class="cols" style="margin-top:0">
      <div class="col"><div class="sh">Master Ownership</div>${ownerTable(d.masterOwners)}</div>
      <div class="col"><div class="sh">Publishing Ownership</div>${ownerTable(d.pubOwners)}</div>
    </div>
    <div class="sh">AI Disclosure</div>
    <div style="margin-bottom:14px"><span class="ai-badge ${aiCls}">${d.aiAssisted}</span>
    ${d.aiNotes?`<span style="font-size:12px;color:#555;margin-left:10px">${d.aiNotes}</span>`:''}</div>
    ${(d.contactName||d.contactEmail||d.contactPhone||d.comments)?`
    <div class="sh">Contact &amp; Notes</div>
    <table class="meta">${f('Contact',d.contactName)}${f('Email',d.contactEmail)}${f('Phone',d.contactPhone)}</table>
    ${d.comments?`<p style="font-size:12px;color:#444;line-height:1.6;margin-top:8px">${d.comments}</p>`:''}`:''}</div>`;
}

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
  .owners{width:100%;border-collapse:collapse;font-size:12px}
  .owners th{text-align:left;font-size:10px;color:#888;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:1px solid #eee}
  .owners td{padding:4px 8px 4px 0;border-bottom:1px solid #f5f5f5;color:#111}.none{font-size:12px;color:#aaa}
  .toolbar{background:#1e293b;padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:99}
  @media print{.toolbar{display:none!important}.page{margin:0;border-radius:0;box-shadow:none}@page{margin:0.5in}}
`;

function PrintPreview({ tracks, projectName, onBack }) {
  const html = tracks.map(t => buildTrackHTML(t, projectName)).join('');
  return (
    <div style={{minHeight:'100vh',background:'#f8f8f8'}}>
      <style>{PRINT_CSS}</style>
      <div className="toolbar">
        <button onClick={onBack} style={{background:'#334155',color:'#94a3b8',border:'none',padding:'8px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>← Back</button>
        <span style={{color:'#64748b',fontSize:'13px',flex:1}}>{tracks.length} track{tracks.length!==1?'s':''} · {projectName}</span>
        <button onClick={() => window.print()} style={{background:'#4f46e5',color:'#fff',border:'none',padding:'8px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Print / Save as PDF</button>
      </div>
      <div dangerouslySetInnerHTML={{__html: html}} />
    </div>
  );
}

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full";

function Inp({ label, value, onChange, placeholder='', type='text', cls='' }) {
  return (
    <div className={`flex flex-col gap-1 ${cls}`}>
      {label && <label className="text-xs text-gray-400 font-medium">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inp} />
    </div>
  );
}
function Sel({ label, value, onChange, options, placeholder='Select...' }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-400 font-medium">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className={inp}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Slider({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <label className="text-xs text-gray-400 font-medium">{label}</label>
        <span className="text-xs text-indigo-400 font-semibold">{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={e => onChange(+e.target.value)} className="w-full accent-indigo-500 cursor-pointer" />
    </div>
  );
}
function Tags({ label, options, selected, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs text-gray-400 font-medium">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} onClick={() => onToggle(o)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(o)?'bg-indigo-600 border-indigo-500 text-white':'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────
function ImportModal({ projects, session, onClose, onImported }) {
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  const [targetProjId, setTargetProjId] = useState('');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const parseFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const data = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(hdrs.map((h,i) => [h, vals[i] || '']));
      }).filter(r => Object.values(r).some(v => v));
      setHeaders(hdrs); setRows(data); setStep('preview');
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const { read, utils } = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        const wb = read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = utils.sheet_to_json(ws, { defval: '' });
        if (data.length) { setHeaders(Object.keys(data[0])); setRows(data); setStep('preview'); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const doImport = async () => {
    if (!targetProjId) return alert('Please select a project first.');
    setImporting(true);
    const tracksToImport = mode === 'single' ? [rows[0]] : rows;
    for (const row of tracksToImport) {
      const trackData = mapRow(row);
      await supabase.from('tracks').insert({ project_id: targetProjId, user_id: session.user.id, data: trackData });
    }
    setImporting(false);
    onImported();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Import Tracks from File</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {step === 'upload' && <>
            <div className="flex gap-2">
              {['single','bulk'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode===m?'bg-indigo-600 border-indigo-500 text-white':'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  {m === 'single' ? 'Single Track' : 'Bulk Import (multiple tracks)'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {mode === 'single' ? 'Upload a CSV or Excel file with one row of track metadata. Column headers will be mapped to fields automatically.' : 'Upload a CSV or Excel file where each row is a track. All tracks will be imported into the selected project.'}
            </p>
            <Sel label="Import into project" value={targetProjId} onChange={setTargetProjId} options={projects.map(p => p.name)} placeholder="Select a project..." />
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
              onClick={() => fileRef.current.click()}>
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm text-gray-400">Click to upload a CSV or Excel file</p>
              <p className="text-xs text-gray-600 mt-1">.csv, .xlsx, .xls supported</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => { if (e.target.files[0]) { setTargetProjId(projects.find(p => p.name === targetProjId)?.id || targetProjId); parseFile(e.target.files[0]); }}} />
            </div>
          </>}

          {step === 'preview' && <>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2 font-medium">Found {rows.length} row{rows.length!==1?'s':''} · {headers.length} columns</p>
              <p className="text-xs text-gray-500">Columns detected: {headers.join(', ')}</p>
            </div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Preview (first 3 rows)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead><tr>{headers.slice(0,6).map(h => <th key={h} className="text-left text-gray-500 pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0,3).map((r,i) => (
                  <tr key={i}>{headers.slice(0,6).map(h => <td key={h} className="text-gray-300 pb-1 pr-4 truncate max-w-24">{String(r[h]||'—')}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
            <Sel label="Import into project" value={targetProjId} onChange={v => setTargetProjId(projects.find(p => p.name === v)?.id || v)} options={projects.map(p => p.name)} placeholder="Select a project..." />
            <div className="flex gap-2">
              <button onClick={() => setStep('upload')} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">← Back</button>
              <button onClick={doImport} disabled={importing || !targetProjId}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex-1">
                {importing ? 'Importing...' : `Import ${mode==='single'?'1 track':rows.length+' tracks'}`}
              </button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Pitch Manager ─────────────────────────────────────────────────────────────
function PitchManager({ projects, session }) {
  const [pitches, setPitches] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(newPitch());
  const [filterStatus, setFilterStatus] = useState('');

  const allTracks = projects.flatMap(p => (p.tracks||[]).map(t => ({
    id: t.id,
    title: (t.data?.title || t.title || 'Untitled'),
    project: p.name
  })));

  useEffect(() => {
    supabase.from('pitches').select('*').order('date_sent', { ascending: false })
      .then(({ data }) => { if (data) setPitches(data); setLoaded(true); });
  }, []);

  const sf = (k,v) => setForm(f => ({...f, [k]: v}));

  const savePitch = async () => {
    if (editing) {
const clean = {...form, date_sent: form.date_sent || null, follow_up_date: form.follow_up_date || null};
const { data } = await supabase.from('pitches').update(clean).eq('id', editing).select().single();      if (data) setPitches(ps => ps.map(p => p.id===editing ? data : p));
    } else {
const clean = {...form, user_id: session.user.id, date_sent: form.date_sent || null, follow_up_date: form.follow_up_date || null};
const { data } = await supabase.from('pitches').insert(clean).select().single();
if (data) setPitches(ps => [data, ...ps]);
    }
    setShowForm(false); setEditing(null); setForm(newPitch());
  };

  const delPitch = async id => {
    if (!window.confirm('Delete this pitch?')) return;
    await supabase.from('pitches').delete().eq('id', id);
    setPitches(ps => ps.filter(p => p.id !== id));
  };

  const openEdit = p => { setForm(p); setEditing(p.id); setShowForm(true); };

  const filtered = filterStatus ? pitches.filter(p => p.status === filterStatus) : pitches;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pitch Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Track every pitch and follow-up</p>
        </div>
        <button onClick={() => { setForm(newPitch()); setEditing(null); setShowForm(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          + Log Pitch
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!filterStatus?'bg-indigo-600 border-indigo-500 text-white':'bg-gray-800 border-gray-700 text-gray-400'}`}>
          All ({pitches.length})
        </button>
        {PITCH_STATUSES.map(s => {
          const count = pitches.filter(p => p.status === s).length;
          if (!count) return null;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus===s?'bg-indigo-600 border-indigo-500 text-white':'bg-gray-800 border-gray-700 text-gray-400'}`}>
              {s} ({count})
            </button>
          );
        })}
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">{editing ? 'Edit Pitch' : 'Log New Pitch'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-gray-400 font-medium">Track</label>
              <select value={form.track_id} onChange={e => {
                const t = allTracks.find(t => t.id === e.target.value);
                sf('track_id', e.target.value);
                if (t) sf('track_title', `${t.title} (${t.project})`);
              }} className={inp}>
                <option value="">Select a track...</option>
                {allTracks.map(t => <option key={t.id} value={t.id}>{t.title} — {t.project}</option>)}
              </select>
            </div>
            <Inp label="Supervisor Name" value={form.supervisor_name} onChange={v => sf('supervisor_name',v)} placeholder="e.g. Jane Smith" />
            <Inp label="Company / Network" value={form.company} onChange={v => sf('company',v)} placeholder="e.g. Netflix, NBC" />
            <Inp label="Project / Show / Film" value={form.project_name} onChange={v => sf('project_name',v)} placeholder="e.g. Stranger Things S5" cls="col-span-2" />
            <Inp label="Date Sent" value={form.date_sent} onChange={v => sf('date_sent',v)} type="date" />
            <Sel label="Method" value={form.method} onChange={v => sf('method',v)} options={PITCH_METHODS} />
            <Sel label="Status" value={form.status} onChange={v => sf('status',v)} options={PITCH_STATUSES} />
            <Inp label="Follow-up Date" value={form.follow_up_date} onChange={v => sf('follow_up_date',v)} type="date" />
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-gray-400 font-medium">Notes</label>
              <textarea value={form.notes} onChange={e => sf('notes',e.target.value)} rows={3}
                placeholder="Any additional notes about this pitch..." className={`${inp} resize-none`} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={savePitch} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {editing ? 'Update Pitch' : 'Save Pitch'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(newPitch()); }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!loaded ? (
        <div className="text-center py-16 text-gray-600">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-3xl mb-2">📬</div>
          <p>{filterStatus ? `No pitches with status "${filterStatus}"` : 'No pitches logged yet'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 group transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-100">{p.supervisor_name || 'Unknown Supervisor'}</span>
                    {p.company && <span className="text-gray-500 text-sm">· {p.company}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]||'bg-gray-800 text-gray-500'}`}>{p.status}</span>
                  </div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {p.track_title && <span className="text-xs text-indigo-400">{p.track_title}</span>}
                    {p.project_name && <span className="text-xs text-gray-500">{p.project_name}</span>}
                    {p.date_sent && <span className="text-xs text-gray-600">{p.date_sent}</span>}
                    {p.method && <span className="text-xs text-gray-600">via {p.method}</span>}
                  </div>
                  {p.follow_up_date && (
                    <div className="mt-1 text-xs text-yellow-500">Follow-up: {p.follow_up_date}</div>
                  )}
                  {p.notes && <div className="mt-1 text-xs text-gray-500 truncate">{p.notes}</div>}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => delPitch(p.id)} className="text-gray-600 hover:text-red-400 text-xl leading-none transition-colors">×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App({ session }) {
  const [tab, setTab] = useState('projects');
  const [view, setView] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [projId, setProjId] = useState(null);
  const [trackData, setTrackData] = useState(null);
  const [trackId, setTrackId] = useState(null);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showAddProj, setShowAddProj] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [draft, setDraft] = useState({name:'',artist:'',type:'Album'});
  const [sec, setSec] = useState(0);
  const [exportSel, setExportSel] = useState(new Set());
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    supabase.from('projects').select('*, tracks(*)').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data.map(p => ({...p, tracks: p.tracks||[]}))); setLoaded(true); });
  }, []);

  const proj = projects.find(p => p.id === projId);
  const filteredTracks = proj?.tracks.filter(t => (t.data?.title||t.title||'').toLowerCase().includes(search.toLowerCase())) || [];

  const sf = (k,v) => setTrackData(d => ({...d,[k]:v}));
  const tog = (f,v) => setTrackData(d => ({...d,[f]:d[f].includes(v)?d[f].filter(x=>x!==v):[...d[f],v]}));
  const updOwner = (f,i,k,v) => setTrackData(d => ({...d,[f]:d[f].map((o,j)=>j===i?{...o,[k]:v}:o)}));
  const addOwner = f => setTrackData(d => ({...d,[f]:[...d[f],{name:'',role:'',pct:''}]}));
  const rmOwner = (f,i) => setTrackData(d => ({...d,[f]:d[f].filter((_,j)=>j!==i)}));

  const saveTrack = async () => {
    if (trackId) {
      await supabase.from('tracks').update({ data: trackData }).eq('id', trackId);
      setProjects(ps => ps.map(p => p.id!==projId?p:{...p,tracks:p.tracks.map(t=>t.id===trackId?{...t,data:trackData}:t)}));
    } else {
      const { data } = await supabase.from('tracks').insert({ project_id: projId, user_id: session.user.id, data: trackData }).select().single();
      if (data) setProjects(ps => ps.map(p => p.id!==projId?p:{...p,tracks:[...p.tracks,data]}));
    }
    setView('project'); setSec(0);
  };

  const openTrack = t => { setTrackData(t.data||t); setTrackId(t.id||null); setSec(0); setView('track'); };
  const addTrack = () => { setTrackData(newTrackData()); setTrackId(null); setSec(0); setView('track'); };

  const delTrack = async tid => {
    if (!window.confirm('Delete this track?')) return;
    await supabase.from('tracks').delete().eq('id', tid);
    setProjects(ps => ps.map(p => p.id!==projId?p:{...p,tracks:p.tracks.filter(t=>t.id!==tid)}));
    setExportSel(s => { const n=new Set(s); n.delete(tid); return n; });
  };

  const delProject = async pid => {
    if (!window.confirm('Delete this project and all its tracks?')) return;
    await supabase.from('projects').delete().eq('id', pid);
    setProjects(ps => ps.filter(p => p.id!==pid));
  };

  const addProject = async () => {
    if (!draft.name.trim()) return;
    const { data } = await supabase.from('projects').insert({ name: draft.name.trim(), artist: draft.artist, type: draft.type, user_id: session.user.id }).select().single();
    if (data) setProjects(ps => [{...data,tracks:[]}, ...ps]);
    setDraft({name:'',artist:'',type:'Album'}); setShowAddProj(false);
  };

  const togExport = tid => setExportSel(s => { const n=new Set(s); n.has(tid)?n.delete(tid):n.add(tid); return n; });
  const doExport = ids => { const ts=proj.tracks.filter(t=>ids.includes(t.id)); if(ts.length) setPrintData({tracks:ts,projectName:proj.name}); };
  const pct = arr => arr?arr.reduce((s,o)=>s+(parseFloat(o.pct)||0),0):0;
  const signOut = () => supabase.auth.signOut();

  const reloadProjects = async () => {
    const { data } = await supabase.from('projects').select('*, tracks(*)').order('created_at', { ascending: false });
    if (data) setProjects(data.map(p => ({...p, tracks: p.tracks||[]})));
  };

  if (printData) return <PrintPreview tracks={printData.tracks} projectName={printData.projectName} onBack={() => setPrintData(null)} />;

  function renderSec() {
    if (!trackData) return null;
    function OwnerRows({ field, roles }) {
      return (
        <div className="flex flex-col gap-2">
          {trackData[field].map((o,i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={o.name} onChange={e => updOwner(field,i,'name',e.target.value)} placeholder="Full Name" className={`${inp} flex-1`} />
              <select value={o.role} onChange={e => updOwner(field,i,'role',e.target.value)} className={`${inp} w-40`}>
                <option value="">Role</option>{roles.map(r=><option key={r}>{r}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input value={o.pct} onChange={e => updOwner(field,i,'pct',e.target.value)} placeholder="%" className={`${inp} w-16 text-center`} />
                <span className="text-gray-500 text-sm flex-shrink-0">%</span>
              </div>
              {trackData[field].length>1 && <button onClick={() => rmOwner(field,i)} className="text-gray-600 hover:text-red-400 text-xl leading-none flex-shrink-0">×</button>}
            </div>
          ))}
          <button onClick={() => addOwner(field)} className="text-xs text-indigo-400 hover:text-indigo-300 text-left mt-1 w-fit">+ Add owner</button>
        </div>
      );
    }
    switch(sec) {
      case 0: return (<div className="grid grid-cols-2 gap-4">
        <Inp label="Track Title *" value={trackData.title} onChange={v=>sf('title',v)} cls="col-span-2" />
        <Inp label="Artist" value={trackData.artist} onChange={v=>sf('artist',v)} />
        <Inp label="Featuring" value={trackData.featuring} onChange={v=>sf('featuring',v)} placeholder="ft. Artist Name" />
        <Inp label="Album Artist" value={trackData.albumArtist} onChange={v=>sf('albumArtist',v)} />
        <Inp label="Track Number" value={trackData.trackNum} onChange={v=>sf('trackNum',v)} placeholder="e.g. 3" />
        <Inp label="Duration" value={trackData.duration} onChange={v=>sf('duration',v)} placeholder="e.g. 3:42" />
      </div>);
      case 1: return (<div className="grid grid-cols-2 gap-4">
        <Inp label="ISRC" value={trackData.isrc} onChange={v=>sf('isrc',v)} placeholder="e.g. USRC12345678" />
        <Inp label="ISNI" value={trackData.isni} onChange={v=>sf('isni',v)} placeholder="0000 0001 2345 6789" />
        <Inp label="IPI" value={trackData.ipi} onChange={v=>sf('ipi',v)} placeholder="00123456789" />
        <Inp label="ISWC" value={trackData.iswc} onChange={v=>sf('iswc',v)} placeholder="T-123456789-0" />
        <Inp label="UPC/EAN" value={trackData.upc} onChange={v=>sf('upc',v)} placeholder="012345678901" />
        <Sel label="PRO" value={trackData.pro} onChange={v=>sf('pro',v)} options={PROS} />
        <Inp label="Publisher" value={trackData.publisher} onChange={v=>sf('publisher',v)} />
        <Inp label="Label" value={trackData.label} onChange={v=>sf('label',v)} />
        <Inp label="Master Owner" value={trackData.masterOwner} onChange={v=>sf('masterOwner',v)} cls="col-span-2" />
        <Inp label="Copyright Year" value={trackData.copyrightYear} onChange={v=>sf('copyrightYear',v)} placeholder="e.g. 2024" />
        <Inp label="Release Date" value={trackData.releaseDate} onChange={v=>sf('releaseDate',v)} type="date" />
        <Sel label="File Format" value={trackData.fileFormat} onChange={v=>sf('fileFormat',v)} options={FORMATS} />
        <Sel label="Sample Rate" value={trackData.sampleRate} onChange={v=>sf('sampleRate',v)} options={SAMPLE_RATES} />
        <Sel label="Bit Depth" value={trackData.bitDepth} onChange={v=>sf('bitDepth',v)} options={BIT_DEPTHS} />
      </div>);
      case 2: return (<div className="grid grid-cols-2 gap-4">
        <Inp label="BPM" value={trackData.bpm} onChange={v=>sf('bpm',v)} placeholder="e.g. 120" />
        <Sel label="Key" value={trackData.key} onChange={v=>sf('key',v)} options={KEYS} />
        <Sel label="Time Signature" value={trackData.timeSig} onChange={v=>sf('timeSig',v)} options={TIME_SIGS} />
        <Inp label="Genre" value={trackData.genre} onChange={v=>sf('genre',v)} placeholder="e.g. Hip-Hop" />
        <Inp label="Sub-Genre" value={trackData.subGenre} onChange={v=>sf('subGenre',v)} placeholder="e.g. Trap" />
        <Sel label="Tempo Feel" value={trackData.tempoFeel} onChange={v=>sf('tempoFeel',v)} options={TEMPO_FEELS} />
        <Sel label="Vocals" value={trackData.hasVocals} onChange={v=>sf('hasVocals',v)} options={['Yes','No','Instrumental Version Available']} cls="col-span-2" />
        {trackData.hasVocals==='Yes' && <><Sel label="Vocal Type" value={trackData.vocalType} onChange={v=>sf('vocalType',v)} options={VOCAL_TYPES} /><Sel label="Language" value={trackData.language} onChange={v=>sf('language',v)} options={LANGUAGES} /></>}
        <div className="col-span-2 flex items-center gap-3 mt-1">
          <input type="checkbox" checked={trackData.explicit} onChange={e=>sf('explicit',e.target.checked)} className="w-4 h-4 accent-indigo-500 cursor-pointer" id="exp" />
          <label htmlFor="exp" className="text-sm text-gray-300 cursor-pointer">Explicit Content</label>
        </div>
      </div>);
      case 3: return (<div className="flex flex-col gap-6">
        <Tags label="Moods" options={MOODS} selected={trackData.moods} onToggle={v=>tog('moods',v)} />
        <Tags label="Instruments" options={INSTRUMENTS} selected={trackData.instruments} onToggle={v=>tog('instruments',v)} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Themes / Keywords</label>
          <input value={trackData.themes} onChange={e=>sf('themes',e.target.value)} placeholder="e.g. loss, redemption, summer, city life" className={inp} />
        </div>
        <div className="flex flex-col gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Spotify-Style Audio Features</p>
          <Slider label="Energy" value={trackData.energy} onChange={v=>sf('energy',v)} />
          <Slider label="Danceability" value={trackData.danceability} onChange={v=>sf('danceability',v)} />
          <Slider label="Acousticness" value={trackData.acousticness} onChange={v=>sf('acousticness',v)} />
          <Slider label="Instrumentalness" value={trackData.instrumentalness} onChange={v=>sf('instrumentalness',v)} />
          <Slider label="Valence (Positivity)" value={trackData.valence} onChange={v=>sf('valence',v)} />
        </div>
      </div>);
      case 4: return (<div className="flex flex-col gap-5">
        <div>
          <label className="text-xs text-gray-400 font-medium block mb-3">AI Assisted</label>
          <div className="flex gap-3">
            {['No','Partially','Yes'].map(opt => (
              <button key={opt} onClick={()=>sf('aiAssisted',opt)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${trackData.aiAssisted===opt?opt==='No'?'bg-green-600 border-green-500 text-white':opt==='Yes'?'bg-red-600 border-red-500 text-white':'bg-yellow-500 border-yellow-400 text-gray-900':'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{opt}</button>
            ))}
          </div>
        </div>
        {trackData.aiAssisted!=='No' && <div className="flex flex-col gap-1"><label className="text-xs text-gray-400 font-medium">What was AI-assisted?</label><textarea value={trackData.aiNotes} onChange={e=>sf('aiNotes',e.target.value)} rows={3} className={`${inp} resize-none`} /></div>}
        {trackData.aiAssisted==='No' && <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-sm text-green-400">✓ No AI assistance — 100% human-created content</div>}
      </div>);
      case 5: return (<div className="flex flex-col gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div><h4 className="text-sm font-semibold text-gray-200">Master Recording</h4><p className="text-xs text-gray-500">Who owns the master recording?</p></div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct(trackData.masterOwners)===100?'bg-green-900/50 text-green-400':'bg-gray-800 text-gray-500'}`}>{pct(trackData.masterOwners)}% / 100%</span>
          </div>
          <OwnerRows field="masterOwners" roles={WRITER_ROLES} />
        </div>
        <div className="border-t border-gray-800" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <div><h4 className="text-sm font-semibold text-gray-200">Publishing</h4><p className="text-xs text-gray-500">Who controls the publishing rights?</p></div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct(trackData.pubOwners)===100?'bg-green-900/50 text-green-400':'bg-gray-800 text-gray-500'}`}>{pct(trackData.pubOwners)}% / 100%</span>
          </div>
          <OwnerRows field="pubOwners" roles={PUB_ROLES} />
        </div>
      </div>);
      case 6: return (<div className="flex flex-col gap-5">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Contact Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Inp label="Contact Name" value={trackData.contactName} onChange={v=>sf('contactName',v)} />
            <Inp label="Email" value={trackData.contactEmail} onChange={v=>sf('contactEmail',v)} type="email" />
            <Inp label="Phone" value={trackData.contactPhone} onChange={v=>sf('contactPhone',v)} cls="col-span-2" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Additional Comments</label>
          <textarea value={trackData.comments} onChange={e=>sf('comments',e.target.value)} rows={5} className={`${inp} resize-none`} />
        </div>
      </div>);
      default: return null;
    }
  }

  if (!loaded) return <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {showImport && <ImportModal projects={projects} session={session} onClose={() => setShowImport(false)} onImported={reloadProjects} />}

      {/* Top nav */}
      {view === 'dashboard' && (
        <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-white mr-4">FriedSoda Music</span>
            {['projects','pitches'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${tab===t?'bg-gray-800 text-white':'text-gray-500 hover:text-gray-300'}`}>
                {t === 'projects' ? 'Projects' : 'Pitch Manager'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tab === 'projects' && <button onClick={() => setShowImport(true)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs transition-colors">Import File</button>}
            {tab === 'projects' && <button onClick={() => setShowAddProj(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">+ New Project</button>}
            <button onClick={signOut} className="bg-gray-800 hover:bg-gray-700 text-gray-500 px-3 py-1.5 rounded-lg text-xs transition-colors">Sign Out</button>
          </div>
        </div>
      )}

      {/* Pitch Manager */}
      {view === 'dashboard' && tab === 'pitches' && <PitchManager projects={projects} session={session} />}

      {/* Projects */}
      {view === 'dashboard' && tab === 'projects' && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          {showAddProj && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">New Project</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Project / Album name *" className={`${inp} col-span-3`} />
                <input value={draft.artist} onChange={e=>setDraft(d=>({...d,artist:e.target.value}))} placeholder="Artist name" className={`${inp} col-span-2`} />
                <select value={draft.type} onChange={e=>setDraft(d=>({...d,type:e.target.value}))} className={inp}>{PROJECT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div className="flex gap-2">
                <button onClick={addProject} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Create Project</button>
                <button onClick={() => {setShowAddProj(false);setDraft({name:'',artist:'',type:'Album'});}} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}
          {projects.length === 0 ? (
            <div className="text-center py-24 text-gray-600"><div className="text-5xl mb-4">🎵</div><p className="text-lg font-medium text-gray-500">No projects yet</p><p className="text-sm mt-1">Create your first project to get started</p></div>
          ) : (
            <div className="flex flex-col gap-3">
              {projects.map(p => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-colors group"
                  onClick={() => {setProjId(p.id);setSearch('');setExportSel(new Set());setView('project');}}>
                  <div className="flex items-center justify-between">
                    <div><h3 className="font-semibold text-gray-100">{p.name}</h3><p className="text-sm text-gray-500 mt-0.5">{[p.artist,p.type].filter(Boolean).join(' · ')} · {p.tracks.length} track{p.tracks.length!==1?'s':''}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 group-hover:text-indigo-400 transition-colors">Open →</span>
                      <button onClick={e=>{e.stopPropagation();delProject(p.id);}} className="text-gray-700 hover:text-red-400 text-xl leading-none opacity-0 group-hover:opacity-100 transition-all">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Project view */}
      {view === 'project' && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button onClick={() => setView('dashboard')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-4 block">← All Projects</button>
          <div className="flex items-start justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-white">{proj?.name}</h1><p className="text-gray-500 text-sm mt-0.5">{[proj?.artist,proj?.type].filter(Boolean).join(' · ')}</p></div>
            <div className="flex gap-2">
              <button onClick={() => setShowImport(true)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">Import</button>
              <button onClick={addTrack} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">+ Add Track</button>
            </div>
          </div>
          <div className="flex gap-3 mb-4">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tracks by title..." className={`${inp} flex-1`} />
            {exportSel.size>0 && <button onClick={() => doExport([...exportSel])} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">Export {exportSel.size} PDF{exportSel.size!==1?'s':''}</button>}
            {proj?.tracks.length>0 && <button onClick={() => setExportSel(s=>s.size===proj.tracks.length?new Set():new Set(proj.tracks.map(t=>t.id)))} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">{exportSel.size===proj?.tracks.length?'Deselect All':'Select All'}</button>}
          </div>
          {filteredTracks.length===0 ? (
            <div className="text-center py-16 text-gray-600">{proj?.tracks.length===0?<><div className="text-3xl mb-2">♪</div><p>No tracks yet</p></>:<p>No tracks match "{search}"</p>}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTracks.map(t => {
                const d = t.data||t;
                return (
                  <div key={t.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors group">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={exportSel.has(t.id)} onChange={() => togExport(t.id)} className="w-4 h-4 accent-indigo-500 cursor-pointer flex-shrink-0" />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openTrack(t)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {d.trackNum && <span className="text-xs text-gray-600">{d.trackNum}.</span>}
                          <span className="font-medium text-gray-100 truncate">{d.title||'Untitled Track'}</span>
                          {d.explicit && <span className="text-xs bg-gray-700 text-gray-400 px-1.5 rounded">E</span>}
                          {d.aiAssisted==='Yes' && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">AI</span>}
                          {d.aiAssisted==='Partially' && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded-full">AI Partial</span>}
                        </div>
                        <div className="flex gap-3 mt-0.5 flex-wrap">
                          {d.bpm && <span className="text-xs text-gray-500">{d.bpm} BPM</span>}
                          {d.key && <span className="text-xs text-gray-500">{d.key}</span>}
                          {d.genre && <span className="text-xs text-gray-500">{d.genre}</span>}
                          {d.duration && <span className="text-xs text-gray-500">{d.duration}</span>}
                          {d.isrc && <span className="text-xs text-gray-600">{d.isrc}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openTrack(t)} className="text-xs text-gray-400 hover:text-indigo-400 transition-colors">Edit</button>
                        <button onClick={() => doExport([t.id])} className="text-xs text-gray-400 hover:text-emerald-400 transition-colors">PDF</button>
                        <button onClick={() => delTrack(t.id)} className="text-gray-600 hover:text-red-400 text-xl leading-none transition-colors">×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Track form */}
      {view === 'track' && (
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button onClick={() => setView('dashboard')} className="text-gray-600 hover:text-gray-400 transition-colors">Projects</button>
            <span className="text-gray-700">›</span>
            <button onClick={() => {setView('project');setSec(0);}} className="text-gray-600 hover:text-gray-400 transition-colors">{proj?.name}</button>
            <span className="text-gray-700">›</span>
            <span className="text-gray-400">{trackData?.title||'New Track'}</span>
          </div>
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {SECTIONS.map((s,i) => (
              <button key={i} onClick={() => setSec(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${sec===i?'bg-indigo-600 text-white':'bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}>{s}</button>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-5">{SECTIONS[sec]}</h3>
            {renderSec()}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setSec(s=>Math.max(0,s-1))} disabled={sec===0} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">← Prev</button>
            <div className="flex gap-2">
              <button onClick={saveTrack} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">Save & Exit</button>
              {sec<SECTIONS.length-1
                ?<button onClick={() => setSec(s=>s+1)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Next →</button>
                :<button onClick={saveTrack} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Save Track ✓</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}