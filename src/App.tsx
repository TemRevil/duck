import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { MainLayout } from './components/layout/MainLayout';
import { GlassCard, GlassButton } from './components/ui';
import { Toaster } from 'react-hot-toast';
import { useSettingsStore } from './modules/settings/store/settingsStore';
import { SettingsModal } from './modules/settings/SettingsModal';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'about'>('home');
    const { language, theme } = useSettingsStore();

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [theme, language]);

    return (
        <MainLayout>
            <Toaster position="bottom-right" />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <div className="glass-card-solid p-6 mb-8 flex justify-between items-center mx-auto max-w-6xl w-full sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tropical-teal to-pearl-aqua flex items-center justify-center text-mint-cream shadow-lg shadow-tropical-teal/20">
                        <SettingsIcon size={20} />
                    </div>
                    <h1 className="text-2xl font-bold">Duck — UI Only</h1>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded-xl ${activeTab === 'home' ? 'bg-white text-tropical-teal' : 'text-taupe-grey'}`}>Home</button>
                    <button onClick={() => setActiveTab('about')} className={`px-4 py-2 rounded-xl ${activeTab === 'about' ? 'bg-white text-tropical-teal' : 'text-taupe-grey'}`}>About</button>
                </div>

                <GlassButton variant="ghost" className="p-2.5 rounded-xl" onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon size={20} />
                </GlassButton>
            </div>

            <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col items-center justify-start pb-20">
                {activeTab === 'home' && (
                    <div className="w-full">
                        <GlassCard className="p-8">
                            <h2 className="text-xl font-bold">UI-only mode</h2>
                            <p className="text-sm text-taupe-grey/60 mt-2">All transcription and model-related code has been removed. This workspace retains only UI components, styles, and settings.</p>
                        </GlassCard>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="w-full">
                        <GlassCard className="p-8">
                            <h2 className="text-xl font-bold">About</h2>
                            <p className="text-sm text-taupe-grey/60 mt-2">Pruned project to UI-only per request.</p>
                        </GlassCard>
                    </div>
                )}
            </main>
        </MainLayout>
    );
};

export default App;
