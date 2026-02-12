import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar' | 'auto';
export type ModelQuality = 'tiny' | 'base' | 'small' | 'medium';

interface SettingsState {
    theme: Theme;
    language: Language; // UI language
    primaryTranscriptionLanguage: string;
    secondaryTranscriptionLanguage: string;
    modelQuality: ModelQuality;
    notificationsEnabled: boolean;

    setTheme: (theme: Theme) => void;
    setLanguage: (lang: Language) => void;
    setPrimaryTranscriptionLanguage: (lang: string) => void;
    setSecondaryTranscriptionLanguage: (lang: string) => void;
    setModelQuality: (quality: ModelQuality) => void;
    toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'light',
            language: 'en',
            primaryTranscriptionLanguage: 'en',
            secondaryTranscriptionLanguage: '',
            modelQuality: 'tiny',
            notificationsEnabled: true,
            setTheme: (theme) => set({ theme }),

            setLanguage: (language) => {
                set({ language });
                document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = language;
            },

            setPrimaryTranscriptionLanguage: (primaryTranscriptionLanguage) => set({ primaryTranscriptionLanguage }),
            setSecondaryTranscriptionLanguage: (secondaryTranscriptionLanguage) => set({ secondaryTranscriptionLanguage }),
            setModelQuality: (modelQuality) => set({ modelQuality }),

            toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
        }),
        {
            name: 'duck-settings',
        }
    )
);
