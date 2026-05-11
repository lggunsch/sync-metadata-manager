import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow w-full";

// ─── Palette ──────────────────────────────────────────────────────────────
export const COLOR_PALETTE = [
  { name: "Olive",    hex: "#6B7000" },
  { name: "Violet",   hex: "#6B35C7" },
  { name: "Teal",     hex: "#0E7490" },
  { name: "Crimson",  hex: "#9B1939" },
  { name: "Ember",    hex: "#9B4210" },
  { name: "Emerald",  hex: "#10B981" },
  { name: "Black",    hex: "#111111" },
  { name: "White",    hex: "#FFFFFF" },
];

export const DEFAULT_COLOR = "#0E7490";

// Returns #000000 or #FFFFFF — whichever is more readable on top of hex
export function getContrastColor(hex) {
  if (!hex || hex.length < 7) return "#FFFFFF";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#FFFFFF";
}

function extractSpotifyArtistId(url) {
  try {
    const match = url.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const STORAGE_KEY = "fsm_artist_profile_draft";

function daysSince(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── Color Picker ─────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-4">
      {COLOR_PALETTE.map(({ name, hex }) => {
        const selected = value === hex;
        const isWhite = hex === "#FFFFFF";
        return (
          <button
  key={hex}
  type="button"
  onClick={() => onChange(hex)}
  title={name}
  className="flex"
>
            <div
              className="w-9 h-9 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: hex,
                border: isWhite ? "1px solid #374151" : "2px solid transparent",
                boxShadow: selected
                  ? `0 0 0 2px #111827, 0 0 0 4px ${isWhite ? "#9CA3AF" : hex}`
                  : "none",
              }}
            />
          
          </button>
        );
      })}
    </div>
  );
}

