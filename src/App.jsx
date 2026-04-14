import { useState, useEffect } from "react";

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

const newTrack = () => ({
  id: Date.now().toString(),
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

const newProject = () => ({ id: Date.now().toString(), name:'', artist:'', type:'Album', tracks:[] });

function buildTrackHTML(t, projectName) {
  const f = (lbl, val) => val ? `<tr><td class="lbl">${lbl}</td><td class="val">${val}</td></tr>` : '';
  const bar = v => `<div class="bar-row"><div class="bar"><div class="fill" style="width:${v}%"></div></div><span class="bval">${v}</span></div>`;
  const tags = arr => arr.length ? arr.map(x => `<span class="tag">${x}</span>`).join('') : '—';
  const aiCls = t.aiAssisted==='No' ? 'ai-no' : t.aiAssisted==='Yes' ? 'ai-yes' : 'ai-partial';
  const ownerTable = owners => {
    const v = owners.filter(o => o.name);
    if (!v.length) return '<p class="none">Not specified</p>';
    return `<table class="owners"><tr><th>Name</th><th>Role</th><th>%</th></tr>${v.map(o => `<tr><td>${o.name}</td><td>${o.role}</td><td>${o.pct}%</td></tr>`).join('')}</table>`;
  };
  return `<div class="page">
    <div class="hdr">
      <div class="ttl">${t.title || 'Untitled Track'}</div>
      <div class="sub">${[t.artist, t.featuring ? 'feat. '+t.featuring : ''].filter(Boolean).join(' ')} · ${projectName}${t.trackNum ? ' · Track '+t.trackNum : ''}</div>
    </div>
    <div class="cols">
      <div class="col">
        <div class="sh">Technical &amp; Rights</div>
        <table class="meta">
          ${f('ISRC',t.isrc)}${f('ISNI',t.isni)}${f('IPI',t.ipi)}${f('ISWC',t.iswc)}
          ${f('UPC/EAN',t.upc)}${f('PRO',t.pro)}${f('Publisher',t.publisher)}
          ${f('Label',t.label)}${f('Master Owner',t.masterOwner)}
          ${f('Copyright Year',t.copyrightYear)}${f('Release Date',t.releaseDate)}
          ${f('Duration',t.duration)}${f('File Format',t.fileFormat)}
          ${f('Sample Rate',t.sampleRate)}${f('Bit Depth',t.bitDepth)}
        </table>
      </div>
      <div class="col">
        <div class="sh">Musical</div>
        <table class="meta">
          ${f('BPM',t.bpm)}${f('Key',t.key)}${f('Time Signature',t.timeSig)}
          ${f('Genre',t.genre)}${f('Sub-Genre',t.subGenre)}${f('Tempo Feel',t.tempoFeel)}
          ${f('Vocals',t.hasVocals==='Yes' ? (t.vocalType||'Yes') : t.hasVocals)}
          ${f('Language',t.language)}${f('Explicit',t.explicit ? 'Yes' : 'No')}
        </table>
        <div class="sh" style="margin-top:12px">Audio Features</div>
        <table class="meta">
          <tr><td class="lbl">Moods</td><td class="val"><div class="tags-wrap">${tags(t.moods)}</div></td></tr>
          <tr><td class="lbl">Instruments</td><td class="val"><div class="tags-wrap">${tags(t.instruments)}</div></td></tr>
          ${t.themes ? `<tr><td class="lbl">Themes</td><td class="val">${t.themes}</td></tr>` : ''}
        </table>
        <div style="margin-top:10px">
          <div class="feat"><span class="fl">Energy</span>${bar(t.energy)}</div>
          <div class="feat"><span class="fl">Danceability</span>${bar(t.danceability)}</div>
          <div class="feat"><span class="fl">Acousticness</span>${bar(t.acousticness)}</div>
          <div class="feat"><span class="fl">Instrumentalness</span>${bar(t.instrumentalness)}</div>
          <div class="feat"><span class="fl">Valence</span>${bar(t.valence)}</div>
        </div>
      </div>
    </div>
    <div class="cols" style="margin-top:0">
      <div class="col"><div class="sh">Master Ownership</div>${ownerTable(t.masterOwners)}</div>
      <div class="col"><div class="sh">Publishing Ownership</div>${ownerTable(t.pubOwners)}</div>
    </div>
    <div class="sh">AI Disclosure</div>
    <div style="margin-bottom:14px">
      <span class="ai-badge ${aiCls}">${t.aiAssisted}</span>
      ${t.aiNotes ? `<span style="font-size:12px;color:#555;margin-left:10px">${t.aiNotes}</span>` : ''}
    </div>
    ${(t.contactName||t.contactEmail||t.contactPhone||t.comments) ? `
    <div class="sh">Contact &amp; Notes</div>
    <table class="meta">${f('Contact',t.contactName)}${f('Email',t.contactEmail)}${f('Phone',t.contactPhone)}</table>
    ${t.comments ? `<p style="font-size:12px;color:#444;line-height:1.6;margin-top:8px">${t.comments}</p>` : ''}
    ` : ''}
  </div>`;
}

const PRINT_CSS = `
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Helvetica Neue',Arial,sans-serif}
  body{background:#f8f8f8}
  .page{background:#fff;padding:36px 40px;max-width:820px;margin:16px auto;box-shadow:0 1px 4px rgba(0,0,0,.08);border-radius:4px;page-break-after:always}
  .page:last-child{page-break-after:auto}
  .hdr{border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:20px}
  .ttl{font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#111}
  .sub{font-size:13px;color:#666;margin-top:3px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:18px}
  .sh{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;border-bottom:1px solid #e5e5e5;padding-bottom:5px;margin-bottom:10px}
  .meta{width:100%;border-collapse:collapse}
  .lbl{font-size:11px;color:#888;padding:3px 10px 3px 0;vertical-align:top;white-space:nowrap;width:130px}
  .val{font-size:12px;color:#111;font-weight:500;padding:3px 0}
  .tags-wrap{display:flex;flex-wrap:wrap;gap:4px}
  .tag{background:#f0f0f0;padding:2px 7px;border-radius:9px;font-size:10px;color:#333}
  .feat{display:flex;align-items:center;margin-bottom:5px}
  .fl{font-size:11px;color:#888;width:115px;flex-shrink:0}
  .bar-row{display:flex;align-items:center;gap:6px;flex:1}
  .bar{flex:1;height:5px;background:#eee;border-radius:3px;overflow:hidden}
  .fill{height:5px;background:#222;border-radius:3px}
  .bval{font-size:10px;color:#999;width:22px;text-align:right}
  .ai-badge{display:inline-block;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700}
  .ai-no{background:#d4edda;color:#155724}
  .ai-yes{background:#f8d7da;color:#721c24}
  .ai-partial{background:#fff3cd;color:#856404}
  .owners{width:100%;border-collapse:collapse;font-size:12px}
  .owners th{text-align:left;font-size:10px;color:#888;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:1px solid #eee}
  .owners td{padding:4px 8px 4px 0;border-bottom:1px solid #f5f5f5;color:#111}
  .none{font-size:12px;color:#aaa}
  .toolbar{background:#1e293b;padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:99}
  @media print{.toolbar{display:none!important}.page{margin:0;border-radius:0;box-shadow:none}@page{margin:0.5in}}
`;

function PrintPreview({ tracks, projectName, onBack }) {
  const html = tracks.map(t => buildTrackHTML(t, projectName)).join('');
  return (
    <div style={{minHeight:'100vh',background:'#f8f8f8'}}>
      <style>{PRINT_CSS}</style>
      <div className="toolbar">
        <button onClick={onBack}
          style={{background:'#334155',color:'#94a3b8',border:'none',padding:'8px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>
          ← Back
        </button>
        <span style={{color:'#64748b',fontSize:'13px',flex:1}}>
          {tracks.length} track{tracks.length!==1?'s':''} · {projectName}
        </span>
        <button onClick={() => window.print()}
          style={{background:'#4f46e5',color:'#fff',border:'none',padding:'8px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
          Print / Save as PDF
        </button>
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
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(o) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [projId, setProjId] = useState(null);
  const [track, setTrack] = useState(null);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showAddProj, setShowAddProj] = useState(false);
  const [draft, setDraft] = useState({name:'',artist:'',type:'Album'});
  const [sec, setSec] = useState(0);
  const [exportSel, setExportSel] = useState(new Set());
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('syncmeta-v1');
      if (saved) setProjects(JSON.parse(saved));
    } catch(e) {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('syncmeta-v1', JSON.stringify(projects));
  }, [projects, loaded]);

  const proj = projects.find(p => p.id === projId);
  const filteredTracks = proj?.tracks.filter(t => t.title.toLowerCase().includes(search.toLowerCase())) || [];

  const sf = (k, v) => setTrack(t => ({...t, [k]: v}));
  const tog = (f, v) => setTrack(t => ({...t, [f]: t[f].includes(v) ? t[f].filter(x => x!==v) : [...t[f], v]}));
  const updOwner = (f, i, k, v) => setTrack(t => ({...t, [f]: t[f].map((o,j) => j===i ? {...o,[k]:v} : o)}));
  const addOwner = f => setTrack(t => ({...t, [f]: [...t[f], {name:'',role:'',pct:''}]}));
  const rmOwner = (f, i) => setTrack(t => ({...t, [f]: t[f].filter((_,j) => j!==i)}));

  const saveTrack = () => {
    setProjects(ps => ps.map(p => {
      if (p.id !== projId) return p;
      const exists = p.tracks.some(t => t.id === track.id);
      return {...p, tracks: exists ? p.tracks.map(t => t.id===track.id ? track : t) : [...p.tracks, track]};
    }));
    setView('project');
    setSec(0);
  };

  const openTrack = t => { setTrack({...t}); setSec(0); setView('track'); };
  const addTrack = () => { setTrack(newTrack()); setSec(0); setView('track'); };

  const delTrack = tid => {
    if (!window.confirm('Delete this track?')) return;
    setProjects(ps => ps.map(p => p.id!==projId ? p : {...p, tracks: p.tracks.filter(t => t.id!==tid)}));
    setExportSel(s => { const n = new Set(s); n.delete(tid); return n; });
  };

  const delProject = pid => {
    if (!window.confirm('Delete this project and all its tracks?')) return;
    setProjects(ps => ps.filter(p => p.id!==pid));
  };

  const addProject = () => {
    if (!draft.name.trim()) return;
    setProjects(ps => [...ps, {...newProject(), ...draft, name: draft.name.trim()}]);
    setDraft({name:'',artist:'',type:'Album'});
    setShowAddProj(false);
  };

  const togExport = tid => setExportSel(s => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });
  const doExport = ids => {
    const ts = proj.tracks.filter(t => ids.includes(t.id));
    if (ts.length) setPrintData({tracks: ts, projectName: proj.name});
  };

  const pct = arr => arr.reduce((s,o) => s + (parseFloat(o.pct)||0), 0);

  if (printData) {
    return <PrintPreview tracks={printData.tracks} projectName={printData.projectName} onBack={() => setPrintData(null)} />;
  }

  function renderSec() {
    if (!track) return null;

    function OwnerRows({ field, roles }) {
      return (
        <div className="flex flex-col gap-2">
          {track[field].map((o,i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={o.name} onChange={e => updOwner(field,i,'name',e.target.value)}
                placeholder="Full Name" className={`${inp} flex-1`} />
              <select value={o.role} onChange={e => updOwner(field,i,'role',e.target.value)} className={`${inp} w-40`}>
                <option value="">Role</option>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input value={o.pct} onChange={e => updOwner(field,i,'pct',e.target.value)}
                  placeholder="%" className={`${inp} w-16 text-center`} />
                <span className="text-gray-500 text-sm flex-shrink-0">%</span>
              </div>
              {track[field].length > 1 && (
                <button onClick={() => rmOwner(field,i)} className="text-gray-600 hover:text-red-400 text-xl leading-none flex-shrink-0">×</button>
              )}
            </div>
          ))}
          <button onClick={() => addOwner(field)} className="text-xs text-indigo-400 hover:text-indigo-300 text-left mt-1 w-fit">+ Add owner</button>
        </div>
      );
    }

    switch(sec) {
      case 0: return (
        <div className="grid grid-cols-2 gap-4">
          <Inp label="Track Title *" value={track.title} onChange={v => sf('title',v)} cls="col-span-2" />
          <Inp label="Artist" value={track.artist} onChange={v => sf('artist',v)} />
          <Inp label="Featuring" value={track.featuring} onChange={v => sf('featuring',v)} placeholder="ft. Artist Name" />
          <Inp label="Album Artist" value={track.albumArtist} onChange={v => sf('albumArtist',v)} />
          <Inp label="Track Number" value={track.trackNum} onChange={v => sf('trackNum',v)} placeholder="e.g. 3" />
          <Inp label="Duration" value={track.duration} onChange={v => sf('duration',v)} placeholder="e.g. 3:42" />
        </div>
      );
      case 1: return (
        <div className="grid grid-cols-2 gap-4">
          <Inp label="ISRC" value={track.isrc} onChange={v => sf('isrc',v)} placeholder="e.g. USRC12345678" />
          <Inp label="ISNI" value={track.isni} onChange={v => sf('isni',v)} placeholder="0000 0001 2345 6789" />
          <Inp label="IPI" value={track.ipi} onChange={v => sf('ipi',v)} placeholder="00123456789" />
          <Inp label="ISWC" value={track.iswc} onChange={v => sf('iswc',v)} placeholder="T-123456789-0" />
          <Inp label="UPC/EAN" value={track.upc} onChange={v => sf('upc',v)} placeholder="012345678901" />
          <Sel label="PRO" value={track.pro} onChange={v => sf('pro',v)} options={PROS} />
          <Inp label="Publisher" value={track.publisher} onChange={v => sf('publisher',v)} />
          <Inp label="Label" value={track.label} onChange={v => sf('label',v)} />
          <Inp label="Master Owner (label/entity)" value={track.masterOwner} onChange={v => sf('masterOwner',v)} cls="col-span-2" />
          <Inp label="Copyright Year" value={track.copyrightYear} onChange={v => sf('copyrightYear',v)} placeholder="e.g. 2024" />
          <Inp label="Release Date" value={track.releaseDate} onChange={v => sf('releaseDate',v)} type="date" />
          <Sel label="File Format" value={track.fileFormat} onChange={v => sf('fileFormat',v)} options={FORMATS} />
          <Sel label="Sample Rate" value={track.sampleRate} onChange={v => sf('sampleRate',v)} options={SAMPLE_RATES} />
          <Sel label="Bit Depth" value={track.bitDepth} onChange={v => sf('bitDepth',v)} options={BIT_DEPTHS} />
        </div>
      );
      case 2: return (
        <div className="grid grid-cols-2 gap-4">
          <Inp label="BPM" value={track.bpm} onChange={v => sf('bpm',v)} placeholder="e.g. 120" />
          <Sel label="Key" value={track.key} onChange={v => sf('key',v)} options={KEYS} />
          <Sel label="Time Signature" value={track.timeSig} onChange={v => sf('timeSig',v)} options={TIME_SIGS} />
          <Inp label="Genre" value={track.genre} onChange={v => sf('genre',v)} placeholder="e.g. Hip-Hop" />
          <Inp label="Sub-Genre" value={track.subGenre} onChange={v => sf('subGenre',v)} placeholder="e.g. Trap" />
          <Sel label="Tempo Feel" value={track.tempoFeel} onChange={v => sf('tempoFeel',v)} options={TEMPO_FEELS} />
          <Sel label="Vocals" value={track.hasVocals} onChange={v => sf('hasVocals',v)} options={['Yes','No','Instrumental Version Available']} cls="col-span-2" />
          {track.hasVocals==='Yes' && <>
            <Sel label="Vocal Type" value={track.vocalType} onChange={v => sf('vocalType',v)} options={VOCAL_TYPES} />
            <Sel label="Language" value={track.language} onChange={v => sf('language',v)} options={LANGUAGES} />
          </>}
          <div className="col-span-2 flex items-center gap-3 mt-1">
            <input type="checkbox" checked={track.explicit} onChange={e => sf('explicit',e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer" id="exp" />
            <label htmlFor="exp" className="text-sm text-gray-300 cursor-pointer">Explicit Content</label>
          </div>
        </div>
      );
      case 3: return (
        <div className="flex flex-col gap-6">
          <Tags label="Moods" options={MOODS} selected={track.moods} onToggle={v => tog('moods',v)} />
          <Tags label="Instruments" options={INSTRUMENTS} selected={track.instruments} onToggle={v => tog('instruments',v)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Themes / Keywords</label>
            <input value={track.themes} onChange={e => sf('themes',e.target.value)}
              placeholder="e.g. loss, redemption, summer, city life" className={inp} />
          </div>
          <div className="flex flex-col gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Spotify-Style Audio Features</p>
            <Slider label="Energy" value={track.energy} onChange={v => sf('energy',v)} />
            <Slider label="Danceability" value={track.danceability} onChange={v => sf('danceability',v)} />
            <Slider label="Acousticness" value={track.acousticness} onChange={v => sf('acousticness',v)} />
            <Slider label="Instrumentalness" value={track.instrumentalness} onChange={v => sf('instrumentalness',v)} />
            <Slider label="Valence (Positivity)" value={track.valence} onChange={v => sf('valence',v)} />
          </div>
        </div>
      );
      case 4: return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-3">AI Assisted</label>
            <div className="flex gap-3">
              {['No','Partially','Yes'].map(opt => (
                <button key={opt} onClick={() => sf('aiAssisted',opt)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    track.aiAssisted===opt
                      ? opt==='No' ? 'bg-green-600 border-green-500 text-white'
                        : opt==='Yes' ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-yellow-500 border-yellow-400 text-gray-900'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>{opt}</button>
              ))}
            </div>
          </div>
          {track.aiAssisted !== 'No' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">What was AI-assisted?</label>
              <textarea value={track.aiNotes} onChange={e => sf('aiNotes',e.target.value)}
                placeholder="e.g. Production elements generated with AI; lyrics written by human"
                rows={3} className={`${inp} resize-none`} />
            </div>
          )}
          {track.aiAssisted === 'No' && (
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-sm text-green-400">
              ✓ No AI assistance — 100% human-created content
            </div>
          )}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Why this matters:</strong> Many supervisors, studios, and networks have blanket bans on AI-generated content. Full disclosure upfront protects both parties.
          </div>
        </div>
      );
      case 5: return (
        <div className="flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Master Recording</h4>
                <p className="text-xs text-gray-500">Who owns the master recording?</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct(track.masterOwners)===100 ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                {pct(track.masterOwners)}% / 100%
              </span>
            </div>
            <OwnerRows field="masterOwners" roles={WRITER_ROLES} />
          </div>
          <div className="border-t border-gray-800" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Publishing</h4>
                <p className="text-xs text-gray-500">Who controls the publishing rights?</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct(track.pubOwners)===100 ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                {pct(track.pubOwners)}% / 100%
              </span>
            </div>
            <OwnerRows field="pubOwners" roles={PUB_ROLES} />
          </div>
        </div>
      );
      case 6: return (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Contact Information</p>
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Contact Name" value={track.contactName} onChange={v => sf('contactName',v)} />
              <Inp label="Email" value={track.contactEmail} onChange={v => sf('contactEmail',v)} type="email" />
              <Inp label="Phone" value={track.contactPhone} onChange={v => sf('contactPhone',v)} cls="col-span-2" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Additional Comments</label>
            <textarea value={track.comments} onChange={e => sf('comments',e.target.value)}
              placeholder="Any additional notes, special instructions, or context for the music supervisor..."
              rows={5} className={`${inp} resize-none`} />
          </div>
        </div>
      );
      default: return null;
    }
  }

  if (!loaded) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">Loading...</div>
  );

  if (view === 'dashboard') return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sync Metadata Manager</h1>
            <p className="text-gray-500 text-sm mt-1">Organize and export your music metadata for licensing</p>
          </div>
          <button onClick={() => setShowAddProj(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            + New Project
          </button>
        </div>

        {showAddProj && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">New Project</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input value={draft.name} onChange={e => setDraft(d => ({...d,name:e.target.value}))}
                placeholder="Project / Album name *" className={`${inp} col-span-3`} />
              <input value={draft.artist} onChange={e => setDraft(d => ({...d,artist:e.target.value}))}
                placeholder="Artist name" className={`${inp} col-span-2`} />
              <select value={draft.type} onChange={e => setDraft(d => ({...d,type:e.target.value}))} className={inp}>
                {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={addProject} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Create Project
              </button>
              <button onClick={() => { setShowAddProj(false); setDraft({name:'',artist:'',type:'Album'}); }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <div className="text-5xl mb-4">🎵</div>
            <p className="text-lg font-medium text-gray-500">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map(p => (
              <div key={p.id}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-colors group"
                onClick={() => { setProjId(p.id); setSearch(''); setExportSel(new Set()); setView('project'); }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-100">{p.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{[p.artist,p.type].filter(Boolean).join(' · ')} · {p.tracks.length} track{p.tracks.length!==1?'s':''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 group-hover:text-indigo-400 transition-colors">Open →</span>
                    <button onClick={e => { e.stopPropagation(); delProject(p.id); }}
                      className="text-gray-700 hover:text-red-400 text-xl leading-none opacity-0 group-hover:opacity-100 transition-all">×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (view === 'project') return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => setView('dashboard')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-4 block">
          ← All Projects
        </button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{proj?.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{[proj?.artist, proj?.type].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={addTrack} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            + Add Track
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tracks by title..." className={`${inp} flex-1`} />
          {exportSel.size > 0 && (
            <button onClick={() => doExport([...exportSel])}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
              Export {exportSel.size} PDF{exportSel.size!==1?'s':''}
            </button>
          )}
          {proj?.tracks.length > 0 && (
            <button
              onClick={() => setExportSel(s => s.size===proj.tracks.length ? new Set() : new Set(proj.tracks.map(t => t.id)))}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
              {exportSel.size===proj?.tracks.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {filteredTracks.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            {proj?.tracks.length === 0
              ? <><div className="text-3xl mb-2">♪</div><p>No tracks yet — add your first track</p></>
              : <p>No tracks match "{search}"</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredTracks.map(t => (
              <div key={t.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors group">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={exportSel.has(t.id)} onChange={() => togExport(t.id)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openTrack(t)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.trackNum && <span className="text-xs text-gray-600">{t.trackNum}.</span>}
                      <span className="font-medium text-gray-100 truncate">{t.title||'Untitled Track'}</span>
                      {t.explicit && <span className="text-xs bg-gray-700 text-gray-400 px-1.5 rounded">E</span>}
                      {t.aiAssisted==='Yes' && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">AI</span>}
                      {t.aiAssisted==='Partially' && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded-full">AI Partial</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {t.bpm && <span className="text-xs text-gray-500">{t.bpm} BPM</span>}
                      {t.key && <span className="text-xs text-gray-500">{t.key}</span>}
                      {t.genre && <span className="text-xs text-gray-500">{t.genre}</span>}
                      {t.duration && <span className="text-xs text-gray-500">{t.duration}</span>}
                      {t.isrc && <span className="text-xs text-gray-600">{t.isrc}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openTrack(t)} className="text-xs text-gray-400 hover:text-indigo-400 transition-colors">Edit</button>
                    <button onClick={() => doExport([t.id])} className="text-xs text-gray-400 hover:text-emerald-400 transition-colors">PDF</button>
                    <button onClick={() => delTrack(t.id)} className="text-gray-600 hover:text-red-400 text-xl leading-none transition-colors">×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (view === 'track') return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => setView('dashboard')} className="text-gray-600 hover:text-gray-400 transition-colors">Projects</button>
          <span className="text-gray-700">›</span>
          <button onClick={() => { setView('project'); setSec(0); }} className="text-gray-600 hover:text-gray-400 transition-colors">{proj?.name}</button>
          <span className="text-gray-700">›</span>
          <span className="text-gray-400">{track?.title||'New Track'}</span>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {SECTIONS.map((s,i) => (
            <button key={i} onClick={() => setSec(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                sec===i ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }`}>{s}</button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-5">{SECTIONS[sec]}</h3>
          {renderSec()}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setSec(s => Math.max(0,s-1))} disabled={sec===0}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
            ← Prev
          </button>
          <div className="flex gap-2">
            <button onClick={saveTrack} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">
              Save & Exit
            </button>
            {sec < SECTIONS.length-1 ? (
              <button onClick={() => setSec(s => s+1)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                Next →
              </button>
            ) : (
              <button onClick={saveTrack} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                Save Track ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}