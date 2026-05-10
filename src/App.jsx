import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import InstallBanner from "./InstallBanner";
import AccountSettings from "./AccountSettings";
import ArtistProfile from "./ArtistProfile";
import { analyzeAudio } from "./lib/audioAnalysis";
import { exportTracksToCsv } from "./lib/csvExport";
import BulkEditModal from "./components/BulkEditModal";
import SpotifyImportModal from "./components/SpotifyImportModal";
import BriefBoard from "./BriefBoard";

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
  'Viewed': 'bg-brand-yellow/10 text-brand-yellow/75',
  'In Consideration': 'bg-yellow-900/50 text-yellow-400',
  'Passed': 'bg-red-900/50 text-red-400',
  'Licensed': 'bg-green-900/50 text-green-400',
  'No Response': 'bg-gray-800 text-gray-500',
};

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow w-full";

// Format validators for industry-standard identifiers.
// Each takes a value and returns null if valid, or an error message string if invalid.
const VALIDATORS = {
  isrc: v => /^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i.test(v) ? null : 'ISRC format: CC-XXX-YY-NNNNN (12 chars)',
  iswc: v => /^T-?\d{3}\.?\d{3}\.?\d{3}-?\d$/i.test(v) ? null : 'ISWC format: T-XXX.XXX.XXX-X',
  ipi:  v => /^\d{9,11}$/.test(v) ? null : 'IPI must be 9-11 digits',
  isni: v => /^(\d{4}-?){3}\d{3}[\dX]$/i.test(v.replace(/\s/g,'')) ? null : 'ISNI must be 16 digits (last can be X)',
  upc:  v => /^\d{12,13}$/.test(v) ? null : 'UPC must be 12 digits, EAN must be 13',
};
const newTrackData = () => ({
  title:'', artist:'', featuring:'', albumArtist:'', trackNum:'', duration:'',
  isrc:'', isni:'', ipi:'', iswc:'', upc:'', pro:'', label:'', publisher:'', masterOwner:'',
  copyrightYear:'', releaseDate:'', fileFormat:'', sampleRate:'', bitDepth:'',
  bpm:'', key:'', timeSig:'', genre:'', subGenre:'',
  energy:50, danceability:50, acousticness:50, instrumentalness:50,
  tempoFeel:'', moods:[], instruments:[], hasVocals:'', vocalType:'', language:'', explicit:false, themes:'',
  aiAssisted:'No', aiNotes:'',
  masterOwners:[{name:'',role:'',pct:''}],
  pubOwners:[{name:'',role:'',pct:''}],
  contactName:'', contactEmail:'', contactPhone:'', comments:'',
  audioUrl:'', audioPath:'', stemsUrl:'', stemsPath:''
});

const newPitch = () => ({
  track_id:'', track_title:'', supervisor_name:'', company:'', project_name:'',
  date_sent:'', method:'Email', status:'Sent', follow_up_date:'', notes:''
});

const FIELD_MAP = {
  'title':'title','track title':'title','song title':'title','song':'title',
  'artist':'artist','artist name':'artist',
  'featuring':'featuring','feat':'featuring','feature':'featuring',
  'bpm':'bpm','tempo':'bpm','key':'key','musical key':'key','genre':'genre',
  'subgenre':'subGenre','sub genre':'subGenre','sub-genre':'subGenre',
  'isrc':'isrc','isni':'isni','ipi':'ipi','iswc':'iswc',
  'upc':'upc','upc/ean':'upc','ean':'upc',
  'pro':'pro','publisher':'publisher','label':'label',
  'master owner':'masterOwner','masterowner':'masterOwner',
  'copyright year':'copyrightYear','copyrightyear':'copyrightYear',
  'release date':'releaseDate','releasedate':'releaseDate',
  'duration':'duration','length':'duration',
  'file format':'fileFormat','fileformat':'fileFormat','format':'fileFormat',
  'sample rate':'sampleRate','samplerate':'sampleRate',
  'bit depth':'bitDepth','bitdepth':'bitDepth',
  'language':'language','explicit':'explicit',
  'themes':'themes','keywords':'themes',
  'moods':'moods','mood':'moods',
  'instruments':'instruments','instrument':'instruments',
  'vocals':'hasVocals','has vocals':'hasVocals',
  'vocal type':'vocalType','vocaltype':'vocalType',
  'energy':'energy','danceability':'danceability','acousticness':'acousticness',
  'instrumentalness':'instrumentalness',
  'ai assisted':'aiAssisted','aiassisted':'aiAssisted','ai':'aiAssisted',
  'comments':'comments','notes':'comments',
  'contact name':'contactName','contactname':'contactName','contact':'contactName',
  'email':'contactEmail','contact email':'contactEmail',
  'phone':'contactPhone','contact phone':'contactPhone',
};

function mapRow(row) {
  const track = newTrackData();
  for (const [col, val] of Object.entries(row)) {
    const key = FIELD_MAP[col.toLowerCase().trim()];
    if (key && val !== undefined && val !== null && val !== '') {
      if (key === 'moods' || key === 'instruments') track[key] = String(val).split(',').map(s=>s.trim()).filter(Boolean);
      else if (key === 'explicit') track[key] = String(val).toLowerCase()==='yes'||val===true||val===1;
      else if (['energy','danceability','acousticness','instrumentalness'].includes(key)) track[key] = Math.min(100,Math.max(0,parseFloat(val)||50));
      else track[key] = String(val);
    }
  }
  return track;
}

// ── AudioPlayer component ─────────────────────────────────────────────────────
function AudioPlayer({ url }) {
  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const onEnded = () => setPlaying(false);

  const seek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const fmt = s => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
      <audio ref={audioRef} src={url} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={onEnded} />
      <button onClick={toggle} className="text-brand-yellow/75 hover:text-brand-yellow flex-shrink-0 w-7 h-7 flex items-center justify-center">
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer" onClick={seek}>
        <div className="h-1.5 bg-brand-yellow rounded-full transition-all" style={{width: duration ? `${(progress/duration)*100}%` : '0%'}} />
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">{fmt(progress)} / {fmt(duration)}</span>
    </div>
  );
}

function buildTrackHTML(t, projectName) {
  const d = t.data||t;
  const f = (lbl,val) => val?`<tr><td class="lbl">${lbl}</td><td class="val">${val}</td></tr>`:'';
  const bar = v => `<div class="bar-row"><div class="bar"><div class="fill" style="width:${v}%"></div></div><span class="bval">${v}</span></div>`;
  const tags = arr => arr&&arr.length?arr.map(x=>`<span class="tag">${x}</span>`).join(''):'—';
  const aiCls = d.aiAssisted==='No'?'ai-no':d.aiAssisted==='Yes'?'ai-yes':'ai-partial';
  const ownerTable = owners => {
    if(!owners)return'<p class="none">Not specified</p>';
    const v=owners.filter(o=>o.name);
    if(!v.length)return'<p class="none">Not specified</p>';
    return`<table class="owners"><tr><th>Name</th><th>Role</th><th>%</th></tr>${v.map(o=>`<tr><td>${o.name}</td><td>${o.role}</td><td>${o.pct}%</td></tr>`).join('')}</table>`;
  };
  return`<div class="page">
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

function Inp({ label, value, onChange, placeholder='', type='text', cls='', validate=null }) {
  const error = validate && value ? validate(value) : null;
  return (
    <div className={`flex flex-col gap-1 ${cls}`}>
      {label && <label className="text-xs text-gray-400 font-medium">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${inp} ${error ? 'border-yellow-600 focus:border-yellow-500 focus:ring-yellow-500' : ''}`} />
      {error && <span className="text-xs text-yellow-500">{error}</span>}
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
        <span className="text-xs text-brand-yellow/75 font-semibold">{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={e => onChange(+e.target.value)} className="w-full accent-brand-yellow cursor-pointer" />
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
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(o)?'bg-brand-yellow border-brand-yellow/50 text-brand-navy':'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function OwnerRows({ field, roles, trackData, updOwner, addOwner, rmOwner }) {
  return (
    <div className="flex flex-col gap-3">
      {trackData[field].map((o,i) => (
        <div key={i} className="flex flex-col gap-2 bg-gray-800/50 rounded-lg p-3">
          <input value={o.name} onChange={e=>updOwner(field,i,'name',e.target.value)} placeholder="Full Name" className={inp} />
          <div className="flex gap-2">
            <select value={o.role} onChange={e=>updOwner(field,i,'role',e.target.value)} className={`${inp} flex-1`}>
              <option value="">Role</option>{roles.map(r=><option key={r}>{r}</option>)}
            </select>
            <div className="flex items-center gap-1 w-24">
              <input value={o.pct} onChange={e=>updOwner(field,i,'pct',e.target.value)} placeholder="%" className={`${inp} text-center`} />
            </div>
            {trackData[field].length>1 && <button onClick={()=>rmOwner(field,i)} className="text-gray-600 hover:text-red-400 text-xl px-1">×</button>}
          </div>
        </div>
      ))}
      <button onClick={() => addOwner(field)} className="text-xs text-brand-yellow/75 hover:text-brand-yellow text-left w-fit">+ Add owner</button>
    </div>
  );
}

const CRITICAL_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'masterOwner', label: 'Master Owner' },
  { key: 'contactEmail', label: 'Contact Email' },
];

