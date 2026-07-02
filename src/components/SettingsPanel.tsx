import React, { useState, useEffect } from 'react';
import { FolderOpen, Save, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { Settings } from '../types.ts';

interface SettingsPanelProps {
  settings: Settings | null;
  onSave: (url: string) => Promise<void>;
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

  // Sync state when settings load
  useEffect(() => {
    if (settings?.google_drive_folder_url) {
      setFolderUrl(settings.google_drive_folder_url);
    }
  }, [settings]);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(folderUrl);
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-gray-50">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <FolderOpen className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Google Drive Configuration</h3>
          <p className="text-xs text-gray-500">Specify the monitoring folder for teacher lesson plans</p>
        </div>
      </div>

      <form onSubmit={handleSaveSubmit} className="space-y-4">
        <div>
          <label htmlFor="folder-url" className="block text-xs font-medium text-gray-700 mb-1.5">
            Google Drive Folder URL or Folder ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="folder-url"
              type="text"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx"
              className="flex-1 min-w-0 block w-full px-3.5 py-2 rounded-lg text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
              disabled={isSaving || isScanning}
            />
            <button
              id="save-settings-btn"
              type="submit"
              disabled={isSaving || isScanning || !folderUrl.trim()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Folder
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {settings?.google_drive_folder_id && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-50 text-sm">
          {folderName && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Monitored Folder
              </span>
              <span className="font-medium text-gray-800 flex items-center gap-1.5">
                {folderName}
                <a
                  href={settings.google_drive_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink className="h-3.5 w-3.5 inline" />
                </a>
              </span>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Folder ID
            </span>
            <span className="font-mono text-xs text-gray-600 select-all">
              {settings.google_drive_folder_id}
            </span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg relative flex flex-col justify-between">
            <div>
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Last Synchronized
              </span>
              <span className="text-gray-800 flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
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
            className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
