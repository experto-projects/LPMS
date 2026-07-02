import React, { useState, useEffect } from 'react';
import { FolderOpen, Save, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { Settings } from '../types.ts';

interface SettingsPanelProps {
  settings: Settings | null;
  onSave: (url: string, frequency: string) => Promise<void>;
  onScan: () => Promise<void>;
  isSaving: boolean;
  isScanning: boolean;
  lastScanTime: string | null;
  folderName: string | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSave,
  onScan,
  isSaving,
  isScanning,
  lastScanTime,
  folderName,
}) => {
  const [folderUrl, setFolderUrl] = useState('');
  const [scanFrequency, setScanFrequency] = useState('manual');

  // Sync state when settings load
  useEffect(() => {
    if (settings?.google_drive_folder_url) {
      setFolderUrl(settings.google_drive_folder_url);
    }
    if (settings?.scan_frequency) {
      setScanFrequency(settings.scan_frequency);
    }
  }, [settings]);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(folderUrl, scanFrequency);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Never scanned';
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-zinc-950/40 rounded-xl border border-[#18181b] p-6 space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-zinc-900">
        <div className="p-2 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-850">
          <FolderOpen className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-[#fafafa]">Google Drive Configuration</h3>
          <p className="text-xs text-[#71717a]">Specify the monitoring folder and automated execution frequency</p>
        </div>
      </div>

      <form onSubmit={handleSaveSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="folder-url" className="block text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-2">
              Google Drive Folder URL or Folder ID
            </label>
            <input
              id="folder-url"
              type="text"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx"
              className="block w-full px-3.5 py-2.5 rounded-lg text-sm border border-[#27272a] bg-[#000] text-[#fff] placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-[#3f3f46] font-mono"
              disabled={isSaving || isScanning}
            />
          </div>
          <div>
            <label htmlFor="scan-frequency" className="block text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-2">
              Automatic Scan Frequency
            </label>
            <select
              id="scan-frequency"
              value={scanFrequency}
              onChange={(e) => setScanFrequency(e.target.value)}
              className="block w-full px-3.5 py-2.5 rounded-lg text-sm border border-[#27272a] bg-[#000] text-[#fff] focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-[#3f3f46]"
              disabled={isSaving || isScanning}
            >
              <option value="manual">Manual (On-Demand)</option>
              <option value="hourly">Hourly (Every 1 hour)</option>
              <option value="daily">Daily (Every 24 hours)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            id="save-settings-btn"
            type="submit"
            disabled={isSaving || isScanning || !folderUrl.trim()}
            className="inline-flex items-center justify-center px-5 py-2.5 border border-[#3f3f46] rounded-lg text-xs font-semibold text-[#fafafa] bg-transparent hover:bg-zinc-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSaving ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Saving Config...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>

      {settings?.google_drive_folder_id && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-900 text-sm">
          {folderName && (
            <div className="bg-[#050505] border border-zinc-900 p-3.5 rounded-lg">
              <span className="block text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-1.5">
                Monitored Folder
              </span>
              <span className="font-medium text-[#e4e4e7] flex items-center gap-1.5">
                {folderName}
                <a
                  href={settings.google_drive_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 inline" />
                </a>
              </span>
            </div>
          )}

          <div className="bg-[#050505] border border-zinc-900 p-3.5 rounded-lg">
            <span className="block text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-1.5">
              Folder ID
            </span>
            <span className="font-mono text-xs text-zinc-400 select-all">
              {settings.google_drive_folder_id}
            </span>
          </div>

          <div className="bg-[#050505] border border-zinc-900 p-3.5 rounded-lg relative flex flex-col justify-between">
            <div>
              <span className="block text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-1.5">
                Last Synchronized
              </span>
              <span className="text-[#e4e4e7] flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                {formatDate(lastScanTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {settings?.google_drive_folder_id && (
        <div className="pt-2 flex justify-end">
          <button
            id="scan-folder-btn"
            onClick={onScan}
            disabled={isSaving || isScanning}
            className="inline-flex items-center px-6 py-3 rounded-lg text-xs font-semibold text-black bg-[#fafafa] hover:bg-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_15px_rgba(255,255,255,0.05)] border-none"
          >
            {isScanning ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2 animate-spin-reverse" />
                Scanning Folder...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Folder Now
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