function TrackForm({ trackData, sec, sf, tog, updOwner, addOwner, rmOwner, pct, saveTrack, setSec, onAudioUpload, onAudioDelete, audioUploading, audioAnalyzing, onStemsUpload, onStemsDelete, stemsUploading }) {
  const audioFileRef = useRef();
  const stemsFileRef = useRef();
  const missing = CRITICAL_FIELDS.filter(f => !trackData[f.key] || String(trackData[f.key]).trim() === '');
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">{SECTIONS[sec]}</h3>
      {missing.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-500 font-medium">Missing info: {missing.map(f => f.label).join(', ')}</p>
        </div>
      )}
      {sec === 0 && <div className="flex flex-col gap-3">
        <Inp label="Track Title *" value={trackData.title} onChange={v=>sf('title',v)} />
        <Inp label="Artist" value={trackData.artist} onChange={v=>sf('artist',v)} />
        <Inp label="Featuring" value={trackData.featuring} onChange={v=>sf('featuring',v)} placeholder="ft. Artist Name" />
        <Inp label="Album Artist" value={trackData.albumArtist} onChange={v=>sf('albumArtist',v)} />
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Track Number" value={trackData.trackNum} onChange={v=>sf('trackNum',v)} placeholder="e.g. 3" />
          <Inp label="Duration" value={trackData.duration} onChange={v=>sf('duration',v)} placeholder="e.g. 3:42" />
        </div>

        {/* ── Audio Upload ── */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-400 font-medium">Audio File (MP3)</label>
          {trackData.audioUrl ? (
            <div className="flex flex-col gap-2">
             <AudioPlayer url={trackData.audioUrl} />
              {audioAnalyzing && (
                <div className="text-xs text-brand-yellow/75 mt-2 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                  Analyzing audio...
                </div>
              )}
              <button
                onClick={onAudioDelete}
                className="text-xs text-red-400 hover:text-red-300 text-left w-fit transition-colors"
              >
                Remove audio
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={audioFileRef}
                type="file"
                accept=".mp3,.wav,.aiff,.aif,audio/mpeg,audio/wav,audio/aiff"
                className="hidden"
                onChange={e => { if(e.target.files[0]) onAudioUpload(e.target.files[0]); }}
              />
              <button
                onClick={() => audioFileRef.current.click()}
                disabled={audioUploading}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 border-dashed text-gray-400 text-xs px-4 py-3 rounded-lg w-full transition-colors"
              >
                {audioUploading ? 'Uploading...' : '+ Upload MP3'}
              </button>
            </div>
          )}
        </div>

        {/* ── Stems Pack Upload (zip) ── */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-400 font-medium">Stems Pack (zip, optional)</label>
          {trackData.stemsUrl ? (
            <div className="flex items-center justify-between gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-300 truncate">📦 Stems pack uploaded</span>
              <div className="flex gap-3 flex-shrink-0">
                <a href={trackData.stemsUrl} download className="text-xs text-brand-yellow/75 hover:text-brand-yellow transition-colors">
                  Download
                </a>
                <button
                  onClick={onStemsDelete}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                ref={stemsFileRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={e => { if(e.target.files[0]) onStemsUpload(e.target.files[0]); }}
              />
              <button
                onClick={() => stemsFileRef.current.click()}
                disabled={stemsUploading}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 border-dashed text-gray-400 text-xs px-4 py-3 rounded-lg w-full transition-colors"
              >
                {stemsUploading ? 'Uploading...' : '+ Upload Stems (zip)'}
              </button>
            </div>
          )}
        </div>
      </div>}

      {sec === 1 && <div className="flex flex-col gap-3">
        <Inp label="ISRC" value={trackData.isrc} onChange={v=>sf('isrc',v)} placeholder="e.g. USRC12345678" validate={VALIDATORS.isrc} />
        <Inp label="ISNI" value={trackData.isni} onChange={v=>sf('isni',v)} validate={VALIDATORS.isni} />
        <Inp label="IPI" value={trackData.ipi} onChange={v=>sf('ipi',v)} validate={VALIDATORS.ipi} />
        <Inp label="ISWC" value={trackData.iswc} onChange={v=>sf('iswc',v)} validate={VALIDATORS.iswc} />
        <Inp label="UPC/EAN" value={trackData.upc} onChange={v=>sf('upc',v)} validate={VALIDATORS.upc} />
        <Sel label="PRO" value={trackData.pro} onChange={v=>sf('pro',v)} options={PROS} />
        <Inp label="Publisher" value={trackData.publisher} onChange={v=>sf('publisher',v)} />
        <Inp label="Label" value={trackData.label} onChange={v=>sf('label',v)} />
        <Inp label="Master Owner" value={trackData.masterOwner} onChange={v=>sf('masterOwner',v)} />
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Copyright Year" value={trackData.copyrightYear} onChange={v=>sf('copyrightYear',v)} placeholder="e.g. 2024" />
          <Inp label="Release Date" value={trackData.releaseDate} onChange={v=>sf('releaseDate',v)} type="date" />
          <Sel label="File Format" value={trackData.fileFormat} onChange={v=>sf('fileFormat',v)} options={FORMATS} />
          <Sel label="Sample Rate" value={trackData.sampleRate} onChange={v=>sf('sampleRate',v)} options={SAMPLE_RATES} />
        </div>
        <Sel label="Bit Depth" value={trackData.bitDepth} onChange={v=>sf('bitDepth',v)} options={BIT_DEPTHS} />
      </div>}

      {sec === 2 && <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Inp label="BPM" value={trackData.bpm} onChange={v=>sf('bpm',v)} placeholder="e.g. 120" />
          <Sel label="Key" value={trackData.key} onChange={v=>sf('key',v)} options={KEYS} />
        </div>
        <Sel label="Time Signature" value={trackData.timeSig} onChange={v=>sf('timeSig',v)} options={TIME_SIGS} />
        <Inp label="Genre" value={trackData.genre} onChange={v=>sf('genre',v)} placeholder="e.g. Hip-Hop" />
        <Inp label="Sub-Genre" value={trackData.subGenre} onChange={v=>sf('subGenre',v)} placeholder="e.g. Trap" />
        <Sel label="Tempo Feel" value={trackData.tempoFeel} onChange={v=>sf('tempoFeel',v)} options={TEMPO_FEELS} />
        <Sel label="Vocals" value={trackData.hasVocals} onChange={v=>sf('hasVocals',v)} options={['Yes','No','Instrumental Version Available']} />
        {trackData.hasVocals==='Yes' && <>
          <Sel label="Vocal Type" value={trackData.vocalType} onChange={v=>sf('vocalType',v)} options={VOCAL_TYPES} />
          <Sel label="Language" value={trackData.language} onChange={v=>sf('language',v)} options={LANGUAGES} />
        </>}
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={trackData.explicit} onChange={e=>sf('explicit',e.target.checked)} className="w-5 h-5 accent-brand-yellow cursor-pointer" id="exp" />
          <label htmlFor="exp" className="text-sm text-gray-300 cursor-pointer">Explicit Content</label>
        </div>
      </div>}

      {sec === 3 && <div className="flex flex-col gap-5">
        <Tags label="Moods" options={MOODS} selected={trackData.moods} onToggle={v=>tog('moods',v)} />
        <Tags label="Instruments" options={INSTRUMENTS} selected={trackData.instruments} onToggle={v=>tog('instruments',v)} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Themes / Keywords</label>
          <input value={trackData.themes} onChange={e=>sf('themes',e.target.value)} placeholder="e.g. loss, redemption, summer" className={inp} />
        </div>
        <div className="flex flex-col gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Audio Features</p>
            <p className="text-xs text-gray-600">Energy and Danceability auto-fill from uploaded audio. Acousticness and Instrumentalness are your estimates.</p>
          </div>
          <Slider label="Energy" value={trackData.energy} onChange={v=>sf('energy',v)} />
          <Slider label="Danceability" value={trackData.danceability} onChange={v=>sf('danceability',v)} />
          <Slider label="Acousticness" value={trackData.acousticness} onChange={v=>sf('acousticness',v)} />
          <Slider label="Instrumentalness" value={trackData.instrumentalness} onChange={v=>sf('instrumentalness',v)} />
        </div>
      </div>}

      {sec === 4 && <div className="flex flex-col gap-5">
        <div>
          <label className="text-xs text-gray-400 font-medium block mb-3">AI Assisted</label>
          <div className="flex gap-2">
            {['No','Partially','Yes'].map(opt => (
              <button key={opt} onClick={()=>sf('aiAssisted',opt)}
                className={`py-3 rounded-lg text-sm font-semibold border transition-colors flex-1 ${trackData.aiAssisted===opt?opt==='No'?'bg-green-600 border-green-500 text-white':opt==='Yes'?'bg-red-600 border-red-500 text-white':'bg-yellow-500 border-yellow-400 text-gray-900':'bg-gray-800 border-gray-700 text-gray-400'}`}>{opt}</button>
            ))}
          </div>
        </div>
        {trackData.aiAssisted!=='No' && <div className="flex flex-col gap-1"><label className="text-xs text-gray-400 font-medium">What was AI-assisted?</label><textarea value={trackData.aiNotes} onChange={e=>sf('aiNotes',e.target.value)} rows={3} className={`${inp} resize-none`} /></div>}
        {trackData.aiAssisted==='No' && <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-sm text-green-400">✓ 100% human-created content</div>}
      </div>}

      {sec === 5 && <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-400 font-medium">Master Ownership</label>
            <span className={`text-xs font-semibold ${pct(trackData.masterOwners)===100?'text-green-400':'text-yellow-500'}`}>{pct(trackData.masterOwners)}%</span>
          </div>
          <OwnerRows field="masterOwners" roles={WRITER_ROLES} trackData={trackData} updOwner={updOwner} addOwner={addOwner} rmOwner={rmOwner} />
        </div>
        <div className="border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-400 font-medium">Publishing Ownership</label>
            <span className={`text-xs font-semibold ${pct(trackData.pubOwners)===100?'text-green-400':'text-yellow-500'}`}>{pct(trackData.pubOwners)}%</span>
          </div>
          <OwnerRows field="pubOwners" roles={PUB_ROLES} trackData={trackData} updOwner={updOwner} addOwner={addOwner} rmOwner={rmOwner} />
        </div>
      </div>}

      {sec === 6 && <div className="flex flex-col gap-4">
        <Inp label="Contact Name" value={trackData.contactName} onChange={v=>sf('contactName',v)} />
        <Inp label="Email" value={trackData.contactEmail} onChange={v=>sf('contactEmail',v)} type="email" />
        <Inp label="Phone" value={trackData.contactPhone} onChange={v=>sf('contactPhone',v)} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Additional Comments</label>
          <textarea value={trackData.comments} onChange={e=>sf('comments',e.target.value)} rows={5} className={`${inp} resize-none`} />
        </div>
      </div>}
    </div>
  );
}

// ── Fuzzy title matching helpers ─────────────────────────────────────────────
function normalizeTitle(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}
function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = [];
  for (let i = 0; i <= a.length; i++) dp[i] = [i];
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}
function titleSim(a, b) {
  const na = normalizeTitle(a), nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

function ImportModal({ projects, session, onClose, onImported, defaultProjId, existingTracks = [], fillMode = false }) {
  const [mode, setMode] = useState('single');
  const [targetProjId, setTargetProjId] = useState(defaultProjId || '');
  useEffect(() => {
  if (defaultProjId) setTargetProjId(defaultProjId);
}, [defaultProjId]);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState('upload');
  const [importing, setImporting] = useState(false);
  const [matchResults, setMatchResults] = useState([]);
  const fileRef = useRef();

  const FSM_FIELD_GROUPS = [
  { label: 'Basic', fields: [
    {value:'title',label:'Track Title'},
    {value:'artist',label:'Artist'},
    {value:'featuring',label:'Featuring'},
    {value:'albumArtist',label:'Album Artist'},
    {value:'trackNum',label:'Track Number'},
    {value:'duration',label:'Duration'},
  ]},
  { label: 'Musical', fields: [
    {value:'genre',label:'Genre'},
    {value:'subGenre',label:'Sub-Genre'},
    {value:'bpm',label:'BPM'},
    {value:'key',label:'Key'},
    {value:'timeSig',label:'Time Signature'},
    {value:'tempoFeel',label:'Tempo Feel'},
    {value:'moods',label:'Moods'},
    {value:'instruments',label:'Instruments'},
    {value:'themes',label:'Themes / Keywords'},
    {value:'hasVocals',label:'Has Vocals'},
    {value:'vocalType',label:'Vocal Type'},
    {value:'language',label:'Language'},
    {value:'explicit',label:'Explicit'},
  ]},
  { label: 'Audio Features', fields: [
    {value:'energy',label:'Energy'},
    {value:'danceability',label:'Danceability'},
    {value:'acousticness',label:'Acousticness'},
    {value:'instrumentalness',label:'Instrumentalness'},
  ]},
  { label: 'Rights & IDs', fields: [
    {value:'isrc',label:'ISRC'},
    {value:'isni',label:'ISNI'},
    {value:'ipi',label:'IPI'},
    {value:'iswc',label:'ISWC'},
    {value:'upc',label:'UPC/EAN'},
    {value:'pro',label:'PRO'},
    {value:'publisher',label:'Publisher'},
    {value:'label',label:'Label'},
    {value:'masterOwner',label:'Master Owner'},
    {value:'copyrightYear',label:'Copyright Year'},
    {value:'releaseDate',label:'Release Date'},
  ]},
  { label: 'Technical', fields: [
    {value:'fileFormat',label:'File Format'},
    {value:'sampleRate',label:'Sample Rate'},
    {value:'bitDepth',label:'Bit Depth'},
  ]},
  { label: 'AI Disclosure', fields: [
    {value:'aiAssisted',label:'AI Assisted'},
    {value:'aiNotes',label:'AI Notes'},
  ]},
  { label: 'Contact', fields: [
    {value:'contactName',label:'Contact Name'},
    {value:'contactEmail',label:'Contact Email'},
    {value:'contactPhone',label:'Contact Phone'},
    {value:'comments',label:'Comments / Notes'},
  ]},
];

  const parseCSVLine = (line) => {
    const fields = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { fields.push(''); break; }
      if (line[i] === '"') {
        let val = ''; i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i+1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i]; i++; }
        }
        if (line[i] === ',') i++;
        fields.push(val.trim());
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i).trim()); break; }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return fields;
  };

  const parseFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    let hdrs = [], data = [];
    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      hdrs = parseCSVLine(lines[0]);
      data = lines.slice(1).map(line => {
        const vals = parseCSVLine(line);
        return Object.fromEntries(hdrs.map((h,i) => [h, vals[i]||'']));
      }).filter(r => Object.values(r).some(v => v));
    } else if (ext==='xlsx'||ext==='xls') {
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const {read,utils} = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
          const wb = read(e.target.result,{type:'array'});
          const ws = wb.Sheets[wb.SheetNames[0]];
          data = utils.sheet_to_json(ws,{defval:''});
          if(data.length) hdrs = Object.keys(data[0]);
          resolve();
        };
        reader.readAsArrayBuffer(file);
      });
    }
   if (!hdrs.length) return;

