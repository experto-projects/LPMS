import React, { useState } from 'react';
import { Search, FileText, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { MonitoringDataset } from '../types.ts';

interface MonitoringGridProps {
  dataset: MonitoringDataset | null;
  isLoading: boolean;
  onScan: () => Promise<void>;
}

export const MonitoringGrid: React.FC<MonitoringGridProps> = ({ dataset, isLoading, onScan }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0a0a0a]/60 rounded-xl border border-[#18181b] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <RefreshCw className="h-8 w-8 text-zinc-300 animate-spin" />
        <p className="text-sm text-zinc-400 font-medium">Processing folder and reading document tabs metadata...</p>
      </div>
    );
  }

  if (!dataset || dataset.rows.length === 0) {
    return (
      <div className="bg-[#0a0a0a]/60 rounded-xl border border-[#18181b] p-12 text-center max-w-2xl mx-auto space-y-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="inline-flex p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-serif italic text-[#fafafa]">No monitoring records found</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {dataset 
            ? "The configured folder is empty or does not contain any valid Google Documents."
            : "Please configure a Google Drive folder and trigger a folder scan to populate the monitoring matrix."}
        </p>
        {!dataset && (
          <p className="text-xs text-zinc-500">
            Once saved, the LPMS will read Google Documents in the folder, scan their tabs, and compile a grid.
          </p>
        )}
      </div>
    );
  }

  // Filter rows by teacher name search term
  const filteredRows = dataset.rows.filter((row) =>
    row.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and Metadata Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-4 py-2 text-sm border border-[#27272a] rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-[#3f3f46] bg-[#000] text-white placeholder-zinc-600"
          />
        </div>

        <div className="text-xs text-zinc-500 font-medium text-right self-end sm:self-center">
          Showing {filteredRows.length} of {dataset.rows.length} teacher documents
        </div>
      </div>

      {/* Monitoring Grid Panel */}
      <div className="bg-zinc-950/40 rounded-xl border border-[#18181b] overflow-hidden shadow-[0_8px_35px_rgba(0,0,0,0.5)]">
        {/* Horizontal scroll container */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#18181b] text-left text-sm">
            <thead className="bg-[#0a0a0a] select-none font-semibold text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="sticky left-0 bg-[#0a0a0a] px-6 py-4 border-r border-zinc-900/60 z-10 w-64 min-w-[240px]">
                  Teacher / Google Doc
                </th>
                <th scope="col" className="px-6 py-4 w-48 min-w-[180px] text-zinc-500 font-semibold">
                  Last Modified
                </th>
                
                {dataset.columns.map((columnDate) => (
                  <th
                    key={columnDate}
                    scope="col"
                    className="px-4 py-4 text-center border-l border-zinc-900/60 font-semibold text-zinc-400 normal-case min-w-[110px]"
                  >
                    {columnDate}
                  </th>
                ))}
                
                {dataset.columns.length === 0 && (
                  <th scope="col" className="px-6 py-4 text-center italic text-zinc-600">
                    No lesson tabs detected
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#18181b] bg-transparent">
              {filteredRows.map((row) => (
                <tr key={row.documentId} className="hover:bg-zinc-900/20 transition-all duration-150 group">
                  {/* Teacher Name column is sticky for best horizontal reading */}
                  <td className="sticky left-0 bg-[#0a0a0a] group-hover:bg-[#0f0f10] transition-colors px-6 py-4 border-r border-zinc-900/60 font-medium text-[#fafafa] z-10 shadow-[3px_0_12px_rgba(0,0,0,0.4)]">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[200px]" title={row.teacherName}>
                        {row.teacherName}
                      </span>
                      {row.error && (
                        <span className="text-rose-400 text-[10px] flex items-center gap-1 mt-0.5" title={row.error}>
                          <AlertCircle className="h-3 w-3 inline shrink-0" />
                          Error reading tabs
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs text-zinc-500 whitespace-nowrap">
                    {formatDate(row.lastModified)}
                  </td>

                  {dataset.columns.map((columnDate) => {
                    const isSubmitted = row.submissions[columnDate];
                    return (
                      <td
                        key={columnDate}
                        className="px-4 py-4 text-center border-l border-zinc-900/60 whitespace-nowrap"
                      >
                        {isSubmitted ? (
                          <div className="text-[#10b981] font-semibold text-base w-full text-center" title={`Lesson Tab matches date: ${columnDate}`}>
                            ✓
                          </div>
                        ) : (
                          <span className="text-zinc-800 font-light text-xs">-</span>
                        )}
                      </td>
                    );
                  })}

                  {dataset.columns.length === 0 && (
                    <td className="px-6 py-4 text-center text-xs text-zinc-600 italic">
                      No document tabs to map
                    </td>
                  )}
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + dataset.columns.length}
                    className="px-6 py-12 text-center text-sm text-zinc-500 italic bg-[#0a0a0a]/20"
                  >
                    No teachers match the search query "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
