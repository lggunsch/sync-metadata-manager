import { useState, useEffect } from "react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Listen for install prompt (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    });

    // iOS doesn't fire beforeinstallprompt — show manual instructions
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone;
    if (isIOS && !isInStandaloneMode) setShow(true);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
    }
  };

  if (!show) return null;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 flex items-center justify-between gap-3 z-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100">Install FSM</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {isIOS
            ? 'Tap the share button below, then "Add to Home Screen"'
            : 'Add to your home screen for the best experience'}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!isIOS && (
          <button onClick={handleInstall}
            className="bg-brand-yellow hover:bg-brand-yellow text-brand-navy px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
            Install
          </button>
        )}
        <button onClick={() => setShow(false)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg text-xs transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
}