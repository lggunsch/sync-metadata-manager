import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { downloadMetadataPDF } from "./lib/pdfExport";
import { downloadMp3WithTags } from "./lib/id3";

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full";

const PROJECT_TYPES = ['Commercial', 'Film', 'TV', 'Game', 'Other'];

const MOODS = ['Dark','Uplifting','Melancholic','Intense','Calm','Dreamy','Aggressive','Romantic','Nostalgic','Mysterious','Triumphant','Tense','Playful','Epic','Intimate','Cinematic','Ethereal','Gritty','Anthemic','Hopeful'];

const newBriefData = () => ({
  title: '',
  genre: '',
  mood: '',
  bpm_min: '',
  bpm_max: '',
  project_type: '',
  deadline: '',
});

function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const ref = { current: null };

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  const fmt = s => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const seek = (e) => {
    if (!ref.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    ref.current.currentTime = pct * duration;
  };

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
      <audio
        ref={el => ref.current = el}
        src={url}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button onClick={toggle} className="text-indigo-400 hover:text-indigo-300 flex-shrink-0 w-7 h-7 flex items-center justify-center">
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer" onClick={seek}>
        <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{fmt(progress)} / {fmt(duration)}</span>
    </div>
  );
}

function PlaylistDetailView({ submission, onBack, isFavorited, onToggleFavorite }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: pl } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', submission.playlist_id)
        .single();

      if (!pl || !pl.track_ids?.length) { setLoading(false); return; }

      const { data: trackData } = await supabase
        .from('tracks')
        .select('id, data')
        .in('id', pl.track_ids);

      if (trackData) {
        const ordered = pl.track_ids.map(id => trackData.find(t => t.id === id)).filter(Boolean);
        setTracks(ordered);
      }
      setLoading(false);
    };
    load();
  }, [submission.playlist_id]);

  const MetaRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div className="flex gap-2 text-xs">
        <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
        <span className="text-gray-200 font-medium">{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 py-3 sticky top-0 bg-gray-950 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back</button>
          <span className="text-sm font-semibold text-white">{submission.playlist_name}</span>
        </div>
        <button
          onClick={onToggleFavorite}
          className={`text-xl transition-colors ${isFavorited ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          ★
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-16 text-gray-600 text-sm">Loading...</div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">No tracks in this playlist.</div>
        ) : tracks.map((t, i) => {
          const d = t.data || {};
          const isOpen = expanded === t.id;
          return (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : t.id)}
              >
                <span className="text-xs text-gray-600 w-5 flex-shrink-0 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100 truncate">{d.title || 'Untitled Track'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {[d.artist, d.featuring ? `feat. ${d.featuring}` : ''].filter(Boolean).join(' ')}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {d.bpm && <span className="text-xs text-gray-600 hidden sm:block">{d.bpm} BPM</span>}
                  {d.key && <span className="text-xs text-gray-600 hidden sm:block">{d.key}</span>}
                  {d.genre && <span className="text-xs text-gray-600 hidden sm:block">{d.genre}</span>}
                  {d.audioUrl && <span className="text-xs text-indigo-400">♪</span>}
                  <span className="text-gray-600 text-sm">{isOpen ? '↑' : '↓'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-4 flex flex-col gap-4">
                  {d.audioUrl && <AudioPlayer url={d.audioUrl} />}
                  <div className="flex gap-4 flex-wrap">
                    {d.audioUrl && (
                      <button
                        onClick={() => downloadMp3WithTags(d.audioUrl, d, (d.title || 'track') + '.mp3')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Download MP3
                      </button>
                    )}
                    <button
                      onClick={() => downloadMetadataPDF([t], submission.playlist_name)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Download PDF
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <MetaRow label="ISRC" value={d.isrc} />
                    <MetaRow label="ISWC" value={d.iswc} />
                    <MetaRow label="IPI" value={d.ipi} />
                    <MetaRow label="PRO" value={d.pro} />
                    <MetaRow label="Publisher" value={d.publisher} />
                    <MetaRow label="Label" value={d.label} />
                    <MetaRow label="Master Owner" value={d.masterOwner} />
                    <MetaRow label="Copyright Year" value={d.copyrightYear} />
                    <MetaRow label="BPM" value={d.bpm} />
                    <MetaRow label="Key" value={d.key} />
                    <MetaRow label="Genre" value={d.genre} />
                    <MetaRow label="Sub-Genre" value={d.subGenre} />
                    <MetaRow label="Duration" value={d.duration} />
                    <MetaRow label="Language" value={d.language} />
                    <MetaRow label="Vocals" value={d.hasVocals === 'Yes' ? (d.vocalType || 'Yes') : d.hasVocals} />
                    <MetaRow label="Explicit" value={d.explicit ? 'Yes' : null} />
                    <MetaRow label="AI Assisted" value={d.aiAssisted !== 'No' ? d.aiAssisted : null} />
                    <MetaRow label="File Format" value={d.fileFormat} />
                    <MetaRow label="Sample Rate" value={d.sampleRate} />
                    <MetaRow label="Bit Depth" value={d.bitDepth} />
                  </div>

                  {d.moods?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Moods</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.moods.map(m => (
                          <span key={m} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.instruments?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Instruments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.instruments.map(ins => (
                          <span key={ins} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">{ins}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.themes && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Themes</p>
                      <p className="text-xs text-gray-300">{d.themes}</p>
                    </div>
                  )}

                  {(d.contactName || d.contactEmail) && (
                    <div className="border-t border-gray-800 pt-3 flex flex-col gap-1">
                      <p className="text-xs text-gray-500 mb-1">Contact</p>
                      {d.contactName && <p className="text-xs text-gray-300">{d.contactName}</p>}
                      {d.contactEmail && (
                        <a href={`mailto:${d.contactEmail}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                          {d.contactEmail}
                        </a>
                      )}
                      {d.contactPhone && <p className="text-xs text-gray-400">{d.contactPhone}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BriefDetailView({ brief, onBack, session }) {
  const [submissions, setSubmissions] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: subs } = await supabase
        .from('brief_submissions')
        .select('*')
        .eq('brief_id', brief.id)
        .order('submitted_at', { ascending: false });
      if (subs) setSubmissions(subs);

      const { data: favs } = await supabase
        .from('brief_favorites')
        .select('submission_id')
        .eq('supervisor_id', session.user.id);
      if (favs) setFavorites(new Set(favs.map(f => f.submission_id)));

      setLoaded(true);
    };
    load();
  }, [brief.id, session.user.id]);

  const toggleFavorite = async (submissionId) => {
    const isFav = favorites.has(submissionId);
    if (isFav) {
      await supabase.from('brief_favorites')
        .delete()
        .eq('supervisor_id', session.user.id)
        .eq('submission_id', submissionId);
      setFavorites(f => { const n = new Set(f); n.delete(submissionId); return n; });
    } else {
      await supabase.from('brief_favorites')
        .insert({ supervisor_id: session.user.id, submission_id: submissionId });
      setFavorites(f => new Set([...f, submissionId]));
    }
  };

  if (viewing) {
    return (
      <PlaylistDetailView
        submission={viewing}
        onBack={() => setViewing(null)}
        isFavorited={favorites.has(viewing.id)}
        onToggleFavorite={() => toggleFavorite(viewing.id)}
      />
    );
  }

  const isExpired = brief.closed || (brief.deadline && new Date(brief.deadline) < new Date());
  const fmt = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const sorted = [...submissions].sort((a, b) => {
    const aFav = favorites.has(a.id) ? 0 : 1;
    const bFav = favorites.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 py-3 sticky top-0 bg-gray-950 z-40 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Briefs</button>
        <div className="flex-1">
          <span className="text-sm font-semibold text-white">{brief.title}</span>
          {isExpired && <span className="ml-2 text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{brief.closed ? 'Closed' : 'Expired'}</span>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 flex flex-wrap gap-3">
          {brief.genre && <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">{brief.genre}</span>}
          {brief.mood && <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">{brief.mood}</span>}
          {brief.project_type && <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">{brief.project_type}</span>}
          {(brief.bpm_min || brief.bpm_max) && (
            <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">
              {brief.bpm_min || '?'} – {brief.bpm_max || '?'} BPM
            </span>
          )}
          {brief.deadline && <span className="text-xs text-gray-500">Deadline: {fmt(brief.deadline)}</span>}
        </div>

        {!loaded ? (
          <div className="text-center py-16 text-gray-600 text-sm">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <div className="text-3xl mb-2">📬</div>
            <p className="text-sm">No submissions yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map(sub => (
              <div
                key={sub.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setViewing(sub)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100 text-sm truncate">{sub.playlist_name || 'Untitled Playlist'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmt(sub.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(sub.id); }}
                    className={`text-xl transition-colors ${favorites.has(sub.id) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                  >
                    ★
                  </button>
                  <span className="text-gray-600 text-sm">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupervisorApp({ session }) {
  const [tab, setTab] = useState('briefs');
  const [briefs, setBriefs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(newBriefData());
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favLoaded, setFavLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('briefs')
      .select('*')
      .eq('supervisor_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBriefs(data);
        setLoaded(true);
      });
  }, [session.user.id]);

  useEffect(() => {
    if (tab !== 'favorites') return;
    const load = async () => {
      const { data: favData } = await supabase
        .from('brief_favorites')
        .select('*, brief_submissions(*)')
        .eq('supervisor_id', session.user.id)
        .order('created_at', { ascending: false });
      if (favData) setFavorites(favData.map(f => f.brief_submissions).filter(Boolean));
      setFavLoaded(true);
    };
    load();
  }, [tab, session.user.id]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveBrief = async () => {
    if (!form.title.trim()) return alert('Please add a title for this brief.');
    setSaving(true);
    const payload = {
      supervisor_id: session.user.id,
      title: form.title.trim(),
      genre: form.genre || null,
      mood: form.mood || null,
      bpm_min: form.bpm_min ? parseInt(form.bpm_min) : null,
      bpm_max: form.bpm_max ? parseInt(form.bpm_max) : null,
      project_type: form.project_type || null,
      deadline: form.deadline || null,
    };
    const { data, error } = await supabase.from('briefs').insert(payload).select().single();
    setSaving(false);
    if (error) { alert('Failed to create brief: ' + error.message); return; }
    setBriefs(bs => [data, ...bs]);
    setForm(newBriefData());
    setShowCreate(false);
  };

  const deleteBrief = async (id) => {
    if (!window.confirm('Delete this brief? All submissions will be removed.')) return;
    await supabase.from('briefs').delete().eq('id', id);
    setBriefs(bs => bs.filter(b => b.id !== id));
  };

  const closeBrief = async (id) => {
    if (!window.confirm('Close this brief? It will be removed from the artist board but you can still view submissions.')) return;
    await supabase.from('briefs').update({ closed: true }).eq('id', id);
    setBriefs(bs => bs.map(b => b.id === id ? { ...b, closed: true } : b));
  };

  const signOut = () => supabase.auth.signOut();

  const fmt = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (viewing) {
    return <BriefDetailView brief={viewing} onBack={() => setViewing(null)} session={session} />;
  }

  const activeBriefs = briefs.filter(b => !b.closed && (!b.deadline || new Date(b.deadline) > new Date()));
  const inactiveBriefs = briefs.filter(b => b.closed || (b.deadline && new Date(b.deadline) <= new Date()));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">FSM</span>
          <div className="flex gap-1">
            {['briefs', 'favorites'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {t === 'briefs' ? 'My Briefs' : 'Favorites'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'briefs' && (
            <button onClick={() => setShowCreate(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
              + New Brief
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors">
              ⋯
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-36 overflow-hidden">
                <button onClick={() => { signOut(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create brief form */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-100">Create Brief</h2>
              <button onClick={() => { setShowCreate(false); setForm(newBriefData()); }} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
            </div>
            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Title *</label>
                <input value={form.title} onChange={e => sf('title', e.target.value)} placeholder="e.g. Thriller Series — Dark Ambient" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">Genre</label>
                  <input value={form.genre} onChange={e => sf('genre', e.target.value)} placeholder="e.g. Electronic" className={inp} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">Mood</label>
                  <select value={form.mood} onChange={e => sf('mood', e.target.value)} className={inp}>
                    <option value="">Select mood...</option>
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">BPM Min</label>
                  <input type="number" value={form.bpm_min} onChange={e => sf('bpm_min', e.target.value)} placeholder="e.g. 80" className={inp} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">BPM Max</label>
                  <input type="number" value={form.bpm_max} onChange={e => sf('bpm_max', e.target.value)} placeholder="e.g. 120" className={inp} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Project Type</label>
                <select value={form.project_type} onChange={e => sf('project_type', e.target.value)} className={inp}>
                  <option value="">Select type...</option>
                  {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Deadline</label>
                <input type="date" value={form.deadline} onChange={e => sf('deadline', e.target.value)} className={inp} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-800">
              <button onClick={saveBrief} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white w-full py-2.5 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Creating...' : 'Post Brief'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Briefs tab */}
      {tab === 'briefs' && (
        <div className="max-w-4xl mx-auto px-4 py-6">
          {!loaded ? (
            <div className="text-center py-16 text-gray-600 text-sm">Loading...</div>
          ) : briefs.length === 0 ? (
            <div className="text-center py-24 text-gray-600">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-base font-medium text-gray-500">No briefs yet</p>
              <p className="text-sm mt-1">Tap + New Brief to post your first one</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {activeBriefs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Active</p>
                  <div className="flex flex-col gap-2">
                    {activeBriefs.map(b => (
                      <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                        onClick={() => setViewing(b)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-100 truncate">{b.title}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {b.genre && <span className="text-xs text-gray-500">{b.genre}</span>}
                              {b.mood && <span className="text-xs text-gray-500">{b.mood}</span>}
                              {b.project_type && <span className="text-xs text-gray-500">{b.project_type}</span>}
                              {(b.bpm_min || b.bpm_max) && <span className="text-xs text-gray-500">{b.bpm_min || '?'}–{b.bpm_max || '?'} BPM</span>}
                              {b.deadline && <span className="text-xs text-gray-600">Due {fmt(b.deadline)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-gray-600 text-sm">→</span>
                            <button onClick={e => { e.stopPropagation(); closeBrief(b.id); }}
                              className="text-xs text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1">Close</button>
                            <button onClick={e => { e.stopPropagation(); deleteBrief(b.id); }}
                              className="text-gray-600 hover:text-red-400 text-xl leading-none transition-colors p-1">×</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inactiveBriefs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Closed / Expired</p>
                  <div className="flex flex-col gap-2">
                    {inactiveBriefs.map(b => (
                      <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setViewing(b)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-100 truncate">{b.title}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {b.genre && <span className="text-xs text-gray-500">{b.genre}</span>}
                              {b.project_type && <span className="text-xs text-gray-500">{b.project_type}</span>}
                              <span className="text-xs text-gray-600">{b.closed ? 'Closed' : `Expired ${fmt(b.deadline)}`}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-gray-600 text-sm">→</span>
                            <button onClick={e => { e.stopPropagation(); deleteBrief(b.id); }}
                              className="text-gray-600 hover:text-red-400 text-xl leading-none transition-colors p-1">×</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Favorites tab */}
      {tab === 'favorites' && (
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-white">Favorites</h1>
            <p className="text-gray-500 text-xs mt-0.5">Submissions you've starred</p>
          </div>
          {!favLoaded ? (
            <div className="text-center py-16 text-gray-600 text-sm">Loading...</div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <div className="text-3xl mb-2">★</div>
              <p className="text-sm">No favorites yet. Star submissions from your brief pages.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {favorites.map(sub => (
                <div key={sub.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setViewing(sub)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100 text-sm truncate">{sub.playlist_name || 'Untitled Playlist'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(sub.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-yellow-400 text-xl">★</span>
                    <span className="text-gray-600 text-sm">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}