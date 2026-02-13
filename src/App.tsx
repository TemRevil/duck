
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Mic, FileAudio, History, Info } from 'lucide-react';
import { MainLayout } from './components/layout/MainLayout';
import { GlassCard, GlassButton } from './components/ui';
import { Toaster } from 'react-hot-toast';
import { useSettingsStore } from './modules/settings/store/settingsStore';
import { SettingsModal } from './modules/settings/SettingsModal';
import { Recorder } from './modules/transcription/components/Recorder';
import { RecordingIndicator } from './modules/transcription/components/RecordingIndicator';
import { TranscriptionHistory } from './modules/transcription/components/TranscriptionHistory';
import { FileUploader } from './modules/transcription/components/FileUploader';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'record' | 'files' | 'history' | 'about'>('record');
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
            <RecordingIndicator />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <div className="glass-card-solid p-4 mb-8 flex flex-col md:flex-row justify-between items-center mx-auto max-w-6xl w-full sticky top-0 z-50 backdrop-blur-md gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tropical-teal to-pearl-aqua flex items-center justify-center text-mint-cream shadow-lg shadow-tropical-teal/20">
                        <Mic size={20} />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Duck Transcription</h1>
                </div>

                <div className="flex bg-taupe-grey/10 dark:bg-black/20 p-1 rounded-2xl overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('record')}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${activeTab === 'record' ? 'bg-white dark:bg-tropical-teal text-tropical-teal dark:text-white shadow-sm' : 'text-taupe-grey/60 hover:text-tropical-teal'}`}
                    >
                        <Mic size={16} /> Record
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${activeTab === 'files' ? 'bg-white dark:bg-tropical-teal text-tropical-teal dark:text-white shadow-sm' : 'text-taupe-grey/60 hover:text-tropical-teal'}`}
                    >
                        <FileAudio size={16} /> Files
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-tropical-teal text-tropical-teal dark:text-white shadow-sm' : 'text-taupe-grey/60 hover:text-tropical-teal'}`}
                    >
                        <History size={16} /> History
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${activeTab === 'about' ? 'bg-white dark:bg-tropical-teal text-tropical-teal dark:text-white shadow-sm' : 'text-taupe-grey/60 hover:text-tropical-teal'}`}
                    >
                        <Info size={16} /> About
                    </button>
                </div>

                <GlassButton variant="ghost" className="p-2.5 rounded-xl hidden md:flex" onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon size={20} />
                </GlassButton>
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-start pb-20">
                {activeTab === 'record' && <Recorder />}
                {activeTab === 'files' && <FileUploader />}
                {activeTab === 'history' && <TranscriptionHistory />}

                {activeTab === 'about' && (
                    <div className="w-full">
                        <GlassCard className="p-8">
                            <h2 className="text-xl font-bold">About Duck</h2>
                            <p className="text-sm text-taupe-grey/60 mt-4 leading-relaxed">
                                Duck is a professional-grade, offline-first transcription engine. It uses state-of-the-art AI models to convert speech to text with high accuracy, while ensuring your data never leaves your device.
                            </p>
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-tropical-teal" />
                                    Powered by Vosk-Browser (Kaldi-based)
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-tropical-teal" />
                                    100% Offline Processing
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-tropical-teal" />
                                    Dual Language Support
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-tropical-teal" />
                                    Speaker Diarization
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </main>

            {/* Mobile Settings Button */}
            <div className="fixed bottom-6 right-6 md:hidden">
                <GlassButton variant="primary" className="w-14 h-14 rounded-full shadow-2xl" onClick={() => setIsSettingsOpen(true)}>
                    <SettingsIcon size={24} />
                </GlassButton>
            </div>
        </MainLayout>
    );
};

export default App;
