// src/lib/audioAnalysis.js
// Lazy-loaded Essentia.js audio analyzer.
// Returns normalized values ready for the FSM track form:
//   bpm          -> rounded integer
//   key          -> string matching KEYS dropdown (e.g. "D Major"), '' if low confidence
//   keyStrength  -> 0..1 confidence from Essentia
//   energy       -> 0-100 (from RMS, scaled)
//   danceability -> 0-100 (from Essentia Danceability, scaled)
//   duration     -> string "M:SS" (e.g. "3:42")

const KEY_MAP = {
  'C':  'C',
  'C#': 'C♯/D♭',
  'Db': 'C♯/D♭',
  'D':  'D',
  'D#': 'D♯/E♭',
  'Eb': 'D♯/E♭',
  'E':  'E',
  'F':  'F',
  'F#': 'F♯/G♭',
  'Gb': 'F♯/G♭',
  'G':  'G',
  'G#': 'G♯/A♭',
  'Ab': 'G♯/A♭',
  'A':  'A',
  'A#': 'A♯/B♭',
  'Bb': 'A♯/B♭',
  'B':  'B',
};

function mapKey(key, scale, strength) {
  if (strength < 0.4) return '';
  const base = KEY_MAP[key];
  if (!base) return '';
  const mode = scale === 'major' ? 'Major' : 'Minor';
  return `${base} ${mode}`;
}

function normalizeEnergy(rms) {
  const minRms = 0.03;
  const maxRms = 0.35;
  const pct = ((rms - minRms) / (maxRms - minRms)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

function normalizeDanceability(raw) {
  const pct = (raw / 3) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

let essentiaPromise = null;

async function getEssentia() {
  if (!essentiaPromise) {
    essentiaPromise = (async () => {
      const EssentiaCore = (await import('essentia.js/dist/essentia.js-core.es.js')).default;
      const { EssentiaWASM } = await import('essentia.js/dist/essentia-wasm.es.js');
      return new EssentiaCore(EssentiaWASM);
    })();
  }
  return essentiaPromise;
}

async function decodeAudioFile(file, targetSampleRate = 44100) {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close();

  const duration = audioBuffer.duration;

  const length = Math.ceil(duration * targetSampleRate);
  const offline = new OfflineAudioContext(1, length, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return { signal: rendered.getChannelData(0), duration };
}

export async function analyzeAudio(file) {
  const essentia = await getEssentia();
  const { signal, duration } = await decodeAudioFile(file, 44100);
  const vec = essentia.arrayToVector(signal);

  try {
    const bpmRes = essentia.PercivalBpmEstimator(vec);
    const keyRes = essentia.KeyExtractor(vec);
    const energyRes = essentia.Energy(vec);
    const danceRes = essentia.Danceability(vec);

    const rms = Math.sqrt(energyRes.energy / signal.length);

    return {
      bpm: Math.round(bpmRes.bpm),
      key: mapKey(keyRes.key, keyRes.scale, keyRes.strength),
      keyStrength: keyRes.strength,
      energy: normalizeEnergy(rms),
      danceability: normalizeDanceability(danceRes.danceability),
      duration: formatDuration(duration),
    };
  } finally {
    vec.delete();
  }
}