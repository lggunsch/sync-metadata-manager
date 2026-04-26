// src/components/SpotifyImportModal.jsx
import { useState } from "react";

const inpClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full";

export default function SpotifyImportModal({ onClose, onImport }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spotify-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed.');
        setLoading(false);
        return;
      }
      await onImport(data);
      onClose();
    } catch (err) {
      setError('Network error. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Import from Spotify</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-600 hover:text-gray-300 text-xl disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-500">Paste a Spotify track or album URL. Album URLs create a new project with all tracks.</p>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            className={inpClass}
            disabled={loading}
            onKeyDown={e => { if (e.key === 'Enter' && !loading && url.trim()) handleImport(); }}
            autoFocus
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-800 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !url.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}