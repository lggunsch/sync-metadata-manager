import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow w-full";

function extractSpotifyArtistId(url) {
  try {
    const match = url.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function daysSince(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function ArtistProfile({ session, onBack, isOnboarding = false, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    artist_name: "",
    location: "",
    bio: "",
    genre_tags_raw: "",
    spotify_artist_url: "",
    spotify_artist_id: "",
    spotify_last_synced: null,
    monthly_listeners: "",
    instagram_followers: "",
    tiktok_followers: "",
  });

  useEffect(() => {
    supabase
      .from("artist_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            artist_name: data.artist_name || "",
            location: data.location || "",
            bio: data.bio || "",
            genre_tags_raw: (data.genre_tags || []).join(", "),
            spotify_artist_url: data.spotify_artist_url || "",
            spotify_artist_id: data.spotify_artist_id || "",
            spotify_last_synced: data.spotify_last_synced || null,
            monthly_listeners: data.monthly_listeners != null ? String(data.monthly_listeners) : "",
            instagram_followers: data.instagram_followers != null ? String(data.instagram_followers) : "",
            tiktok_followers: data.tiktok_followers != null ? String(data.tiktok_followers) : "",
          });
        }
        setLoading(false);
      });
  }, [session.user.id]);

  const set = (field, value) => {
    setMsg(null);
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (field === "spotify_artist_url") {
        updated.spotify_artist_id = extractSpotifyArtistId(value) || "";
      }
      return updated;
    });
  };

  const parseFollowers = (val) => {
    const n = parseInt(val, 10);
    return isNaN(n) || n <= 0 ? null : n;
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);

    const genre_tags = form.genre_tags_raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      user_id: session.user.id,
      artist_name: form.artist_name.trim() || null,
      location: form.location.trim() || null,
      bio: form.bio.trim() || null,
      genre_tags,
      spotify_artist_url: form.spotify_artist_url.trim() || null,
      spotify_artist_id: form.spotify_artist_id || null,
      monthly_listeners: parseFollowers(form.monthly_listeners),
      instagram_followers: parseFollowers(form.instagram_followers),
      tiktok_followers: parseFollowers(form.tiktok_followers),
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("artist_profiles")
      .upsert(payload, { onConflict: "user_id" });

    setSaving(false);

    if (error) {
      setMsg({ type: "error", text: "Something went wrong. Please try again." });
      return;
    }

    if (isOnboarding && onComplete) {
      onComplete();
    } else {
      setMsg({ type: "success", text: "Profile saved." });
    }
  };

  const syncDays = daysSince(form.spotify_last_synced);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 bg-gray-950 z-40">
        {!isOnboarding && (
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back
          </button>
        )}
        <span className="text-sm font-semibold text-white">
          {isOnboarding ? "Set Up Your Artist Profile" : "Artist Profile (EPK)"}
        </span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {isOnboarding && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              This profile attaches to every pitch you send. Supervisors see your stats and bio before they hit play.
            </p>
            <p className="text-xs text-gray-500 mt-2">You can update this anytime from the menu.</p>
          </div>
        )}

        {/* Artist Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Artist Info</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Artist Name</label>
            <input
              type="text"
              value={form.artist_name}
              onChange={e => set("artist_name", e.target.value)}
              placeholder="Your artist or producer name"
              className={inp}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set("location", e.target.value)}
              placeholder="City, State"
              className={inp}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => set("bio", e.target.value)}
              placeholder="2–3 sentences. Keep it professional and specific."
              rows={3}
              className={inp}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Genre Tags</label>
            <input
              type="text"
              value={form.genre_tags_raw}
              onChange={e => set("genre_tags_raw", e.target.value)}
              placeholder="hip-hop, lo-fi, cinematic (comma-separated)"
              className={inp}
            />
          </div>
        </div>

        {/* Spotify */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Spotify</p>
            {form.spotify_artist_id && (
              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                Connected
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Artist URL</label>
            <input
              type="text"
              value={form.spotify_artist_url}
              onChange={e => set("spotify_artist_url", e.target.value)}
              placeholder="https://open.spotify.com/artist/..."
              className={inp}
            />
            {form.spotify_artist_url && !form.spotify_artist_id && (
              <p className="text-xs text-red-400 mt-1">Couldn't find an artist ID in that URL. Check the link.</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">Monthly Listeners</label>
              <span className="text-xs text-gray-600">from Spotify for Artists</span>
            </div>
            <input
              type="number"
              value={form.monthly_listeners}
              onChange={e => set("monthly_listeners", e.target.value)}
              placeholder="e.g. 11800"
              className={inp}
            />
            <p className="text-xs text-gray-600 mt-0.5">Update this monthly from your Spotify for Artists dashboard.</p>
          </div>
          {form.spotify_artist_id && syncDays !== null && (
            <p className="text-xs text-gray-600">
              Follower count updated {syncDays === 0 ? "today" : `${syncDays} day${syncDays === 1 ? "" : "s"} ago`}
            </p>
          )}
          {form.spotify_artist_id && syncDays === null && (
            <p className="text-xs text-gray-600">Follower count not yet synced — will update within 7 days.</p>
          )}
        </div>

        {/* Social */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Social</p>
          <p className="text-xs text-gray-600 -mt-2">Leave blank if not active on a platform. It will show as N/A on your pitch page.</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Instagram Followers</label>
            <input
              type="number"
              value={form.instagram_followers}
              onChange={e => set("instagram_followers", e.target.value)}
              placeholder="e.g. 2100"
              className={inp}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">TikTok Followers</label>
            <input
              type="number"
              value={form.tiktok_followers}
              onChange={e => set("tiktok_followers", e.target.value)}
              placeholder="e.g. 8400"
              className={inp}
            />
          </div>
        </div>

        {msg && (
          <p className={`text-xs ${msg.type === "error" ? "text-red-400" : "text-green-400"}`}>
            {msg.text}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {saving ? "Saving..." : isOnboarding ? "Complete Setup →" : "Save Profile"}
        </button>

      </div>
    </div>
  );
}