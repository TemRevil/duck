
import Dexie, { Table } from 'dexie';

export interface TranscriptionEntry {
    id?: number;
    title: string;
    date: Date;
    duration: number;
    transcript: string;
    segments: Array<{
        speaker: string;
        text: string;
        start: number;
        end: number;
    }>;
    audioBlob?: Blob;
    status: 'completed' | 'processing' | 'error';
}

export class DuckDatabase extends Dexie {
    transcriptions!: Table<TranscriptionEntry>;

    constructor() {
        super('DuckDatabase');
        this.version(1).stores({
            transcriptions: '++id, title, date, status'
        });
    }
}

export const db = new DuckDatabase();
