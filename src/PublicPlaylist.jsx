import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

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
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 mt-3">
      <audio ref={audioRef} src={url} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={onEnded} />
      <button onClick={toggle} className="text-indigo-400 hover:text-indigo-300 flex-shrink-0 w-7 h-7 flex items-center justify-center text-base">
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer" onClick={seek}>
        <div className="h-1.5 bg-indigo-500 rounded-full transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">{fmt(progress)} / {fmt(duration)}</span>
    </div>
  );
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

export default function PublicPlaylist({ token }) {
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: pl, error: plErr } = await supabase
        .from('playlists')
        .select('*')
        .eq('token', token)
        .single();

      if (plErr || !pl) { setError('This link is invalid or has been removed.'); setLoading(false); return; }
      setPlaylist(pl);
await supabase.from('playlist_views').insert({
  playlist_id: pl.id,
  token: token,
  user_agent: navigator.userAgent
});
      if (!pl.track_ids || pl.track_ids.length === 0) { setTracks([]); setLoading(false); return; }

      const { data: trackData, error: trackErr } = await supabase
        .from('tracks')
        .select('id, data')
        .in('id', pl.track_ids);

      if (trackErr) { setError('Failed to load tracks.'); setLoading(false); return; }

      // preserve the order from track_ids
      const ordered = pl.track_ids
        .map(id => trackData.find(t => t.id === id))
        .filter(Boolean);

      setTracks(ordered);
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400 text-sm">
      Loading...
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-gray-400 gap-3">
      <div className="text-3xl">🔗</div>
      <p className="text-sm">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-5 py-4 sticky top-0 bg-gray-950 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">FSM</span>
            <h1 className="text-base font-bold text-white mt-0.5">{playlist.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-3">
        {tracks.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">No tracks in this playlist.</div>
        ) : tracks.map((t, i) => {
          const d = t.data || {};
          const isOpen = expanded === t.id;
          return (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Track header row */}
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

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-4 flex flex-col gap-4">
                  {/* Audio player */}
                 {d.audioUrl && (
  <div className="flex flex-col gap-2">
    <AudioPlayer url={d.audioUrl} />
<button
  onClick={async () => {
    const res = await fetch(d.audioUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (d.title || 'track') + '.mp3';
    a.click();
    URL.revokeObjectURL(url);
  }}
  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors text-left w-fit"
>
  Download MP3
</button>  </div>
)}
{/* Metadata grid */}
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
                    <MetaRow label="Time Signature" value={d.timeSig} />
                    <MetaRow label="Genre" value={d.genre} />
                    <MetaRow label="Sub-Genre" value={d.subGenre} />
                    <MetaRow label="Tempo Feel" value={d.tempoFeel} />
                    <MetaRow label="Duration" value={d.duration} />
                    <MetaRow label="Language" value={d.language} />
                    <MetaRow label="Vocals" value={d.hasVocals === 'Yes' ? (d.vocalType || 'Yes') : d.hasVocals} />
                    <MetaRow label="Explicit" value={d.explicit ? 'Yes' : null} />
                    <MetaRow label="AI Assisted" value={d.aiAssisted !== 'No' ? d.aiAssisted : null} />
                    <MetaRow label="File Format" value={d.fileFormat} />
                    <MetaRow label="Sample Rate" value={d.sampleRate} />
                    <MetaRow label="Bit Depth" value={d.bitDepth} />
                  </div>

                  {/* Moods */}
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

                  {/* Instruments */}
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

                  {/* Themes */}
                  {d.themes && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Themes</p>
                      <p className="text-xs text-gray-300">{d.themes}</p>
                    </div>
                  )}

                  {/* Contact */}
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

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-700">
        Powered by FSM · friedsodamusic.com
      </div>
    </div>
  );
}