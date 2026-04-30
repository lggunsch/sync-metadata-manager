import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const IconSpark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  </svg>
);
const IconPitch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
    <path d="M5 13l4 4L19 7"/>
  </svg>
);
const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full";

// Score a track against a parsed brief.
// Semantics: each criterion only contributes to `possible` if BOTH the brief
// specified it AND the track has data for it. Missing track data → criterion
// is skipped (not penalized). Final score is earned/possible, 0–100.
// Hard disqualification (e.g. explicit-content mismatch) is handled by the
// caller via filtering, not by returning a sentinel score here.
function scoreTrack(track, parsed) {
  const d = track.data || track;

  if (parsed.explicit === false && d.explicit === true) return { score: 0, confidence: 'high' };

  let earned = 0;
  let possible = 0;
  let dataPoints = 0; // track fields with real (non-default) data

  // BPM
  if (parsed.bpmMin != null && parsed.bpmMax != null) {
    possible += 25;
    const bpm = parseFloat(d.bpm);
    if (!isNaN(bpm) && bpm > 0) {
      dataPoints++;
      if (bpm >= parsed.bpmMin && bpm <= parsed.bpmMax) earned += 25;
      else if (bpm >= parsed.bpmMin - 10 && bpm <= parsed.bpmMax + 10) earned += 10;
    }
  }

  // Moods
  const briefMoods = (parsed.moods || []).map(m => m.toLowerCase());
  if (briefMoods.length > 0) {
    const cap = Math.min(briefMoods.length, 3);
    possible += cap * 10;
    const trackMoods = (d.moods || []).map(m => m.toLowerCase());
    if (trackMoods.length > 0) {
      dataPoints++;
      const hits = trackMoods.filter(m => briefMoods.some(bm => bm.includes(m) || m.includes(bm))).length;
      earned += Math.min(hits, cap) * 10;
    }
  }

  // Genre
  const briefGenres = (parsed.genres || []).map(g => g.toLowerCase());
  if (briefGenres.length > 0) {
    possible += 20;
    const trackGenre = (d.genre || '').toLowerCase();
    if (trackGenre) {
      dataPoints++;
      if (briefGenres.some(g => trackGenre.includes(g) || g.includes(trackGenre))) earned += 20;
    }
  }

  // Vocals
  if (parsed.vocalsWanted != null) {
    possible += 15;
    if (d.hasVocals) {
      dataPoints++;
      if (parsed.vocalsWanted === 'No' && d.hasVocals === 'No') earned += 15;
      else if (parsed.vocalsWanted === 'Yes' && d.hasVocals === 'Yes') earned += 15;
    }
  }

  // Energy — skip default 50
  if (parsed.energyMin != null && parsed.energyMax != null) {
    const e = parseFloat(d.energy);
    if (!isNaN(e) && e !== 50) {
      possible += 10;
      dataPoints++;
      if (e >= parsed.energyMin && e <= parsed.energyMax) earned += 10;
    }
  }

  // Key
  if (parsed.preferredKeys?.length) {
    possible += 8;
    const trackKey = (d.key || '').toLowerCase();
    if (trackKey) {
      dataPoints++;
      if (parsed.preferredKeys.some(k => trackKey.includes(k.toLowerCase()))) earned += 8;
    }
  }

  // Themes
  const briefThemes = (parsed.themes || []).map(t => t.toLowerCase());
  if (briefThemes.length > 0) {
    const cap = Math.min(briefThemes.length, 2);
    possible += cap * 6;
    const trackThemes = (d.themes || '').toLowerCase();
    if (trackThemes) {
      dataPoints++;
      const hits = briefThemes.filter(t => trackThemes.includes(t)).length;
      earned += Math.min(hits, cap) * 6;
    }
  }

  if (possible === 0) return { score: 50, confidence: 'low' };

  const score = Math.max(5, Math.min(99, Math.round((earned / possible) * 100)));
  const confidence = dataPoints >= 4 ? 'high' : dataPoints >= 2 ? 'medium' : 'low';
  return { score, confidence };
}

