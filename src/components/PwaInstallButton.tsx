import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { sounds } from '../audio/SoundEffects';

export const PwaInstallButton: React.FC = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleDownloadAndInstall = async () => {
    sounds.playCardSelect();
    setDownloading(true);

    // 1. If native PWA install is supported by browser, trigger it immediately
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('PWA install choice:', outcome);
        setDeferredPrompt(null);
      } catch (e) {
        console.warn('PWA prompt error:', e);
      }
    }

    // 2. Direct automatic download of the App APK file without needing Chrome menus or manual steps
    try {
      const link = document.createElement('a');
      link.href = '/Phase10_Game.apk';
      link.setAttribute('download', 'Phase10_Mobile_Game.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Direct download error:', err);
      window.location.href = '/Phase10_Game.apk';
    }

    setTimeout(() => {
      setDownloading(false);
    }, 3000);
  };

  return (
    <button
      onClick={handleDownloadAndInstall}
      className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:opacity-95 text-white font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 border border-white/30 active:scale-95 transition-all animate-pulse"
      title={language === 'ar' ? 'تحميل وتثبيت التطبيق على جهازك مباشرة' : 'Download and Install App directly'}
    >
      {downloading ? <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" /> : <Download className="w-3.5 h-3.5" />}
      <span>
        {downloading
          ? (language === 'ar' ? 'جاري التحميل...' : 'Downloading...')
          : (language === 'ar' ? 'تحميل التطبيق (APK)' : 'Download App (APK)')}
      </span>
    </button>
  );
};
