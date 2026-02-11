import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods here if needed
});