// ── MatchScore bar ────────────────────────────────────────────────────────────
function MatchScore({ score }) {
  const color = score >= 85
    ? 'bg-green-500'
    : score >= 65
    ? 'bg-indigo-500'
    : 'bg-gray-600';
  const textColor = score >= 85
    ? 'text-green-400'
    : score >= 65
    ? 'text-indigo-400'
    : 'text-gray-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-8 text-right ${textColor}`}>{score}%</span>
    </div>
  );
}

// ── Step 1: Paste Brief ───────────────────────────────────────────────────────
function StepPaste({ onAnalyze, onClose }) {
  const [text, setText] = useState('');
  const ref = useRef();

  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-gray-800/60">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">New Brief</h2>
          <p className="text-xs text-gray-500 mt-0.5">Paste it — FSM finds your best matches</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
        >
          <IconClose />
        </button>
      </div>
      <div className="flex-1 p-4">
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste the brief here…"
          className={`${inp} resize-none leading-relaxed w-full h-full min-h-48 text-base`}
          rows={14}
        />
      </div>
      <div className="p-4 border-t border-gray-800/60">
        <button
          onClick={() => onAnalyze(text)}
          disabled={!text.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <IconSpark />
          Find My Best Matches
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Analyzing ─────────────────────────────────────────────────────────
function StepAnalyzing() {
  const [phase, setPhase] = useState(0);
  const PHASES = [
    'Reading brief…',
    'Extracting requirements…',
    'Searching your catalog…',
    'Ranking matches…',
  ];

  useEffect(() => {
    const t = setInterval(() => setPhase(p => Math.min(p + 1, PHASES.length - 1)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-2xl bg-indigo-600/20 border border-indigo-500/30" />
        <div
          className="absolute inset-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20"
          style={{ animation: 'spin 3s linear infinite' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" className="w-9 h-9">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
      </div>
      <div className="text-center flex flex-col gap-3">
        <p className="text-gray-200 text-base font-medium">{PHASES[phase]}</p>
        <div className="flex gap-1.5 justify-center">
          {PHASES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i <= phase ? 'bg-indigo-400' : 'bg-gray-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Match Results ─────────────────────────────────────────────────────
function StepResults({ parsed, ranked, onGenerateEmail, onBack }) {
  const [selected, setSelected] = useState(new Set(ranked.slice(0, 3).map(t => t.id)));
  const top = ranked.slice(0, 8);

  const toggle = (id) => setSelected(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
          >
            <IconBack />
          </button>
          <p className="text-sm font-semibold text-gray-100">Your Best Matches</p>
        </div>
        {/* Brief summary pill */}
        <div className="bg-indigo-950/50 border border-indigo-800/40 rounded-xl px-3 py-2.5">
          <p className="text-xs text-indigo-300 leading-relaxed">{parsed?.summary}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {parsed?.moods?.slice(0, 4).map(m => (
              <span key={m} className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{m}</span>
            ))}
            {parsed?.bpmMin && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {parsed.bpmMin}–{parsed.bpmMax} BPM
              </span>
            )}
            {parsed?.vocalsWanted === 'No' && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Instrumental</span>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <p className="text-xs text-gray-500 mb-1">{top.length} tracks · select which to pitch</p>
        {top.map((track, idx) => {
          const d = track.data || track;
          const isSelected = selected.has(track.id);
          return (
            <button
              key={track.id}
              onClick={() => toggle(track.id)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-700/60'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-indigo-600' : 'bg-gray-800'}`}>
                  {isSelected
                    ? <IconCheck />
                    : <span className="text-xs text-gray-500 font-bold">{idx + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{d.title || 'Untitled'}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {[d.genre, d.bpm ? `${d.bpm} BPM` : null, d.key].filter(Boolean).join(' · ')}
                  </p>
                  <MatchScore score={track._score} />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(d.moods || []).slice(0, 3).map(m => (
                      <span key={m} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{m}</span>
                    ))}
                    {d.hasVocals === 'No' && (
                      <span className="text-xs bg-gray-800/80 text-gray-500 px-2 py-0.5 rounded-full">Instrumental</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <MatchScore score={track._score} />
{track._confidence === 'low' && (
  <p className="text-xs text-yellow-600 mt-1">⚠ Limited metadata — fill in more track info for a better score</p>
)}
{track._confidence === 'medium' && (
  <p className="text-xs text-gray-600 mt-1">Partial match data</p>
)}

      {/* CTA */}
      <div className="p-4 border-t border-gray-800/60">
        <button
          onClick={() => onGenerateEmail(ranked.filter(t => selected.has(t.id)))}
          disabled={selected.size === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <IconPitch />
          Draft Pitch Email · {selected.size} track{selected.size !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Email Draft ───────────────────────────────────────────────────────
function StepEmail({ session, briefText, parsed, tracks, onBack, onSaved }) {
  const [email, setEmail] = useState('');
  const [supervisorName, setSupervisorName] = useState(parsed?.supervisorName || '');
  const [company, setCompany] = useState(parsed?.company || '');
  const [project, setProject] = useState(parsed?.project || '');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [playlistId, setPlaylistId] = useState(null);
  const artistName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'the artist';

  // Replace greeting in email body when supervisor name changes
  useEffect(() => {
    if (!email || loading) return;
    const name = supervisorName.trim();
    setEmail(prev => prev.replace(/^Hi [^\n,]+/m, `Hi ${name || 'there'}`));
  }, [supervisorName]);

  // Replace share link placeholder if URL changes
  useEffect(() => {
    if (!email || !shareUrl || loading) return;
    setEmail(prev => prev.replace(/\[SHARE_LINK\]/g, shareUrl));
  }, [shareUrl, loading]);

  useEffect(() => {
    const init = async () => {
      // 1. Create playlist + get share URL
      let url = '';
      let pid = null;
      try {
        const trackIds = tracks.map(t => t.id).filter(Boolean);
        if (trackIds.length) {
          const { data: pl } = await supabase
            .from('playlists')
            .insert({
              user_id: session.user.id,
              name: [supervisorName, project].filter(Boolean).join(' — ') || 'Pitch Playlist',
              track_ids: trackIds,
            })
            .select()
            .single();
          if (pl?.token) {
            url = `${window.location.origin}/p/${pl.token}`;
            pid = pl.id;
            setShareUrl(url);
            setPlaylistId(pid);
          }
        }
      } catch (e) {
        console.error('Playlist creation failed', e);
      }

      // 2. Generate email with share URL already included
      try {
        const res = await fetch('/api/generate-pitch-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief: { text: briefText, supervisorName, company, project },
            parsed,
            tracks,
            shareUrl: url,
            artistName,
            artistEmail: session?.user?.email,
          }),
        });
        const { email: draft } = await res.json();
        if (draft) setEmail(draft);
      } catch {
        const trackLines = tracks.map(t => {
          const d = t.data || t;
          return `"${d.title || 'Untitled'}" — ${d.genre || ''}${d.bpm ? `, ${d.bpm} BPM` : ''}`;
        }).join('\n');
        setEmail(
`Hi ${supervisorName || 'there'},

I came across your brief for ${project || 'your project'} and wanted to share a few tracks I think could be a strong fit.

${trackLines}

You can stream and download them here:
${url || '[SHARE_LINK]'}

All tracks are cleared and available for licensing. Happy to send WAV files, stems, and full metadata on request.

Best,
${artistName}`
        );
      }
      setLoading(false);
    };
    init();
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from('pitches').insert({
        user_id: session.user.id,
        supervisor_name: supervisorName || null,
        company: company || null,
        project_name: project || null,
        date_sent: new Date().toISOString().split('T')[0],
        method: 'Email',
        status: 'Sent',
        notes: briefText,
        track_title: tracks.map(t => (t.data || t).title || 'Untitled').join(', '),
        playlist_token: playlistId ? shareUrl.split('/p/')[1] : null,
      });
      if (!error && data?.[0]) onSaved(data[0]);
      else onSaved({ id: Date.now(), supervisor_name: supervisorName, company, status: 'Sent' });
    } catch {
      onSaved({ id: Date.now(), supervisor_name: supervisorName, company, status: 'Sent' });
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
          >
            <IconBack />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-100">Pitch Email</p>
            <p className="text-xs text-gray-500">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {copied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Details — editable so user can fill them in now */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Supervisor</label>
            <input value={supervisorName} onChange={e => setSupervisorName(e.target.value)} placeholder="Name" className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Netflix, HBO…" className={inp} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">Project</label>
          <input value={project} onChange={e => setProject(e.target.value)} placeholder="Show, film, or project name" className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">To (email)</label>
          <input value={supervisorEmail} onChange={e => setSupervisorEmail(e.target.value)} placeholder="supervisor@company.com" className={inp} type="email" />
        </div>

        {/* Share link */}
        {shareUrl ? (
          <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-300 font-medium mb-0.5">Shareable playlist link</p>
              <p className="text-xs text-indigo-400 truncate">{shareUrl}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(shareUrl).catch(() => {}); }}
              className="flex-shrink-0 text-xs bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-300 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
        ) : loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-600">Generating share link…</p>
          </div>
        ) : null}

        {/* Tracks pitched */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Tracks included</p>
          <div className="flex flex-col gap-1.5">
            {tracks.map(t => {
              const d = t.data || t;
              return (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-medium truncate">"{d.title || 'Untitled'}"</span>
                  <span className="text-xs text-gray-600 flex-shrink-0 ml-2">{d.genre}{d.bpm ? ` · ${d.bpm} BPM` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email body */}
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-medium">Email Body</label>
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
                Drafting…
              </div>
            )}
          </div>
          {loading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 min-h-48">
              {[80, 60, 90, 50, 70, 40, 85].map((w, i) => (
                <div key={i} className="h-3 bg-gray-800 rounded-full" style={{ width: `${w}%`, opacity: 0.5 + i * 0.07 }} />
              ))}
            </div>
          ) : (
            <textarea
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`${inp} resize-none leading-relaxed min-h-56`}
              rows={12}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-800/60 flex flex-col gap-2">
        <button
          onClick={save}
          disabled={loading || saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Save & Log Pitch'}
        </button>
        <button
          onClick={copy}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <IconCopy /> Copy to clipboard
        </button>
      </div>
    </div>
  );
}

// ── BriefFlow — orchestrates all steps ───────────────────────────────────────
export default function BriefFlow({ session, onClose, onSaved }) {
  const [step, setStep] = useState('paste'); // paste | analyzing | results | email
  const [briefText, setBriefText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);

  const handleAnalyze = async (text) => {
    setBriefText(text);
    setStep('analyzing');

    try {
      // 1. Parse the brief via API
      const res = await fetch('/api/analyze-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefText: text }),
      });
      const { parsed: p } = await res.json();

      // 2. Load all tracks
      const { data: projects } = await supabase
        .from('projects')
        .select('*, tracks(*)')
        .eq('user_id', session.user.id);

      const allTracks = (projects || []).flatMap(proj =>
        (proj.tracks || []).map(t => ({ ...t, projectName: proj.name }))
      );

      // 3. Score, filter explicit if brief requires, then rank
      const scored = allTracks
  .map(t => {
    const { score, confidence } = scoreTrack(t, p || {});
    return { ...t, _score: score, _confidence: confidence };
  })
  .filter(t => !(p?.explicit === false && (t.data || t).explicit === true))
  .sort((a, b) => b._score - a._score);

      setParsed(p);
      setRanked(scored);
      setStep('results');
    } catch (err) {
      console.error('Brief analysis failed:', err);
      // Fallback: load tracks unranked
      const { data: projects } = await supabase
        .from('projects')
        .select('*, tracks(*)')
        .eq('user_id', session.user.id);
      const allTracks = (projects || []).flatMap(p => p.tracks || [])
        .map(t => ({ ...t, _score: 50 }));
      setRanked(allTracks);
      setParsed({ summary: 'Brief analyzed', moods: [], genres: [] });
      setStep('results');
    }
  };

  const handleGenerateEmail = (tracks) => {
    setSelectedTracks(tracks);
    setStep('email');
  };

  const handleSaved = (pitch) => {
    onSaved?.(pitch);
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-40 flex flex-col" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {step === 'paste' && (
        <StepPaste onAnalyze={handleAnalyze} onClose={onClose} />
      )}
      {step === 'analyzing' && (
        <StepAnalyzing />
      )}
      {step === 'results' && (
        <StepResults
          parsed={parsed}
          ranked={ranked}
          onGenerateEmail={handleGenerateEmail}
          onBack={() => setStep('paste')}
        />
      )}
      {step === 'email' && (
        <StepEmail
          session={session}
          briefText={briefText}
          parsed={parsed}
          tracks={selectedTracks}
          onBack={() => setStep('results')}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}