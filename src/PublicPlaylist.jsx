import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import { downloadMp3WithTags } from "./lib/id3";

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
      <button onClick={toggle} className="text-brand-yellow/75 hover:text-brand-yellow flex-shrink-0 w-7 h-7 flex items-center justify-center text-base">
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer" onClick={seek}>
        <div className="h-1.5 bg-brand-yellow rounded-full transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
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

function fmtStat(n) {
  if (n == null) return '-';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function ArtistBlock({ profile }) {
  if (!profile) return null;

  const initials = (profile.artist_name || '')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const hasListeners = profile.monthly_listeners != null;
  const hasFollowers = profile.spotify_followers != null;
  const hasIG = profile.instagram_followers != null;
  const hasTikTok = profile.tiktok_followers != null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4 mb-2">

      {/* Artist header */}
      <div className="flex items-center gap-3">
        {profile.spotify_image_url ? (
          <img
            src={profile.spotify_image_url}
            alt={profile.artist_name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-400">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-base truncate">{profile.artist_name || 'Artist'}</p>
          {profile.location && (
            <p className="text-xs text-gray-500 mt-0.5">{profile.location}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-gray-400 leading-relaxed">{profile.bio}</p>
      )}

      {/* Genre tags */}
      {profile.genre_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.genre_tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      {(hasListeners || hasFollowers || hasIG || hasTikTok) && (
        <div className="grid grid-cols-3 gap-2">

          {/* Listeners / Followers */}
          <div className="bg-gray-800/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Listeners / Followers</p>
            <p className="text-base font-semibold text-gray-100 tabular-nums">
              {fmtStat(profile.monthly_listeners)} / {fmtStat(profile.spotify_followers)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-600">Spotify</span>
              {hasFollowers && (
                <span className="text-xs text-green-500 bg-green-900/20 px-1.5 py-px rounded-full leading-none">live</span>
              )}
            </div>
          </div>

          {/* Instagram */}
          <div className="bg-gray-800/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Instagram</p>
            <p className={`text-base font-semibold tabular-nums ${hasIG ? 'text-gray-100' : 'text-gray-600'}`}>
              {fmtStat(profile.instagram_followers)}
            </p>
            <p className="text-xs text-gray-600 mt-1">followers</p>
          </div>

          {/* TikTok */}
          <div className="bg-gray-800/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">TikTok</p>
            <p className={`text-base font-semibold tabular-nums ${hasTikTok ? 'text-gray-100' : 'text-gray-600'}`}>
              {fmtStat(profile.tiktok_followers)}
            </p>
            <p className="text-xs text-gray-600 mt-1">followers</p>
          </div>

        </div>
      )}

    </div>
  );
}

const downloadMetadataPDF = (tracks, playlistName) => {
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
};

export default function PublicPlaylist({ token }) {
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: result, error: rpcErr } = await supabase.rpc('get_public_playlist', {
        p_token: token,
        p_user_agent: navigator.userAgent
      });

      if (rpcErr || !result) {
        setError('This link is invalid or has been removed.');
        setLoading(false);
        return;
      }

      setPlaylist(result.playlist);
      setTracks(result.tracks || []);

      if (result.playlist?.user_id) {
        const { data: prof } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('user_id', result.playlist.user_id)
          .eq('onboarding_complete', true)
          .single();
        if (prof) setProfile(prof);
      }

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
          <button
            onClick={() => downloadMetadataPDF(tracks, playlist.name)}
            className="text-xs text-brand-yellow/75 hover:text-brand-yellow border border-brand-yellow/15 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
          >
            Download Metadata
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-3">

        {/* Artist EPK block */}
        <ArtistBlock profile={profile} />

        {/* Track list */}
        {tracks.length === 0 ? (
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
                  {d.audioUrl && <span className="text-xs text-brand-yellow/75">♪</span>}
                  <span className="text-gray-600 text-sm">{isOpen ? '↑' : '↓'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-4 flex flex-col gap-4">
                  {d.audioUrl && (
                    <div className="flex flex-col gap-2">
                      <AudioPlayer url={d.audioUrl} />
                      <button
                        onClick={() => downloadMp3WithTags(d.audioUrl, d, (d.title || 'track') + '.mp3')}
                        className="text-xs text-brand-yellow/75 hover:text-brand-yellow transition-colors text-left w-fit"
                      >
                        Download MP3
                      </button>
                    </div>
                  )}
                  {d.stemsUrl && (
                    <button
                      onClick={async () => {
                        const res = await fetch(d.stemsUrl);
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = (d.title || 'track') + '-stems.zip';
                        link.click();
                        URL.revokeObjectURL(blobUrl);
                      }}
                      className="text-xs text-brand-yellow/75 hover:text-brand-yellow transition-colors text-left w-fit"
                    >
                      📦 Download Stems
                    </button>
                  )}
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
                        <a href={`mailto:${d.contactEmail}`} className="text-xs text-brand-yellow/75 hover:text-brand-yellow">
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