// Start with the existing rule-based mapping as a fallback
const autoMap = {};
hdrs.forEach(h => { autoMap[h] = FIELD_MAP[h.toLowerCase().trim()] || ''; });

// Try AI mapping for any columns that didn't auto-map
const unmapped = hdrs.filter(h => !autoMap[h]);
if (unmapped.length > 0) {
  try {
    const columns = unmapped.map(h => ({
      header: h,
      sample: data[0]?.[h] ? String(data[0][h]).slice(0, 50) : ''
    }));
    const res = await fetch('/api/suggest-field-mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns })
    });
    const { mapping } = await res.json();
    if (mapping) {
      Object.entries(mapping).forEach(([col, field]) => {
        if (field && !autoMap[col]) autoMap[col] = field;
      });
    }
  } catch (e) {
    console.log('AI mapping failed, using rule-based only', e.message);
  }
}

setHeaders(hdrs); setRows(data); setMapping(autoMap); setStep('map');
  };

  const applyMapping = (rows) => rows.map(row => {
    const track = newTrackData();
    for (const [col, fsField] of Object.entries(mapping)) {
      if (!fsField) continue;
      const val = row[col];
      if (val===undefined||val===null||val==='') continue;
      if (fsField==='moods'||fsField==='instruments') track[fsField] = String(val).split(',').map(s=>s.trim()).filter(Boolean);
      else if (fsField==='explicit') track[fsField] = String(val).toLowerCase()==='yes'||val===true||val===1;
      else if (['energy','danceability','acousticness','instrumentalness'].includes(fsField)) track[fsField] = Math.min(100,Math.max(0,parseFloat(val)||50));
      else track[fsField] = String(val);
    }
    return track;
  });

  const doImport = async () => {
    if (!targetProjId) return alert('Please select a project first.');
    setImporting(true);
    const mapped = applyMapping(mode==='single'?[rows[0]]:rows);
    for (const trackData of mapped) {
      await supabase.from('tracks').insert({project_id:targetProjId,user_id:session.user.id,data:trackData});
    }
    setImporting(false); onImported(); onClose();
  };

  const buildMatches = () => {
    const titleCol = Object.entries(mapping).find(([, field]) => field === 'title')?.[0];
    if (!titleCol) { doImport(); return; } // no title column — fall back to normal import
    const activeRows = fillMode ? rows : (mode === 'single' ? [rows[0]] : rows);
    const results = activeRows.map(row => {
      const csvTitle = row[titleCol] || '';
      const mappedData = applyMapping([row])[0];
      const scores = existingTracks.map(t => ({
        track: t,
        score: titleSim(csvTitle, t.data?.title || ''),
      })).sort((a, b) => b.score - a.score);
      const best = scores[0];
      const second = scores[1];
      const ambiguous = best?.score >= 0.5 && second?.score >= 0.5 && (best.score - second.score) < 0.15 && best.score < 0.95;
      return {
        csvTitle,
        mappedData,
        bestMatch: best?.score >= 0.5 ? best.track : null,
        bestScore: best?.score || 0,
        ambiguous,
        candidates: scores.filter(s => s.score >= 0.35).slice(0, 5),
        userOverride: undefined, // undefined = use bestMatch, null = skip, id string = specific track
      };
    });
    setMatchResults(results);
    setStep('match');
  };

  const setMatchOverride = (idx, value) => {
    setMatchResults(rs => rs.map((r, i) => i === idx ? { ...r, userOverride: value } : r));
  };

  const doFillImport = async () => {
    setImporting(true);
    for (const result of matchResults) {
      const targetId = result.userOverride === undefined
        ? result.bestMatch?.id
        : result.userOverride === null ? null : result.userOverride;
      if (!targetId) continue;
      const existing = existingTracks.find(t => t.id === targetId);
      if (!existing) continue;
      const merged = { ...existing.data, ...result.mappedData };
      await supabase.from('tracks').update({ data: merged }).eq('id', targetId);
    }
    setImporting(false); onImported(); onClose();
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">{fillMode ? 'Fill from Imports' : 'Import Tracks from File'}</h2>
            {step==='map' && <p className="text-xs text-gray-500 mt-0.5">Match your columns to FSM fields</p>}
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {step==='upload' && <>
            {!fillMode && <div className="flex gap-2">
              {['single','bulk'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex-1 ${mode===m?'bg-brand-yellow border-brand-yellow/50 text-brand-navy':'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  {m==='single'?'Single Track':'Bulk Import'}
                </button>
              ))}
            </div>}
            {!defaultProjId && (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-400 font-medium">Import into project</label>
    <select value={targetProjId} onChange={e => setTargetProjId(e.target.value)} className={inp}>
      <option value="">Select a project...</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  </div>
)}
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-gray-500 transition-colors"
              onClick={() => fileRef.current.click()}>
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm text-gray-400">Tap to upload CSV or Excel</p>
              <p className="text-xs text-gray-600 mt-1">.csv, .xlsx, .xls</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => {if(e.target.files[0])parseFile(e.target.files[0]);}} />
            </div>
          </>}
          {step==='map' && <>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">{rows.length} row{rows.length!==1?'s':''} · {headers.length} columns</p>
              <span className="text-xs text-brand-yellow/75 font-medium">{mappedCount} mapped</span>
            </div>
            <div className="flex flex-col gap-2">
              {headers.map(h => {
                const takenByOthers = new Set(Object.entries(mapping).filter(([col, f]) => f && col !== h).map(([, f]) => f));
                return (
                  <div key={h} className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-300 truncate">{h}</p>
                      {rows[0]?.[h] && <p className="text-xs text-gray-600 truncate mt-0.5">e.g. {String(rows[0][h])}</p>}
                    </div>
                    <span className="text-gray-600 text-sm flex-shrink-0">→</span>
                    <select value={mapping[h]||''} onChange={e => setMapping(m=>({...m,[h]:e.target.value}))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-brand-yellow/50 flex-shrink-0 w-40">
                      <option value="">— Skip —</option>
                      {FSM_FIELD_GROUPS.map(group => {
                        const available = group.fields.filter(f => !takenByOthers.has(f.value) || mapping[h] === f.value);
                        if (!available.length) return null;
                        return (
                          <optgroup key={group.label} label={group.label}>
                            {available.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">Importing into</span>
              <span className="text-xs font-medium text-gray-100">{projects.find(p=>p.id===targetProjId)?.name||'No project selected'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('upload')} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">← Back</button>
              <button onClick={fillMode ? buildMatches : doImport} disabled={importing||!targetProjId}
                className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex-1">
                {importing ? 'Importing...' : fillMode ? `Match tracks →` : `Import ${mode==='single'?'1 track':rows.length+' tracks'}`}
              </button>
            </div>
          </>}
          {step==='match' && <>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">Matching {matchResults.length} CSV row{matchResults.length!==1?'s':''} to existing tracks by title</p>
              <span className="text-xs text-brand-yellow/75 font-medium">
                {matchResults.filter(r => (r.userOverride === undefined ? r.bestMatch : r.userOverride) ).length} will update
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {matchResults.map((r, i) => {
                const resolvedId = r.userOverride === undefined ? r.bestMatch?.id : r.userOverride;
                const isSkipped = resolvedId === null || resolvedId === undefined;
                const needsReview = r.ambiguous && r.userOverride === undefined;
                return (
                  <div key={i} className={`rounded-lg p-3 border ${needsReview ? 'bg-yellow-900/10 border-yellow-700/50' : isSkipped ? 'bg-gray-800/20 border-gray-800' : 'bg-gray-800/30 border-gray-700'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`text-base flex-shrink-0 ${needsReview ? 'text-yellow-400' : isSkipped ? 'text-gray-600' : 'text-green-400'}`}>
                        {needsReview ? '⚠' : isSkipped ? '✕' : '✓'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">"{r.csvTitle}"</p>
                        {!isSkipped && !needsReview && (
                          <p className="text-xs text-gray-500 mt-0.5">→ {existingTracks.find(t => t.id === resolvedId)?.data?.title || resolvedId}</p>
                        )}
                        {isSkipped && r.userOverride !== null && (
                          <p className="text-xs text-gray-600 mt-0.5">No match found — will be skipped</p>
                        )}
                        {r.userOverride === null && (
                          <p className="text-xs text-gray-600 mt-0.5">Skipped</p>
                        )}
                        {needsReview && (
                          <p className="text-xs text-yellow-600 mt-0.5">Ambiguous match — please confirm</p>
                        )}
                      </div>
                      <button onClick={() => setMatchOverride(i, r.userOverride === null ? undefined : null)}
                        className="text-xs text-gray-600 hover:text-gray-400 flex-shrink-0 px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 transition-colors">
                        {r.userOverride === null ? 'Restore' : 'Skip'}
                      </button>
                    </div>
                    {(r.ambiguous || needsReview) && r.userOverride !== null && (
                      <select
                        value={r.userOverride === undefined ? (r.bestMatch?.id || '') : r.userOverride}
                        onChange={e => setMatchOverride(i, e.target.value || null)}
                        className="bg-gray-800 border border-yellow-700/50 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-brand-yellow/50 w-full mt-1">
                        <option value="">— Skip this row —</option>
                        {r.candidates.map(c => (
                          <option key={c.track.id} value={c.track.id}>
                            {c.track.data?.title || 'Untitled'} ({Math.round(c.score * 100)}% match)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">← Back</button>
              <button onClick={doFillImport} disabled={importing}
                className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex-1">
                {importing ? 'Saving...' : `Fill from imports`}
              </button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

function PitchManager({ session }) {
  const [pitches, setPitches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [views, setViews] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(newPitch());
  const [filterStatus, setFilterStatus] = useState('');

  const allTracks = projects.flatMap(p => (p.tracks||[]).map(t => ({
    id:t.id, title:(t.data?.title||t.title||'Untitled'), project:p.name
  })));

  useEffect(() => {
    const load = async () => {
      const { data: projData } = await supabase
        .from('projects')
        .select('*, tracks(*)')
        .order('created_at', { ascending: false });
      if (projData) setProjects(projData.map(p => ({ ...p, tracks: p.tracks || [] })));

      const { data: pitchData } = await supabase
        .from('pitches')
        .select('*')
        .order('date_sent', { ascending: false });
      if (pitchData) {
        setPitches(pitchData);
        const tokens = pitchData.filter(p => p.playlist_token).map(p => p.playlist_token);
        if (tokens.length) {
          const { data: viewData } = await supabase
            .from('playlist_views')
            .select('*')
            .in('token', tokens)
            .order('viewed_at', { ascending: false });
          if (viewData) {
            const grouped = {};
            viewData.forEach(v => {
              if (!grouped[v.token]) grouped[v.token] = [];
              grouped[v.token].push(v);
            });
            setViews(grouped);
          }
        }
      }
      setLoaded(true);
    };
    load();
  }, []);

  const sf = (k,v) => setForm(f => ({...f,[k]:v}));

  const savePitch = async () => {
    const clean = {...form, date_sent:form.date_sent||null, follow_up_date:form.follow_up_date||null};
    if (editing) {
      const {data} = await supabase.from('pitches').update(clean).eq('id',editing).select().single();
      if(data)setPitches(ps=>ps.map(p=>p.id===editing?data:p));
    } else {
      const {data} = await supabase.from('pitches').insert({...clean,user_id:session.user.id}).select().single();
      if(data)setPitches(ps=>[data,...ps]);
    }
    setShowForm(false); setEditing(null); setForm(newPitch());
  };

  const delPitch = async id => {
    if(!window.confirm('Delete this pitch?'))return;
    await supabase.from('pitches').delete().eq('id',id);
    setPitches(ps=>ps.filter(p=>p.id!==id));
  };

  const openEdit = p => {setForm(p);setEditing(p.id);setShowForm(true);};
  const filtered = filterStatus?pitches.filter(p=>p.status===filterStatus):pitches;

  const fmt = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Pitch Manager</h1>
          <p className="text-gray-500 text-xs mt-0.5">Track every pitch and follow-up</p>
        </div>
        <button onClick={() => {setForm(newPitch());setEditing(null);setShowForm(true);}}
          className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          + Log Pitch
        </button>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap flex-shrink-0 transition-colors ${!filterStatus?'bg-brand-yellow border-brand-yellow/50 text-brand-navy':'bg-gray-800 border-gray-700 text-gray-400'}`}>
          All ({pitches.length})
        </button>
        {PITCH_STATUSES.map(s => {
          const count = pitches.filter(p=>p.status===s).length;
          if(!count)return null;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap flex-shrink-0 transition-colors ${filterStatus===s?'bg-brand-yellow border-brand-yellow/50 text-brand-navy':'bg-gray-800 border-gray-700 text-gray-400'}`}>
              {s} ({count})
            </button>
          );
        })}
      </div>
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">{editing?'Edit Pitch':'Log New Pitch'}</h3>
          <div className="flex flex-col gap-3">
            {editing ? (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-400 font-medium">Track</label>
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400">
      {form.track_title || 'Brief submission'} <span className="text-gray-600 text-xs ml-1">(cannot be changed)</span>
    </div>
  </div>
) : (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-400 font-medium">Track</label>
    <select value={form.track_id} onChange={e => {
      const t=allTracks.find(t=>t.id===e.target.value);
      sf('track_id',e.target.value);
      if(t)sf('track_title',`${t.title} (${t.project})`);
    }} className={inp}>
      <option value="">Select a track...</option>
      {allTracks.map(t=><option key={t.id} value={t.id}>{t.title} — {t.project}</option>)}
    </select>
  </div>
)}
            <Inp label="Supervisor Name" value={form.supervisor_name} onChange={v=>sf('supervisor_name',v)} placeholder="e.g. Jane Smith" />
            <Inp label="Company / Network" value={form.company} onChange={v=>sf('company',v)} placeholder="e.g. Netflix, NBC" />
            <Inp label="Project / Show / Film" value={form.project_name} onChange={v=>sf('project_name',v)} placeholder="e.g. Stranger Things S5" />
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Date Sent" value={form.date_sent} onChange={v=>sf('date_sent',v)} type="date" />
              <Sel label="Method" value={form.method} onChange={v=>sf('method',v)} options={PITCH_METHODS} />
              <Sel label="Status" value={form.status} onChange={v=>sf('status',v)} options={PITCH_STATUSES} />
              <Inp label="Follow-up Date" value={form.follow_up_date} onChange={v=>sf('follow_up_date',v)} type="date" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Notes</label>
              <textarea value={form.notes} onChange={e=>sf('notes',e.target.value)} rows={3}
                placeholder="Any additional notes..." className={`${inp} resize-none`} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={savePitch} className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1">
              {editing?'Update Pitch':'Save Pitch'}
            </button>
            <button onClick={() => {setShowForm(false);setEditing(null);setForm(newPitch());}}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
      {!loaded ? (
        <div className="text-center py-16 text-gray-600">Loading...</div>
      ) : filtered.length===0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-3xl mb-2">📬</div>
          <p className="text-sm">{filterStatus?`No pitches with status "${filterStatus}"` :'No pitches logged yet'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => {
            const plViews = p.playlist_token ? (views[p.playlist_token] || []) : [];
            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-100 text-sm">{p.supervisor_name||'Unknown Supervisor'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]||'bg-gray-800 text-gray-500'}`}>{p.status}</span>
                      {plViews.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-900/40 text-green-400">
                          {plViews.length} view{plViews.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {p.company && <p className="text-xs text-gray-500 mt-0.5">{p.company}</p>}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {p.track_title && <span className="text-xs text-brand-yellow/75">{p.track_title}</span>}
                      {p.project_name && <span className="text-xs text-gray-500">{p.project_name}</span>}
                    </div>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {p.date_sent && <span className="text-xs text-gray-600">{p.date_sent}</span>}
                      {p.method && <span className="text-xs text-gray-600">via {p.method}</span>}
                    </div>
                    {p.follow_up_date && <div className="mt-1 text-xs text-yellow-500">Follow-up: {p.follow_up_date}</div>}
                    {p.notes && <div className="mt-1 text-xs text-gray-500 line-clamp-2">{p.notes}</div>}
                    {plViews.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1 border-t border-gray-800 pt-2">
                        {plViews.slice(0, 3).map(v => (
                          <p key={v.id} className="text-xs text-gray-600">{fmt(v.viewed_at)}</p>
                        ))}
                        {plViews.length > 3 && <p className="text-xs text-gray-700">+{plViews.length - 3} more</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="text-xs text-gray-500 hover:text-brand-yellow/75 transition-colors py-1">Edit</button>
                    <button onClick={() => delPitch(p.id)} className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors py-1">×</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function LinksManager({ session }) {
  const [playlists, setPlaylists] = useState([]);
  const [views, setViews] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: pls } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (pls) setPlaylists(pls);

      if (pls?.length) {
        const tokens = pls.map(p => p.token);
        const { data: viewData } = await supabase
          .from('playlist_views')
          .select('*')
          .in('token', tokens)
          .order('viewed_at', { ascending: false });
        if (viewData) {
          const grouped = {};
          viewData.forEach(v => {
            if (!grouped[v.token]) grouped[v.token] = [];
            grouped[v.token].push(v);
          });
          setViews(grouped);
        }
      }
      setLoaded(true);
    };
    load();
  }, [session.user.id]);

  const parseUA = ua => {
    if (!ua) return 'Unknown device';
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
    const os = ua.includes('Mac') ? 'Mac' : ua.includes('Windows') ? 'Windows' : ua.includes('iPhone') ? 'iPhone' : ua.includes('Android') ? 'Android' : 'Unknown';
    return `${browser} on ${os}`;
  };

  const fmt = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const copyLink = (token, btn) => {
  navigator.clipboard.writeText(`${window.location.origin}/p/${token}`).then(() => {
    const el = btn.closest('button') || btn;
    const orig = el.textContent;
    el.textContent = 'Copied';
    setTimeout(() => el.textContent = orig, 1500);
  });
};

  const deletePlaylist = async (id) => {
    if (!window.confirm('Delete this shared link?')) return;
    await supabase.from('playlists').delete().eq('id', id);
    setPlaylists(ps => ps.filter(p => p.id !== id));
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Shared Links</h1>
        <p className="text-gray-500 text-xs mt-0.5">Track when supervisors open your playlists</p>
      </div>
      {!loaded ? (
        <div className="text-center py-16 text-gray-600">Loading...</div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-3xl mb-2">🔗</div>
          <p className="text-sm">No shared links yet. Select tracks in a project and hit Share.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {playlists.map(pl => {
            const plViews = views[pl.token] || [];
            const isOpen = expanded === pl.id;
            return (
              <div key={pl.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : pl.id)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100 text-sm truncate">{pl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pl.track_ids.length} track{pl.track_ids.length !== 1 ? 's' : ''} · {plViews.length} view{plViews.length !== 1 ? 's' : ''} · {new Date(pl.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p><p className="text-xs text-gray-500 mt-0.5">{pl.track_ids.length} track{pl.track_ids.length !== 1 ? 's' : ''} · {plViews.length} view{plViews.length !== 1 ? 's' : ''}</p>
                  </div>
                 <button
  onClick={e => { e.stopPropagation(); copyLink(pl.token, e.target); }}
  className="text-xs text-brand-yellow/75 hover:text-brand-yellow transition-colors flex-shrink-0 px-2 py-1 border border-brand-yellow/15 rounded-lg"
>
  Copy link
</button>
                  <button
                    onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                    className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors flex-shrink-0"
                  >
                    ×
                  </button>
                  <span className="text-gray-600 text-sm flex-shrink-0">{isOpen ? '↑' : '↓'}</span>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-800 px-4 py-3 flex flex-col gap-2">
                    {plViews.length === 0 ? (
                      <p className="text-xs text-gray-600 py-2">No views yet.</p>
                    ) : plViews.map(v => (
                      <div key={v.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{fmt(v.viewed_at)}</span>
                        <span className="text-gray-600">{parseUA(v.user_agent)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// Old BriefBoard (supervisor marketplace) removed — replaced by BriefBoard.jsx

function _OldBriefBoard_REMOVED({ session, projects }) {
  const [briefs, setBriefs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState({ genre: '', mood: '', project_type: '', bpm_min: '', bpm_max: '' });
  const [submitting, setSubmitting] = useState(null);
  const [submissions, setSubmissions] = useState(new Set());
  const [submitFlow, setSubmitFlow] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [submitStep, setSubmitStep] = useState('project');
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const load = async () => {
   const now = new Date().toISOString();
const { data } = await supabase
  .from('briefs')
  .select('*')
  .or(`deadline.gt.${now},deadline.is.null`)
  .neq('closed', true)
  .order('genre', { ascending: true });
  if (data) setBriefs(data);
console.log('briefs result', data, 'now', now);

      const { data: mySubs } = await supabase
        .from('brief_submissions')
        .select('brief_id')
        .eq('artist_id', session.user.id);
      if (mySubs) setSubmissions(new Set(mySubs.map(s => s.brief_id)));

      setLoaded(true);
    };
    load();
  }, [session.user.id]);

  const filtered = briefs.filter(b => {
    if (filters.genre && !b.genre?.toLowerCase().includes(filters.genre.toLowerCase())) return false;
    if (filters.mood && b.mood !== filters.mood) return false;
    if (filters.project_type && b.project_type !== filters.project_type) return false;
    if (filters.bpm_min && b.bpm_max && parseInt(b.bpm_max) < parseInt(filters.bpm_min)) return false;
    if (filters.bpm_max && b.bpm_min && parseInt(b.bpm_min) > parseInt(filters.bpm_max)) return false;
    return true;
  });

  const openSubmit = (brief) => {
    setSubmitFlow(brief);
    setSubmitStep('project');
    setSelectedProject(null);
    setSelectedTracks([]);
    setPlaylistName(brief.title);
  };

  const toggleTrack = (trackId) => {
    setSelectedTracks(prev => {
      if (prev.includes(trackId)) return prev.filter(id => id !== trackId);
      if (prev.length >= 3) return prev;
      return [...prev, trackId];
    });
  };

  const submitToBrief = async () => {
    if (!playlistName.trim()) return alert('Please name your playlist.');
    if (selectedTracks.length === 0) return alert('Please select at least one track.');
    setSubmitting(submitFlow.id);

    const { data: pl, error: plErr } = await supabase
      .from('playlists')
      .insert({
        user_id: session.user.id,
        name: playlistName.trim(),
        track_ids: selectedTracks,
      })
      .select()
      .single();

    if (plErr) { alert('Failed to create playlist: ' + plErr.message); setSubmitting(null); return; }

    const { error: subErr } = await supabase
      .from('brief_submissions')
      .insert({
        brief_id: submitFlow.id,
        artist_id: session.user.id,
        playlist_id: pl.id,
        playlist_name: playlistName.trim(),
      });

    if (subErr) { alert('Failed to submit: ' + subErr.message); setSubmitting(null); return; }

    const trackTitles = selectedProject.tracks
      .filter(t => selectedTracks.includes(t.id))
      .map(t => t.data?.title || 'Untitled')
      .join(', ');

    await supabase.from('pitches').insert({
      user_id: session.user.id,
      track_id: selectedTracks[0],
      track_title: trackTitles,
      supervisor_name: `Brief: ${submitFlow.title}`,
      project_name: selectedProject.name,
      date_sent: new Date().toISOString().split('T')[0],
      method: 'Submission Portal',
      status: 'Sent',
      notes: '',
      playlist_token: pl.token,
      brief_id: submitFlow.id,
      brief_title: submitFlow.title,
    });

    setSubmissions(s => new Set([...s, submitFlow.id]));
    setSubmitting(null);
    setSubmitFlow(null);
  };

  const fmt = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const PROJECT_TYPES = ['Commercial', 'Film', 'TV', 'Game', 'Other'];
  const MOODS = ['Dark','Uplifting','Melancholic','Intense','Calm','Dreamy','Aggressive','Romantic','Nostalgic','Mysterious','Triumphant','Tense','Playful','Epic','Intimate','Cinematic','Ethereal','Gritty','Anthemic','Hopeful'];

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Brief Board</h1>
        <p className="text-gray-500 text-xs mt-0.5">Active briefs from music supervisors</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <input value={filters.genre} onChange={e => setFilters(f => ({ ...f, genre: e.target.value }))}
          placeholder="Genre" className={inp} />
        <select value={filters.mood} onChange={e => setFilters(f => ({ ...f, mood: e.target.value }))} className={inp}>
          <option value="">All moods</option>
          {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.project_type} onChange={e => setFilters(f => ({ ...f, project_type: e.target.value }))} className={inp}>
          <option value="">All types</option>
          {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-1">
          <input type="number" value={filters.bpm_min} onChange={e => setFilters(f => ({ ...f, bpm_min: e.target.value }))}
            placeholder="BPM min" className={inp} />
          <input type="number" value={filters.bpm_max} onChange={e => setFilters(f => ({ ...f, bpm_max: e.target.value }))}
            placeholder="BPM max" className={inp} />
        </div>
      </div>

      {!loaded ? (
        <div className="text-center py-16 text-gray-600 text-sm">Loading briefs...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm">{briefs.length === 0 ? 'No active briefs right now.' : 'No briefs match your filters.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
  {Object.entries(
    filtered.reduce((groups, b) => {
      const key = b.genre || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
      return groups;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b)).map(([genre, genreBriefs]) => (
    <div key={genre}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">{genre}</p>
      <div className="flex flex-col gap-3">
        {genreBriefs.map(b => {
            const submitted = submissions.has(b.id);
            return (
              <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100">{b.title}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {b.genre && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{b.genre}</span>}
                      {b.mood && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{b.mood}</span>}
                      {b.project_type && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{b.project_type}</span>}
                      {(b.bpm_min || b.bpm_max) && (
                        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                          {b.bpm_min || '?'}–{b.bpm_max || '?'} BPM
                        </span>
                      )}
                    </div>
                    {b.deadline && <p className="text-xs text-gray-600 mt-1.5">Deadline: {fmt(b.deadline)}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {submitted ? (
                      <span className="text-xs bg-green-900/40 text-green-400 px-3 py-1.5 rounded-lg font-medium">Submitted</span>
                    ) : (
                      <button
                        onClick={() => openSubmit(b)}
                        className="text-xs bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
)}

      {/* Submission modal */}
      {submitFlow && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Submit to Brief</h2>
                <p className="text-xs text-gray-500 mt-0.5">{submitFlow.title}</p>
              </div>
              <button onClick={() => setSubmitFlow(null)} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
            </div>
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">

              {submitStep === 'project' && (
                <>
                  <p className="text-xs text-gray-400">Select a project to submit from:</p>
                  <div className="flex flex-col gap-2">
                    {projects.map(p => (
                      <div key={p.id}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-brand-yellow/50 transition-colors"
                        onClick={() => { setSelectedProject(p); setSubmitStep('tracks'); }}>
                        <p className="text-sm font-medium text-gray-100">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.tracks?.length || 0} tracks</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {submitStep === 'tracks' && selectedProject && (
                <>
                  <p className="text-xs text-gray-400">Select up to 3 tracks from <span className="text-gray-200">{selectedProject.name}</span>:</p>
                  <div className="flex flex-col gap-2">
                    {selectedProject.tracks?.map(t => {
                      const d = t.data || {};
                      const selected = selectedTracks.includes(t.id);
                      const disabled = !selected && selectedTracks.length >= 3;
                      return (
                        <div key={t.id}
                          onClick={() => !disabled && toggleTrack(t.id)}
                          className={`bg-gray-800 border rounded-lg p-3 cursor-pointer transition-colors ${selected ? 'border-brand-yellow/50 bg-brand-yellow/5' : disabled ? 'border-gray-700 opacity-40 cursor-not-allowed' : 'border-gray-700 hover:border-gray-500'}`}>
                          <p className="text-sm font-medium text-gray-100">{d.title || 'Untitled'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{[d.bpm && `${d.bpm} BPM`, d.key, d.genre].filter(Boolean).join(' · ')}</p>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setSubmitStep('name')} disabled={selectedTracks.length === 0}
                    className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    Next — Name Your Playlist
                  </button>
                </>
              )}

              {submitStep === 'name' && (
                <>
                  <p className="text-xs text-gray-400">Give your submission a name:</p>
                  <input
                    value={playlistName}
                    onChange={e => setPlaylistName(e.target.value)}
                    placeholder="e.g. Dark Cinematic Tracks"
                    className={inp}
                    autoFocus
                  />
                  <p className="text-xs text-gray-600">{selectedTracks.length} track{selectedTracks.length !== 1 ? 's' : ''} selected</p>
                  <button onClick={submitToBrief} disabled={!!submitting}
                    className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    {submitting ? 'Submitting...' : 'Submit to Brief'}
                  </button>
                  <button onClick={() => setSubmitStep('tracks')} className="text-xs text-gray-500 hover:text-gray-300 text-center transition-colors">
                    ← Back
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function App({ session }) {
  const [tab, _setTab] = useState('home');
  const [view, _setView] = useState(() => {
    const v = localStorage.getItem('fsm_view');
    return v === 'track' ? 'project' : (v || 'dashboard');
  });
  const [projects, setProjects] = useState([]);
  const [projId, _setProjId] = useState(() => localStorage.getItem('fsm_projId') || null);
  // Synchronous wrappers — guaranteed to save before iOS kills the page
  const setTab = (v) => { _setTab(v); };
  const setView = (v) => { localStorage.setItem('fsm_view', v); _setView(v); };
  const setProjId = (v) => { if (v) localStorage.setItem('fsm_projId', v); _setProjId(v); };
  const [trackData, setTrackData] = useState(null);
  const [trackId, setTrackId] = useState(null);
  const [parentTrackId, setParentTrackId] = useState(null);
  const [versionLabel, setVersionLabel] = useState(null);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showAddProj, setShowAddProj] = useState(false);
  const [showNewChooser, setShowNewChooser] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showArtistProfile, setShowArtistProfile] = useState(() => sessionStorage.getItem('fsm_show_artist_profile') === 'true');
  const [profileReady, setProfileReady] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showFillImport, setShowFillImport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [draft, setDraft] = useState({name:'',artist:'',type:'Album'});
  const [sec, setSec] = useState(0);
  const [exportSel, setExportSel] = useState(new Set());
const [printData, setPrintData] = useState(null);
const [shareLink, setShareLink] = useState(null);
const [shareLoading, setShareLoading] = useState(false);  const [audioUploading, setAudioUploading] = useState(false);
const [audioAnalyzing, setAudioAnalyzing] = useState(false);
const [stemsUploading, setStemsUploading] = useState(false);
const [showBulkEdit, setShowBulkEdit] = useState(false);
const [showSpotify, setShowSpotify] = useState(false);const [sharePrompt, setSharePrompt] = useState(null);
const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('fsm_onboarded'));
const [onboardStep, setOnboardStep] = useState(0);
const dismissOnboarding = (goToProjects = false) => {
  localStorage.setItem('fsm_onboarded', '1');
  setShowOnboarding(false);
  if (goToProjects) setTab('projects');
};
  useEffect(() => {
    supabase.from('projects').select('*, tracks(*)').order('created_at',{ascending:false})
      .then(({data}) => {if(data)setProjects(data.map(p=>({...p,tracks:p.tracks||[]})));setLoaded(true);});
  }, []);
useEffect(() => {
    supabase
      .from('artist_profiles')
      .select('onboarding_complete')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfileReady(data?.onboarding_complete === true);
      });
  }, [session.user.id]);


  const proj = projects.find(p=>p.id===projId);
  // Tracks selected across all projects (cross-project selection)
  const selectedTracks = projects.flatMap(p => p.tracks || []).filter(t => exportSel.has(t.id));
  const filteredTracks = proj?.tracks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    const d = t.data || t;
    const haystack = [
      d.title, d.artist, d.featuring, d.albumArtist,
      d.isrc, d.iswc, d.ipi, d.upc,
      d.key, d.genre, d.subGenre,
      d.publisher, d.label, d.masterOwner,
      d.contactName, d.contactEmail,
      d.themes, d.comments,
      d.bpm ? `${d.bpm} bpm` : null,
      ...(d.moods || []),
      ...(d.instruments || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  }) || [];

  // Group versions under their parents — versions appear right after their parent in the list
  const versionsByParent = filteredTracks.reduce((acc, t) => {
    if (t.parent_track_id) {
      (acc[t.parent_track_id] = acc[t.parent_track_id] || []).push(t);
    }
    return acc;
  }, {});
  const originals = filteredTracks.filter(t => !t.parent_track_id);
  const orphanVersions = filteredTracks.filter(t => t.parent_track_id && !originals.find(o => o.id === t.parent_track_id));
  const sortedTracks = [];
  originals.forEach(o => {
    sortedTracks.push(o);
    (versionsByParent[o.id] || []).forEach(v => sortedTracks.push(v));
  });
  sortedTracks.push(...orphanVersions);

  const sf = useCallback((k,v) => setTrackData(d=>({...d,[k]:v})), []);
  const tog = useCallback((f,v) => setTrackData(d=>({...d,[f]:d[f].includes(v)?d[f].filter(x=>x!==v):[...d[f],v]})), []);
  const updOwner = useCallback((f,i,k,v) => setTrackData(d=>({...d,[f]:d[f].map((o,j)=>j===i?{...o,[k]:v}:o)})), []);
  const addOwner = useCallback(f => setTrackData(d=>({...d,[f]:[...d[f],{name:'',role:'',pct:''}]})), []);
  const rmOwner = useCallback((f,i) => setTrackData(d=>({...d,[f]:d[f].filter((_,j)=>j!==i)})), []);
  const pct = useCallback(arr => arr?arr.reduce((s,o)=>s+(parseFloat(o.pct)||0),0):0, []);

  // ── Audio upload ──────────────────────────────────────────────────────────
  const handleAudioUpload = async (file) => {
    setAudioUploading(true);
    setAudioAnalyzing(true);

    // Kick off upload and analysis simultaneously — both work on the same
    // File object in memory and don't depend on each other.
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const uploadTask = supabase.storage.from('audio').upload(path, file, { upsert: false });
    const analysisTask = analyzeAudio(file);

    // Handle upload result
    const { error } = await uploadTask;
    if (error) {
      alert('Upload failed: ' + error.message);
      setAudioUploading(false);
      setAudioAnalyzing(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(path);
    setTrackData(d => ({ ...d, audioUrl: urlData.publicUrl, audioPath: path }));
    setAudioUploading(false);

    // Handle analysis result (may already be done by the time we await it)
    try {
      const result = await analysisTask;
      setTrackData(d => ({
        ...d,
        bpm: String(result.bpm),
        key: result.key || d.key,
        duration: result.duration,
        energy: result.energy,
        danceability: result.danceability,
      }));
    } catch (err) {
      console.error('[FSM] Audio analysis failed:', err);
    } finally {
      setAudioAnalyzing(false);
    }
  };

  const handleSpotifyImport = async (data) => {
    if (data.type === 'album') {
      // Create a new project from the album, populate with all tracks
      const { data: newProj, error: projErr } = await supabase
        .from('projects')
        .insert({
          user_id: session.user.id,
          name: data.albumName || 'Untitled Album',
          artist: data.albumArtist || '',
          type: 'Album',
        })
        .select()
        .single();
      if (projErr) { alert('Failed to create project: ' + projErr.message); return; }

      const trackInserts = data.tracks.map(t => ({
        project_id: newProj.id,
        user_id: session.user.id,
        data: { ...newTrackData(), ...t },
      }));
      const { data: newTracks, error: tracksErr } = await supabase
        .from('tracks')
        .insert(trackInserts)
        .select();
      if (tracksErr) { alert('Failed to add tracks: ' + tracksErr.message); return; }

      const { data: freshData } = await supabase.from('projects').select('*, tracks(*)').order('created_at',{ascending:false});
      if (freshData) setProjects(freshData.map(p => ({ ...p, tracks: p.tracks || [] })));
      setProjId(newProj.id);
      setView('project');
      return;
    }

    if (data.type === 'track') {
      const t = data.tracks[0];
      if (!t) return;
      let targetProjId = view === 'project' ? projId : null;
      if (!targetProjId) {
        const { data: newProj, error: projErr } = await supabase
          .from('projects')
          .insert({
            user_id: session.user.id,
            name: t.title || 'Untitled',
            artist: t.artist || '',
            type: 'Single',
          })
          .select()
          .single();
        if (projErr) { alert('Failed to create project: ' + projErr.message); return; }
        const { data: freshData } = await supabase.from('projects').select('*, tracks(*)').order('created_at',{ascending:false});
        if (freshData) setProjects(freshData.map(p => ({ ...p, tracks: p.tracks || [] })));
        setProjId(newProj.id);
        targetProjId = newProj.id;
        setView('project');
      }
      const { data: newTrack, error } = await supabase
        .from('tracks')
        .insert({
          project_id: targetProjId,
          user_id: session.user.id,
          data: { ...newTrackData(), ...t },
        })
        .select()
        .single();
      if (error) { alert('Failed to add track: ' + error.message); return; }
      setProjects(ps => ps.map(p => p.id !== targetProjId ? p : { ...p, tracks: [...p.tracks, newTrack] }));
    }
  };

  const handleBulkEdit = async (updates) => {
    const idsToUpdate = [...exportSel];
    const allTracks = projects.flatMap(p => p.tracks || []);
    const tracksToUpdate = allTracks.filter(t => exportSel.has(t.id));

    await Promise.all(tracksToUpdate.map(t =>
      supabase.from('tracks').update({ data: { ...t.data, ...updates } }).eq('id', t.id)
    ));

    // Update local state across ALL projects (selection may span them)
    setProjects(ps => ps.map(p => ({
      ...p,
      tracks: (p.tracks || []).map(t => idsToUpdate.includes(t.id) ? { ...t, data: { ...t.data, ...updates } } : t)
    })));

    setExportSel(new Set());
  };

  const handleAudioDelete = async () => {
    if (!trackData.audioPath) return;
    await supabase.storage.from('audio').remove([trackData.audioPath]);
    setTrackData(d => ({ ...d, audioUrl: '', audioPath: '' }));
  };

  // ── Stems pack upload (zip) ────────────────────────────────────────────────
  const handleStemsUpload = async (file) => {
    setStemsUploading(true);
    const path = `${session.user.id}/stems-${Date.now()}.zip`;
    const { error } = await supabase.storage.from('audio').upload(path, file, { upsert: false });
    if (error) { alert('Stems upload failed: ' + error.message); setStemsUploading(false); return; }
    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(path);
    setTrackData(d => ({ ...d, stemsUrl: urlData.publicUrl, stemsPath: path }));
    setStemsUploading(false);
  };

  const handleStemsDelete = async () => {
    if (!trackData.stemsPath) return;
    await supabase.storage.from('audio').remove([trackData.stemsPath]);
    setTrackData(d => ({ ...d, stemsUrl: '', stemsPath: '' }));
  };

  const saveTrack = async () => {
    if(trackId){
      await supabase.from('tracks').update({data:trackData}).eq('id',trackId);
      setProjects(ps=>ps.map(p=>p.id!==projId?p:{...p,tracks:p.tracks.map(t=>t.id===trackId?{...t,data:trackData}:t)}));
    } else {
      const {data} = await supabase.from('tracks').insert({project_id:projId,user_id:session.user.id,data:trackData}).select().single();
      if(data)setProjects(ps=>ps.map(p=>p.id!==projId?p:{...p,tracks:[...p.tracks,data]}));
    }
    setView('project'); setSec(0);
  };

  const openTrack = t => {
    setTrackData({ ...newTrackData(), ...(t.data || t) });
    setTrackId(t.id||null);
    setParentTrackId(t.parent_track_id||null);
    setVersionLabel(t.version_label||null);
    setSec(0);
    setView('track');
  };
  const addTrack = () => {
    setTrackData(newTrackData());
    setTrackId(null);
    setParentTrackId(null);
    setVersionLabel(null);
    setSec(0);
    setView('track');
  };
  const createVersion = async () => {
    const label = window.prompt('Version label (e.g. "Instrumental", "30s Edit", "TV Mix", "Stems"):');
    if (!label || !label.trim()) return;
    // If we're already viewing a version, new version becomes a sibling under the same parent
    // (versions are flat siblings, not nested trees).
    const ultimateParentId = parentTrackId || trackId;
    const { data, error } = await supabase
      .from('tracks')
      .insert({
        project_id: projId,
        user_id: session.user.id,
        data: trackData,
        parent_track_id: ultimateParentId,
        version_label: label.trim(),
      })
      .select()
      .single();
    if (error) { alert('Failed to create version: ' + error.message); return; }
    if (data) {
      setProjects(ps => ps.map(p => p.id !== projId ? p : { ...p, tracks: [...p.tracks, data] }));
      openTrack(data); // Jump to the new version for editing
    }
  };

  const delTrack = async tid => {
    if(!window.confirm('Delete this track?'))return;
    // delete audio from storage if it exists
    const track = proj?.tracks.find(t=>t.id===tid);
    if(track?.data?.audioPath) {
      await supabase.storage.from('audio').remove([track.data.audioPath]);
    }
    await supabase.from('tracks').delete().eq('id',tid);
    setProjects(ps=>ps.map(p=>p.id!==projId?p:{...p,tracks:p.tracks.filter(t=>t.id!==tid)}));
    setExportSel(s=>{const n=new Set(s);n.delete(tid);return n;});
  };

  const delProject = async pid => {
    if(!window.confirm('Delete this project and all its tracks?'))return;
    await supabase.from('projects').delete().eq('id',pid);
    setProjects(ps=>ps.filter(p=>p.id!==pid));
  };

  const addProject = async () => {
    if(!draft.name.trim())return;
    const {data} = await supabase.from('projects').insert({name:draft.name.trim(),artist:draft.artist,type:draft.type,user_id:session.user.id}).select().single();
    if(data)setProjects(ps=>[{...data,tracks:[]},...ps]);
    setDraft({name:'',artist:'',type:'Album'}); setShowAddProj(false);
  };

  const togExport = tid => setExportSel(s=>{const n=new Set(s);n.has(tid)?n.delete(tid):n.add(tid);return n;});
  const doExport = ids => {
    const allTracks = projects.flatMap(p => p.tracks || []);
    const ts = allTracks.filter(t => ids.includes(t.id));
    if (ts.length) setPrintData({ tracks: ts, projectName: proj?.name || 'Selection' });
  };
const doShare = async (ids, playlistName) => {
  setShareLoading(true);
  const name = playlistName || proj.name;
  // rest stays the same

  const { data: pl, error } = await supabase
    .from('playlists')
    .insert({ user_id: session.user.id, name, track_ids: ids })
    .select()
    .single();

  if (error) { alert('Failed to create share link: ' + error.message); setShareLoading(false); return; }

  const { count } = await supabase
    .from('pitches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  const pitchNum = (count || 0) + 1;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const trackTitles = proj.tracks
    .filter(t => ids.includes(t.id))
    .map(t => t.data?.title || 'Untitled')
    .join(', ');

  await supabase.from('pitches').insert({
    user_id: session.user.id,
    track_title: trackTitles,
    supervisor_name: `${name} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    company: '',
    project_name: name,
    date_sent: new Date().toISOString().split('T')[0],
    method: 'Email',
    status: 'Sent',
    notes: '',
    playlist_token: pl.token,
    track_id: ids[0],
  });

  setShareLoading(false);
  const link = `${window.location.origin}/p/${pl.token}`;
  setShareLink(link);
};
  const signOut = () => {
    localStorage.removeItem('fsm_tab');
    localStorage.removeItem('fsm_view');
    localStorage.removeItem('fsm_projId');
    supabase.auth.signOut();
  };
  const reloadProjects = async () => {
    const {data} = await supabase.from('projects').select('*, tracks(*)').order('created_at',{ascending:false});
    if(data)setProjects(data.map(p=>({...p,tracks:p.tracks||[]})));
  };
if(showAccount) return <AccountSettings session={session} onBack={() => setShowAccount(false)} />;
if(showArtistProfile) return <ArtistProfile session={session} onBack={() => { sessionStorage.removeItem('fsm_show_artist_profile'); setShowArtistProfile(false); }} />;
  if(profileReady === false) return <ArtistProfile session={session} isOnboarding={true} onComplete={() => setProfileReady(true)} />;
  if(printData)return <PrintPreview tracks={printData.tracks} projectName={printData.projectName} onBack={() => setPrintData(null)} />;
  if(!loaded)return <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 w-full overflow-x-hidden">
      {showOnboarding && (
  <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4">
    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === onboardStep ? 'w-6 bg-brand-yellow' : 'w-2 bg-gray-700'}`} />
          ))}
        </div>
        <button onClick={() => dismissOnboarding(false)} className="text-gray-600 hover:text-gray-400 text-xl leading-none">×</button>
      </div>
      <div className="px-5 pb-2 min-h-[200px]">
        {onboardStep === 0 && (
          <>
            <div className="text-3xl mb-3">📁</div>
            <h2 className="text-lg font-bold text-white mb-2">Create a project first</h2>
            <p className="text-sm text-gray-400 leading-relaxed">A project is an album, EP, or collection of tracks. Start by creating one — your catalog lives inside projects.</p>
            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-3">
              <p className="text-xs text-gray-500">Go to <span className="text-gray-300 font-medium">Projects</span> → tap <span className="text-gray-300 font-medium">+ New Project</span></p>
            </div>
          </>
        )}
        {onboardStep === 1 && (
          <>
            <div className="text-3xl mb-3">🎵</div>
            <h2 className="text-lg font-bold text-white mb-2">Import your tracks</h2>
            <p className="text-sm text-gray-400 leading-relaxed">Inside your project, import a CSV or add tracks manually. FSM will auto-map your metadata fields — BPM, key, ISRC, mood tags, all of it.</p>
            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-3">
              <p className="text-xs text-gray-500">Open your project → tap <span className="text-gray-300 font-medium">Import</span> or <span className="text-gray-300 font-medium">+ Track</span></p>
            </div>
          </>
        )}
        {onboardStep === 2 && (
          <>
            <div className="text-3xl mb-3">⚡</div>
            <h2 className="text-lg font-bold text-white mb-2">Paste a brief, send a pitch</h2>
            <p className="text-sm text-gray-400 leading-relaxed">Once your catalog is in, come back to Briefs. Paste any sync brief and FSM matches your tracks, writes the pitch email, and generates a shareable listening link.</p>
            <div className="mt-4 bg-brand-yellow/10 border border-brand-yellow/25 rounded-xl p-3">
              <p className="text-xs text-brand-yellow">The whole thing takes about 2 minutes.</p>
            </div>
          </>
        )}
      </div>
      <div className="px-5 py-4 flex gap-2">
        {onboardStep < 2 ? (
          <button onClick={() => setOnboardStep(s => s + 1)} className="flex-1 bg-brand-yellow text-brand-navy font-semibold text-sm py-2.5 rounded-xl">Next →</button>
        ) : (
          <button onClick={() => dismissOnboarding(true)} className="flex-1 bg-brand-yellow text-brand-navy font-semibold text-sm py-2.5 rounded-xl">Go to Projects →</button>
        )}
      </div>
    </div>
  </div>
)}
{showImport && <ImportModal projects={projects} session={session} onClose={() => setShowImport(false)} onImported={reloadProjects} defaultProjId={projId} />}
{showFillImport && <ImportModal projects={projects} session={session} onClose={() => setShowFillImport(false)} onImported={reloadProjects} defaultProjId={projId} existingTracks={proj?.tracks || []} fillMode={true} />}
{showBulkEdit && <BulkEditModal count={exportSel.size} onClose={() => setShowBulkEdit(false)} onSave={handleBulkEdit} />}
{showSpotify && <SpotifyImportModal onClose={() => setShowSpotify(false)} onImport={handleSpotifyImport} />}{shareLink && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-100">Share Link Created</h2>
        <button onClick={() => setShareLink(null)} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
      </div>
      <p className="text-xs text-gray-400">Anyone with this link can view the playlist and metadata. No login required.</p>
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-brand-yellow/75 break-all">{shareLink}</div>
      <button onClick={e => {
  navigator.clipboard.writeText(shareLink).then(() => {
    const orig = e.target.textContent;
    e.target.textContent = 'Copied!';
    setTimeout(() => e.target.textContent = orig, 1500);
  });
}} className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
  Copy Link
</button>
    </div>
  </div>
)}
{sharePrompt && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-100">Name this playlist</h2>
        <button onClick={() => setSharePrompt(null)} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
      </div>
      <p className="text-xs text-gray-400">Give this playlist a name so you can identify it later in your Links tab.</p>
      <input
        type="text"
        autoFocus
        defaultValue={proj?.name}
        id="playlist-name-input"
        placeholder="e.g. Dark Cinematic Tracks — Netflix Pitch"
        className={inp}
      />
      <button
        onClick={() => {
          const name = document.getElementById('playlist-name-input').value.trim() || proj?.name;
          setSharePrompt(null);
          doShare(sharePrompt, name);
        }}
        className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        Generate Link
      </button>
    </div>
  </div>
)}
      {view === 'dashboard' && (
        <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
          <span className="text-sm font-bold text-white">FSM</span>
          <div className="flex items-center gap-2">
            {tab==='projects' && (
              <button onClick={() => { setShowNewChooser(true); setShowAddProj(false); }}
                className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                + New
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 w-10 h-10 rounded-lg text-sm flex items-center justify-center transition-colors">
                ☰
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-48 overflow-hidden">
                  {['home','projects','pitches','links'].map(t => (
                    <button key={t} onClick={() => { setTab(t); setShowMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-800 ${tab===t?'text-white bg-gray-800':'text-gray-300 hover:bg-gray-800'}`}>
                      {t==='home'?'Briefs':t==='projects'?'Projects':t==='pitches'?'Pitches':'Links'}
                    </button>
                  ))}
                   <button onClick={() => { sessionStorage.setItem('fsm_show_artist_profile', 'true'); setShowArtistProfile(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800">
                    Profile
                  </button>
                  <button onClick={() => { setShowAccount(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800">
                    Account Settings
                  </button>
                    
                  <button onClick={() => { signOut(); setShowMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view==='dashboard' && tab==='home' && <BriefBoard session={session} />}
      {view==='dashboard' && tab==='pitches' && <PitchManager session={session} />}
{view==='dashboard' && tab==='links' && <LinksManager session={session} />}
      {view==='dashboard' && tab==='projects' && (
        <div className="px-4 py-6 max-w-4xl mx-auto">
          {showNewChooser && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200">New Project</h3>
                <button onClick={() => setShowNewChooser(false)} className="text-gray-600 hover:text-gray-300 text-xl leading-none">×</button>
              </div>
              <p className="text-xs text-gray-500 mb-4">How would you like to add your project?</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowNewChooser(false); setShowAddProj(true); }}
                  className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-3 rounded-lg text-sm transition-colors text-left">
                  <span className="text-lg">✏️</span>
                  <div>
                    <div className="font-medium text-gray-100">Blank Project</div>
                    <div className="text-xs text-gray-500 mt-0.5">Start fresh and add tracks manually</div>
                  </div>
                </button>
                <button
                  onClick={() => { setShowNewChooser(false); setShowImport(true); }}
                  className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-3 rounded-lg text-sm transition-colors text-left">
                  <span className="text-lg">📁</span>
                  <div>
                    <div className="font-medium text-gray-100">Import from File</div>
                    <div className="text-xs text-gray-500 mt-0.5">Upload a CSV or Excel file</div>
                  </div>
                </button>
                <button
                  onClick={() => { setShowNewChooser(false); setShowSpotify(true); }}
                  className="flex items-center gap-3 bg-green-900 hover:bg-green-800 text-green-100 px-4 py-3 rounded-lg text-sm transition-colors text-left">
                  <span className="text-lg">🎵</span>
                  <div>
                    <div className="font-medium text-green-100">Import via Spotify URL</div>
                    <div className="text-xs text-green-400 mt-0.5">Paste a Spotify album or track link</div>
                  </div>
                </button>
              </div>
            </div>
          )}
          {showAddProj && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-5">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">New Project</h3>
              <div className="flex flex-col gap-3 mb-3">
                <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Project / Album name *" className={inp} />
                <input value={draft.artist} onChange={e=>setDraft(d=>({...d,artist:e.target.value}))} placeholder="Artist name" className={inp} />
                <select value={draft.type} onChange={e=>setDraft(d=>({...d,type:e.target.value}))} className={inp}>
                  {PROJECT_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addProject} className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1">Create Project</button>
                <button onClick={() => {setShowAddProj(false);setDraft({name:'',artist:'',type:'Album'});}} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2.5 rounded-lg text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}
          {projects.length===0 ? (
            <div className="text-center py-24 text-gray-600">
              <div className="text-5xl mb-4">🎵</div>
              <p className="text-base font-medium text-gray-500">No projects yet</p>
              <p className="text-sm mt-1">Tap + New to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {projects.map(p => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer active:bg-gray-800 transition-colors"
                  onClick={() => {setProjId(p.id);setSearch('');setView('project');}}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-gray-100 truncate">{p.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{[p.artist,p.type].filter(Boolean).join(' · ')} · {p.tracks.length} track{p.tracks.length!==1?'s':''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-600 text-sm">→</span>
                      <button onClick={e=>{e.stopPropagation();delProject(p.id);}} className="text-gray-700 hover:text-red-400 text-xl leading-none p-1 transition-colors">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==='project' && (
        <div className="px-4 py-5 max-w-4xl mx-auto">
          <button onClick={() => setView('dashboard')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-4 flex items-center gap-1">← Projects</button>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-3">
              <h1 className="text-xl font-bold text-white truncate">{proj?.name}</h1>
              <p className="text-gray-500 text-xs mt-0.5">{[proj?.artist,proj?.type].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => exportTracksToCsv(proj?.tracks || [], `${proj?.name || 'tracks'}.csv`)} disabled={!proj?.tracks?.length} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 px-3 py-2 rounded-lg text-xs transition-colors">Export All</button>
              {proj?.tracks?.length > 0 && <button onClick={() => setShowFillImport(true)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-xs transition-colors">Fill from imports</button>}
              <button onClick={addTrack} className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-3 py-2 rounded-lg text-xs font-semibold transition-colors">+ Track</button>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, artist, ISRC, key, mood..." className={`${inp} flex-1`} />
{exportSel.size>0 && (
  <div className="flex gap-2 flex-wrap">
    <button onClick={() => setExportSel(new Set())} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap">
      Clear ({exportSel.size})
    </button>
    <button onClick={() => setShowBulkEdit(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
      Edit ({exportSel.size})
    </button>
    <button onClick={() => doExport([...exportSel])} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
      PDF ({exportSel.size})
    </button>
    <button onClick={() => exportTracksToCsv(selectedTracks, `${proj?.name || 'tracks'}-selection.csv`)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
      CSV ({exportSel.size})
    </button>
<button onClick={() => setSharePrompt([...exportSel])} className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
  Share ({exportSel.size})
</button>
  </div>
)}
          </div>
          {proj?.tracks.length>1 && (
            <button onClick={() => {
              const currentIds = proj.tracks.map(t => t.id);
              const allCurrentSelected = currentIds.length > 0 && currentIds.every(id => exportSel.has(id));
              if (allCurrentSelected) {
                setExportSel(s => new Set([...s].filter(id => !currentIds.includes(id))));
              } else {
                setExportSel(s => new Set([...s, ...currentIds]));
              }
            }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 block">
              {proj?.tracks.length > 0 && proj.tracks.every(t => exportSel.has(t.id)) ? 'Deselect All in Project' : 'Select All in Project'}
            </button>
          )}
          {sortedTracks.length===0 ? (
            <div className="text-center py-16 text-gray-600">
              {proj?.tracks.length===0?<><div className="text-3xl mb-2">♪</div><p className="text-sm">No tracks yet — tap + Track</p></>:<p className="text-sm">No tracks match "{search}"</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedTracks.map(t => {
                const d=t.data||t;
                const isVersion = !!t.parent_track_id;
                const versionCount = (versionsByParent[t.id] || []).length;
                return (
                  <div key={t.id} className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${isVersion ? 'ml-6 border-l-2 border-l-purple-700/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={exportSel.has(t.id)} onChange={() => togExport(t.id)} className="w-5 h-5 accent-brand-yellow cursor-pointer flex-shrink-0" />
                      <div className="flex-1 min-w-0" onClick={() => openTrack(t)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {d.trackNum && <span className="text-xs text-gray-600">{d.trackNum}.</span>}
                          <span className="font-medium text-gray-100 truncate">{d.title||'Untitled Track'}</span>
                          {t.version_label && <span className="text-xs bg-brand-yellow/10 text-brand-yellow px-2 py-0.5 rounded-full">{t.version_label}</span>}
                          {versionCount > 0 && <span className="text-xs bg-brand-yellow/10 text-brand-yellow px-2 py-0.5 rounded-full">+{versionCount} version{versionCount===1?'':'s'}</span>}
                          {d.explicit && <span className="text-xs bg-gray-700 text-gray-400 px-1.5 rounded">E</span>}
                          {d.aiAssisted==='Yes' && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">AI</span>}
                          {d.audioUrl && <span className="text-xs bg-brand-yellow/10 text-brand-yellow/75 px-2 py-0.5 rounded-full">♪</span>}
                        </div>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {d.bpm && <span className="text-xs text-gray-500">{d.bpm} BPM</span>}
                          {d.key && <span className="text-xs text-gray-500">{d.key}</span>}
                          {d.genre && <span className="text-xs text-gray-500">{d.genre}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => doExport([t.id])} className="text-xs text-gray-500 hover:text-emerald-400 transition-colors py-1">PDF</button>
                        <button onClick={() => delTrack(t.id)} className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors py-1">×</button>
                      </div>
                    </div>
                    {/* ── inline player on track card if audio exists ── */}
                    {d.audioUrl && (
                      <div className="mt-3" onClick={e=>e.stopPropagation()}>
                        <AudioPlayer url={d.audioUrl} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view==='track' && trackData && (
        <div className="px-4 py-5 max-w-3xl mx-auto pb-24">
          <div className="flex items-center gap-2 mb-3 text-sm overflow-hidden">
            <button onClick={() => setView('dashboard')} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">Projects</button>
            <span className="text-gray-700 flex-shrink-0">›</span>
            <button onClick={() => {setView('project');setSec(0);}} className="text-gray-600 hover:text-gray-400 transition-colors truncate">{proj?.name}</button>
            <span className="text-gray-700 flex-shrink-0">›</span>
            <span className="text-gray-400 truncate">{trackData?.title||'New Track'}</span>
            {versionLabel && <span className="text-xs bg-brand-yellow/10 text-brand-yellow px-2 py-0.5 rounded-full flex-shrink-0">{versionLabel}</span>}
          </div>
          {trackId && (
            <div className="mb-4">
              <button onClick={createVersion} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                + Add alternate version
              </button>
            </div>
          )}
          <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {SECTIONS.map((s,i) => (
              <button key={i} onClick={() => setSec(i)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${sec===i?'bg-brand-yellow text-brand-navy':'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>{s}</button>
            ))}
          </div>
          <TrackForm
            trackData={trackData}
            sec={sec}
            sf={sf}
            tog={tog}
            updOwner={updOwner}
            addOwner={addOwner}
            rmOwner={rmOwner}
            pct={pct}
            saveTrack={saveTrack}
            setSec={setSec}
            onAudioUpload={handleAudioUpload}
            onAudioDelete={handleAudioDelete}
            audioUploading={audioUploading}
            audioAnalyzing={audioAnalyzing}
            onStemsUpload={handleStemsUpload}
            onStemsDelete={handleStemsDelete}
            stemsUploading={stemsUploading}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 px-4 py-3 flex items-center justify-between gap-2">
            <button onClick={() => setSec(s=>Math.max(0,s-1))} disabled={sec===0}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors">← Prev</button>
            <div className="flex gap-2">
              <button onClick={saveTrack} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-2.5 rounded-lg text-sm transition-colors">Save</button>
              {sec<SECTIONS.length-1
                ?<button onClick={() => setSec(s=>s+1)} className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">Next →</button>
                :<button onClick={saveTrack} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">Save ✓</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}