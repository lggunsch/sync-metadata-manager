// src/components/BulkEditModal.jsx
import { useState } from "react";

const MOODS = ['Dark','Uplifting','Melancholic','Intense','Calm','Dreamy','Aggressive','Romantic','Nostalgic','Mysterious','Triumphant','Tense','Playful','Epic','Intimate','Cinematic','Ethereal','Gritty','Anthemic','Hopeful'];
const INSTRUMENTS = ['Acoustic Guitar','Electric Guitar','Bass Guitar','Drums','Piano','Keys/Organ','Strings','Synth/Pad','Brass','Woodwinds','Choir','Full Orchestra','Electronic/808','Percussion','Violin','Cello','Trumpet','Saxophone','Flute','Banjo','Mandolin','Ukulele','Harp','Harmonica'];

const inpClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow w-full";

function FormInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className={inpClass} />
    </div>
  );
}

function TagPicker({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} onClick={() => onToggle(o)} type="button"
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(o) ? 'bg-brand-yellow border-brand-yellow/50 text-brand-navy' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function BulkEditModal({ count, onClose, onSave }) {
  const [updates, setUpdates] = useState({});

  const setField = (key, value) => setUpdates(u => ({ ...u, [key]: value }));

  const toggleArrayValue = (key, value) => {
    setUpdates(u => {
      const current = u[key] || [];
      const next = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
      return { ...u, [key]: next };
    });
  };

  const handleSave = () => {
    const clean = {};
    Object.keys(updates).forEach(k => {
      const v = updates[k];
      if (Array.isArray(v)) {
        if (v.length > 0) clean[k] = v;
      } else if (v !== undefined && v !== null && String(v).trim() !== '') {
        clean[k] = v;
      }
    });
    onSave(clean);
    onClose();
  };

  const dirtyCount = Object.keys(updates).filter(k => {
    const v = updates[k];
    return Array.isArray(v) ? v.length > 0 : (v && String(v).trim() !== '');
  }).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Edit {count} track{count === 1 ? '' : 's'}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xl">×</button>
        </div>
        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
          <p className="text-xs text-gray-500">Filled fields overwrite the corresponding field on every selected track. Leave a field empty to leave it unchanged.</p>

          <FormInput label="Genre" value={updates.genre || ''} onChange={v => setField('genre', v)} />
          <FormInput label="Sub-Genre" value={updates.subGenre || ''} onChange={v => setField('subGenre', v)} />
          <FormInput label="PRO" value={updates.pro || ''} onChange={v => setField('pro', v)} />
          <FormInput label="Publisher" value={updates.publisher || ''} onChange={v => setField('publisher', v)} />
          <FormInput label="Label" value={updates.label || ''} onChange={v => setField('label', v)} />
          <FormInput label="Master Owner" value={updates.masterOwner || ''} onChange={v => setField('masterOwner', v)} />
          <FormInput label="Copyright Year" value={updates.copyrightYear || ''} onChange={v => setField('copyrightYear', v)} />
          <FormInput label="Contact Name" value={updates.contactName || ''} onChange={v => setField('contactName', v)} />
          <FormInput label="Contact Email" value={updates.contactEmail || ''} onChange={v => setField('contactEmail', v)} />
          <FormInput label="Contact Phone" value={updates.contactPhone || ''} onChange={v => setField('contactPhone', v)} />

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2">
            <p className="text-xs text-gray-400 font-medium">Replace Moods</p>
            <p className="text-xs text-gray-600">Select moods to overwrite. Leave empty to keep existing unchanged.</p>
            <TagPicker options={MOODS} selected={updates.moods || []} onToggle={v => toggleArrayValue('moods', v)} />
          </div>

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2">
            <p className="text-xs text-gray-400 font-medium">Replace Instruments</p>
            <p className="text-xs text-gray-600">Select instruments to overwrite. Leave empty to keep existing unchanged.</p>
            <TagPicker options={INSTRUMENTS} selected={updates.instruments || []} onToggle={v => toggleArrayValue('instruments', v)} />
          </div>
        </div>
        <div className="p-4 border-t border-gray-800">
          <button onClick={handleSave} disabled={dirtyCount === 0}
            className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 disabled:cursor-not-allowed text-brand-navy w-full py-2.5 rounded-lg text-sm font-semibold transition-colors">
            Apply {dirtyCount} field{dirtyCount === 1 ? '' : 's'} to {count} track{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}