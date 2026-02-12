import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassModal, GlassButton } from '../../components/ui';
import { useSettingsStore, Language } from './store/settingsStore';
import { translations } from '../../utils/translations';
import { Moon, Sun, Bell, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    return (
        <GlassModal isOpen={isOpen} onClose={onClose} title="">
            {isOpen && <SettingsModalContent onClose={onClose} />}
        </GlassModal>
    );
};

const SettingsModalContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const {
        theme,
        language,
        primaryTranscriptionLanguage,
        secondaryTranscriptionLanguage,
        modelQuality,
        notificationsEnabled,
        setTheme,
        setLanguage,
        setPrimaryTranscriptionLanguage,
        setSecondaryTranscriptionLanguage,
        setModelQuality,
        toggleNotifications,
    } = useSettingsStore();
    const t = translations[language];

    const [isNotificationAllowed, setIsNotificationAllowed] = useState(Notification.permission === 'granted');

    const handleToggleNotifications = async () => {
        if (Notification.permission === 'denied') {
            toast.error("Notifications are blocked by your browser.");
            return;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setIsNotificationAllowed(true);
                if (!notificationsEnabled) toggleNotifications();
            } else {
                setIsNotificationAllowed(false);
                if (notificationsEnabled) toggleNotifications();
            }
        } else {
            toggleNotifications();
        }
    };

    // model selection removed in UI-only mode

    const isActuallyEnabled = notificationsEnabled && isNotificationAllowed;

    return (
        <div className="space-y-6 md:space-y-8 max-h-[75vh] md:max-h-[85vh] overflow-y-auto px-1 custom-scrollbar">
                <header className="flex items-center gap-3 md:gap-4 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-tropical-teal to-pearl-aqua flex items-center justify-center text-white shadow-lg shadow-tropical-teal/20">
                    <Sun size={20} className="animate-pulse-slow md:w-6 md:h-6" />
                </div>
                <div>
                    <h3 className="text-lg md:text-xl font-bold text-shadow-grey dark:text-white leading-tight">
                        {t.settings}
                    </h3>
                    <p className="text-[10px] md:text-xs text-taupe-grey/60 dark:text-white/40 font-medium">Customize your application appearance and language</p>
                </div>
            </header>

            {/* General Section */}
            <section className="space-y-5">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-tropical-teal/70 dark:text-tropical-teal px-2 py-0.5 bg-tropical-teal/5 dark:bg-tropical-teal/10 rounded-md">General</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Language Selection */}
                    <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-pearl-aqua/20 dark:border-white/10 hover:border-tropical-teal/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-tropical-teal/10 dark:bg-white/5 rounded-xl text-tropical-teal group-hover:scale-110 transition-transform">
                                    <Globe size={18} />
                                </div>
                                <p className="font-bold text-sm text-shadow-grey dark:text-white">{t.language}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-taupe-grey/5 dark:bg-black/20 rounded-xl">
                            {(['en', 'ar'] as Language[]).map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${language === lang
                                        ? 'bg-white dark:bg-tropical-teal text-tropical-teal dark:text-white shadow-sm'
                                        : 'text-taupe-grey/60 dark:text-white/40 hover:text-tropical-teal dark:hover:text-white'
                                        }`}
                                >
                                    {lang === 'en' ? 'English' : 'العربية'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Toggle */}
                    <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-pearl-aqua/20 dark:border-white/10 hover:border-tropical-teal/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-tropical-teal/10 dark:bg-white/5 rounded-xl text-tropical-teal group-hover:scale-110 transition-transform">
                                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                                </div>
                                <p className="font-bold text-sm text-shadow-grey dark:text-white">{t.theme}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-1 bg-taupe-grey/5 dark:bg-black/20 rounded-xl">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${theme === 'light'
                                    ? 'bg-white shadow-sm text-tropical-teal'
                                    : 'text-taupe-grey/60 dark:text-white/40 hover:text-tropical-teal transition-all'
                                    }`}
                            >
                                <Sun size={14} /> Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${theme === 'dark'
                                    ? 'bg-[#2a2a2a] shadow-sm text-pearl-aqua border border-white/5'
                                    : 'text-taupe-grey/60 dark:text-white/40 hover:text-pearl-aqua transition-all'
                                    }`}
                            >
                                <Moon size={14} /> Dark
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-pearl-aqua/20 dark:border-white/10 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-tropical-teal/10 dark:bg-white/5 rounded-xl text-tropical-teal group-hover:rotate-12 transition-transform">
                            <Bell size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-shadow-grey dark:text-white">{t.notifications}</p>
                            <p className="text-[10px] text-taupe-grey/60 dark:text-white/40 font-medium">Desktop alerts for task updates</p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleNotifications}
                        className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${isActuallyEnabled ? 'bg-gradient-to-r from-tropical-teal to-pearl-aqua' : 'bg-taupe-grey/20 dark:bg-white/10'}`}
                    >
                        <motion.div
                            animate={{ left: isActuallyEnabled ? 30 : 4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
                        >
                            {isActuallyEnabled && <div className="w-1.5 h-1.5 rounded-full bg-tropical-teal" />}
                        </motion.div>
                    </button>
                </div>
            </section>

            {/* Transcription Section */}
            <section className="space-y-5">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-tropical-teal/70 dark:text-tropical-teal px-2 py-0.5 bg-tropical-teal/5 dark:bg-tropical-teal/10 rounded-md">Transcription</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Language */}
                    <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-pearl-aqua/20 dark:border-white/10">
                        <p className="font-bold text-sm text-shadow-grey dark:text-white mb-3">Primary Language</p>
                        <select
                            value={primaryTranscriptionLanguage}
                            onChange={(e) => setPrimaryTranscriptionLanguage(e.target.value)}
                            className="w-full bg-taupe-grey/5 dark:bg-black/20 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tropical-teal outline-none"
                        >
                            <option value="en">English</option>
                            <option value="ar">Arabic</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="es">Spanish</option>
                        </select>
                    </div>

                    {/* Secondary Language */}
                    <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-pearl-aqua/20 dark:border-white/10">
                        <p className="font-bold text-sm text-shadow-grey dark:text-white mb-3">Secondary Language (Optional)</p>
                        <select
                            value={secondaryTranscriptionLanguage}
                            onChange={(e) => setSecondaryTranscriptionLanguage(e.target.value)}
                            className="w-full bg-taupe-grey/5 dark:bg-black/20 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tropical-teal outline-none"
                        >
                            <option value="">None</option>
                            <option value="en">English</option>
                            <option value="ar">Arabic</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="es">Spanish</option>
                        </select>
                    </div>
                </div>

                {/* Model Quality */}
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-pearl-aqua/20 dark:border-white/10 group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-tropical-teal/10 dark:bg-white/5 rounded-xl text-tropical-teal group-hover:scale-110 transition-transform">
                            <Globe size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-shadow-grey dark:text-white">Model Quality</p>
                            <p className="text-[10px] text-taupe-grey/60 dark:text-white/40 font-medium">Higher quality requires more memory and time</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 p-1 bg-taupe-grey/5 dark:bg-black/20 rounded-xl">
                        {(['tiny', 'base', 'small', 'medium'] as const).map((quality) => (
                            <button
                                key={quality}
                                onClick={() => setModelQuality(quality)}
                                className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${modelQuality === quality
                                    ? 'bg-white dark:bg-tropical-teal text-tropical-teal dark:text-white shadow-sm'
                                    : 'text-taupe-grey/60 dark:text-white/40 hover:text-tropical-teal dark:hover:text-white'
                                    }`}
                            >
                                {quality.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="pt-4 border-t border-pearl-aqua/20 dark:border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
                <p className="text-[10px] text-taupe-grey/40 dark:text-white/30 font-medium italic order-2 md:order-1">Duck Transcription Engine v1.0.2</p>
                <GlassButton variant="primary" onClick={onClose} className="w-full md:w-auto px-10 py-3 text-base shadow-xl hover:shadow-tropical-teal/30 active:scale-95 transition-all font-bold order-1 md:order-2">
                    {t.done}
                </GlassButton>
            </footer>
        </div>
    );
};

