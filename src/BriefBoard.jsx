import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import BriefFlow from './components/BriefFlow';

const STATUS_COLORS = {
  'Sent': 'bg-blue-900/50 text-blue-400',
  'Viewed': 'bg-purple-900/50 text-purple-400',
  'In Consideration': 'bg-yellow-900/50 text-yellow-400',
  'Passed': 'bg-red-900/50 text-red-400',
  'Licensed': 'bg-green-900/50 text-green-400',
  'No Response': 'bg-gray-800 text-gray-500',
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-50">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

export default function BriefBoard({ session }) {
  const [showFlow, setShowFlow] = useState(false);
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);

  const initials = session?.user?.email?.slice(0, 2).toUpperCase() || 'ME';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('pitches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setPitches(data);
      setLoading(false);
    };
    load();
  }, []);

  const statusCounts = {
    active: pitches.filter(p => ['Sent', 'Viewed', 'In Consideration'].includes(p.status)).length,
    consideration: pitches.filter(p => p.status === 'In Consideration').length,
    licensed: pitches.filter(p => p.status === 'Licensed').length,
  };

  const handlePitchSaved = (newPitch) => {
    setPitches(prev => [newPitch, ...prev]);
    setShowFlow(false);
  };

  const deletePitch = async (id) => {
    if (!window.confirm('Delete this pitch? This can\'t be undone.')) return;
    await supabase.from('pitches').delete().eq('id', id);
    setPitches(prev => prev.filter(p => p.id !== id));
  };

  const fmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (showFlow) {
    return (
      <BriefFlow
        session={session}
        onClose={() => setShowFlow(false)}
        onSaved={handlePitchSaved}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-bold text-gray-100 tracking-tight">Brief Board</h1>
            <p className="text-xs text-gray-500 mt-0.5">{today}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
        </div>
      </div>

      {/* New Brief CTA */}
      <div className="px-4 mb-5">
        <button
          onClick={() => setShowFlow(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl p-5 text-left transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <IconPlus />
            </div>
            <IconArrow />
          </div>
          <p className="text-white font-semibold text-base">New Brief</p>
          <p className="text-indigo-200 text-xs mt-0.5 leading-relaxed">
            Paste a brief → FSM matches your catalog → draft your pitch
          </p>
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 mb-5 grid grid-cols-3 gap-2.5">
        {[
          { label: 'Active', value: statusCounts.active },
          { label: 'In Consideration', value: statusCounts.consideration },
          { label: 'Licensed', value: statusCounts.licensed },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent pitches */}
      <div className="px-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2.5">Recent</p>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-gray-800 rounded w-1/2 mb-2" />
                <div className="h-2.5 bg-gray-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : pitches.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">No pitches yet</p>
            <p className="text-xs text-gray-600 mt-1">Tap New Brief to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pitches.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-100">
                      {p.supervisor_name || 'Unknown Supervisor'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || 'bg-gray-800 text-gray-500'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-600">{fmt(p.created_at)}</span>
                    <button
                      onClick={() => deletePitch(p.id)}
                      className="text-gray-700 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Delete pitch"
                    >×</button>
                  </div>
                </div>
                {p.company && (
                  <p className="text-xs text-gray-500">{p.company}{p.project_name ? ` · ${p.project_name}` : ''}</p>
                )}
                {p.notes && (
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-2">{p.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
