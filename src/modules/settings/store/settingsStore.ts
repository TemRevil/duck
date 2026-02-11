import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar';

interface SettingsState {
    theme: Theme;
    language: Language;
    notificationsEnabled: boolean;

    setTheme: (theme: Theme) => void;
    setLanguage: (lang: Language) => void;
    toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'light',
            language: 'en',
            notificationsEnabled: true,
            setTheme: (theme) => set({ theme }),

            setLanguage: (language) => {
                set({ language });
                document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = language;
            },

            toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
        }),
        {
            name: 'duck-settings',
        }
    )
);
