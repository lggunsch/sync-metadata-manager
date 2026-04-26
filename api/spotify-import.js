// api/spotify-import.js
// Looks up Spotify track or album metadata and returns it in FSM format.
// Uses client credentials flow (no user OAuth).

let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Spotify auth failed: ${errText}`);
  }
  const { access_token, expires_in } = await res.json();
  cachedToken = access_token;
  tokenExpiresAt = Date.now() + expires_in * 1000;
  return access_token;
}

function parseSpotifyUrl(url) {
  // Matches:
  //   https://open.spotify.com/track/[id]
  //   https://open.spotify.com/album/[id]
  //   spotify:track:[id]
  //   spotify:album:[id]
  // Strips any query string (e.g. ?si=...)
  const match = url.match(/(?:open\.spotify\.com\/|spotify:)(track|album)[/:]([a-zA-Z0-9]+)/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

function fmtDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mapSpotifyTrack(track, album) {
  const albumData = album || track.album;
  const releaseDate = albumData?.release_date || '';
  const year = releaseDate ? releaseDate.slice(0, 4) : '';

  const lead = track.artists?.[0]?.name || '';
  const featuring = track.artists?.slice(1).map(a => a.name).join(', ') || '';

  return {
    title: track.name || '',
    artist: lead,
    featuring,
    albumArtist: albumData?.artists?.[0]?.name || lead,
    trackNum: String(track.track_number || ''),
    duration: fmtDuration(track.duration_ms || 0),
    isrc: track.external_ids?.isrc || '',
    upc: albumData?.external_ids?.upc || '',
    releaseDate,
    copyrightYear: year,
    explicit: !!track.explicit,
    genre: albumData?.genres?.[0] || '',
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL required' });

  const parsed = parseSpotifyUrl(url);
  if (!parsed) return res.status(400).json({ error: 'Invalid Spotify URL. Paste a track or album link.' });

  try {
    const token = await getSpotifyToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    if (parsed.type === 'track') {
      const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${parsed.id}`, { headers });
      if (trackRes.status === 404) return res.status(404).json({ error: 'Track not found.' });
      if (!trackRes.ok) {
        const t = await trackRes.text();
        return res.status(500).json({ error: `Spotify API error: ${t}` });
      }
      const track = await trackRes.json();

      return res.status(200).json({
        type: 'track',
        tracks: [mapSpotifyTrack(track)],
      });
    }

    if (parsed.type === 'album') {
      const albumRes = await fetch(`https://api.spotify.com/v1/albums/${parsed.id}`, { headers });
      if (albumRes.status === 404) return res.status(404).json({ error: 'Album not found.' });
      if (!albumRes.ok) {
        const t = await albumRes.text();
        return res.status(500).json({ error: `Spotify API error: ${t}` });
      }
      const album = await albumRes.json();

      // Album's track items don't include ISRC. Spotify restricted the batch
      // /tracks?ids endpoint in late-2024 API changes — using single-track
      // endpoint in parallel instead (still has wider access).
      const trackIds = album.tracks.items.map(t => t.id).filter(Boolean);
      if (!trackIds.length) {
        return res.status(200).json({
          type: 'album',
          albumName: album.name,
          albumArtist: album.artists?.[0]?.name || '',
          tracks: [],
        });
      }

      const trackResults = await Promise.all(trackIds.map(async (id) => {
        const r = await fetch(`https://api.spotify.com/v1/tracks/${id}`, { headers });
        if (!r.ok) return null;
        return r.json();
      }));
      const tracks = trackResults.filter(Boolean);

      return res.status(200).json({
        type: 'album',
        albumName: album.name,
        albumArtist: album.artists?.[0]?.name || '',
        tracks: tracks.map(t => mapSpotifyTrack(t, album)),
      });
    }

    return res.status(400).json({ error: 'Unknown URL type.' });
  } catch (err) {
    console.error('Spotify import error:', err);
    return res.status(500).json({ error: err.message || 'Import failed.' });
  }
};