// ─── Avatar Upload ─────────────────────────────────────────────────────────
function AvatarUpload({ userId, currentUrl, accent, onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Max size is 2 MB."); return; }
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError("Upload failed — check that the 'avatars' bucket exists in Supabase Storage.");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(urlData.publicUrl + `?t=${Date.now()}`);
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden border-2" style={{ borderColor: accent + "60" }}>
        {currentUrl
          ? <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-sm">?</div>
        }
      </div>
      <div className="flex flex-col gap-1.5">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="text-xs border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : currentUrl ? "Change photo" : "Upload photo"}
        </button>
        {currentUrl && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors text-left">
            Remove
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className="text-xs text-gray-600">JPG/PNG · max 2 MB</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function ArtistProfile({ session, onBack, isOnboarding = false, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    artist_name: "", location: "", bio: "", genre_tags_raw: "",
    spotify_artist_url: "", spotify_artist_id: "", spotify_last_synced: null,
    monthly_listeners: "", instagram_followers: "", tiktok_followers: "",
    brand_color: DEFAULT_COLOR, avatar_url: null,
  });

  useEffect(() => {
    const draft = sessionStorage.getItem(STORAGE_KEY);
    if (draft) { try { setForm(JSON.parse(draft)); } catch {} }
    supabase.from("artist_profiles").select("*").eq("user_id", session.user.id).single()
      .then(({ data }) => {
        if (data && data.onboarding_complete) {
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
            brand_color: data.brand_color || DEFAULT_COLOR,
            avatar_url: data.avatar_url || null,
          });
        }
        setLoading(false);
      });
  }, [session.user.id]);

  const set = (field, value) => {
    setMsg(null);
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === "spotify_artist_url") updated.spotify_artist_id = extractSpotifyArtistId(value) || "";
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const parseFollowers = (val) => { const n = parseInt(val, 10); return isNaN(n) || n <= 0 ? null : n; };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const genre_tags = form.genre_tags_raw.split(",").map((s) => s.trim()).filter(Boolean);
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
      brand_color: form.brand_color || DEFAULT_COLOR,
      avatar_url: form.avatar_url || null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("artist_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { setMsg({ type: "error", text: "Something went wrong. Please try again." }); return; }
    sessionStorage.removeItem(STORAGE_KEY);
    if (isOnboarding && onComplete) { onComplete(); }
    else { setMsg({ type: "success", text: "Profile saved." }); }
  };

  const syncDays = daysSince(form.spotify_last_synced);
  const accent = form.brand_color || DEFAULT_COLOR;
  const onAccent = getContrastColor(accent);

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 bg-gray-950 z-40">
        {!isOnboarding && (
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back</button>
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
            <input type="text" value={form.artist_name} onChange={(e) => set("artist_name", e.target.value)} placeholder="Your artist or producer name" className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Location</label>
            <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City, State" className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Bio</label>
            <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="2–3 sentences. Keep it professional and specific." rows={3} className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Genre Tags</label>
            <input type="text" value={form.genre_tags_raw} onChange={(e) => set("genre_tags_raw", e.target.value)} placeholder="hip-hop, lo-fi, cinematic (comma-separated)" className={inp} />
          </div>
        </div>

        {/* Brand Color */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Brand Color</p>
            <p className="text-xs text-gray-600 mt-1">Appears in your workspace and on shared pitch links.</p>
          </div>
          <ColorPicker value={accent} onChange={(hex) => set("brand_color", hex)} />
          <div className="rounded-lg px-3 py-2.5" style={{ background: accent }}>
            <span className="text-xs font-medium" style={{ color: onAccent }}>
              {COLOR_PALETTE.find((c) => c.hex === accent)?.name ?? accent} — preview
            </span>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Profile Photo</p>
            <p className="text-xs text-gray-600 mt-1">Optional. Shows on your public pitch page.</p>
          </div>
          <AvatarUpload userId={session.user.id} currentUrl={form.avatar_url} accent={accent} onChange={(url) => set("avatar_url", url)} />
        </div>

        {/* Spotify */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Spotify</p>
            {form.spotify_artist_id && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">Connected</span>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Artist URL</label>
            <input type="text" value={form.spotify_artist_url} onChange={(e) => set("spotify_artist_url", e.target.value)} placeholder="https://open.spotify.com/artist/..." className={inp} />
            {form.spotify_artist_url && !form.spotify_artist_id && (
              <p className="text-xs text-red-400 mt-1">Couldn't find an artist ID in that URL. Check the link.</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">Monthly Listeners</label>
              <span className="text-xs text-gray-600">from Spotify for Artists</span>
            </div>
            <input type="number" value={form.monthly_listeners} onChange={(e) => set("monthly_listeners", e.target.value)} placeholder="e.g. 11800" className={inp} />
            <p className="text-xs text-gray-600 mt-0.5">Update this monthly from your Spotify for Artists dashboard.</p>
          </div>
          {form.spotify_artist_id && syncDays !== null && (
            <p className="text-xs text-gray-600">Follower count updated {syncDays === 0 ? "today" : `${syncDays} day${syncDays === 1 ? "" : "s"} ago`}</p>
          )}
        </div>

        {/* Social */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Social</p>
          <p className="text-xs text-gray-600 -mt-2">Leave blank if not active on a platform.</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Instagram Followers</label>
            <input type="number" value={form.instagram_followers} onChange={(e) => set("instagram_followers", e.target.value)} placeholder="e.g. 2100" className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">TikTok Followers</label>
            <input type="number" value={form.tiktok_followers} onChange={(e) => set("tiktok_followers", e.target.value)} placeholder="e.g. 8400" className={inp} />
          </div>
        </div>

        {msg && <p className={`text-xs ${msg.type === "error" ? "text-red-400" : "text-green-400"}`}>{msg.text}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: accent, color: onAccent }}
        >
          {saving ? "Saving..." : isOnboarding ? "Complete Setup →" : "Save Profile"}
        </button>

      </div>
    </div>
  );
}