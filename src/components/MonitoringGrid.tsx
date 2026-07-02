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
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Processing folder and reading document tabs metadata...</p>
      </div>
    );
  }

  if (!dataset || dataset.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex p-3 rounded-full bg-yellow-50 text-yellow-600">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No monitoring records found</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          {dataset 
            ? "The configured folder is empty or does not contain any valid Google Documents."
            : "Please configure a Google Drive folder and trigger a folder scan to populate the monitoring matrix."}
        </p>
        {!dataset && (
          <p className="text-xs text-gray-400">
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
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>

        <div className="text-xs text-gray-500 font-medium text-right self-end sm:self-center">
          Showing {filteredRows.length} of {dataset.rows.length} teacher documents
        </div>
      </div>

      {/* Monitoring Grid Panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Horizontal scroll container */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
            <thead className="bg-gray-50/75 select-none font-medium text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="sticky left-0 bg-gray-50 px-6 py-4 border-r border-gray-100 z-10 w-64 min-w-[240px]">
                  Teacher / Google Doc
                </th>
                <th scope="col" className="px-6 py-4 w-48 min-w-[180px]">
                  Last Modified
                </th>
                
                {dataset.columns.map((columnDate) => (
                  <th
                    key={columnDate}
                    scope="col"
                    className="px-4 py-4 text-center border-l border-gray-100 font-semibold text-gray-700 normal-case min-w-[110px]"
                  >
                    {columnDate}
                  </th>
                ))}
                
                {dataset.columns.length === 0 && (
                  <th scope="col" className="px-6 py-4 text-center italic text-gray-400">
                    No lesson tabs detected
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.documentId} className="hover:bg-gray-50/50 transition-colors">
                  {/* Teacher Name column is sticky for best horizontal reading */}
                  <td className="sticky left-0 bg-white hover:bg-gray-50 group-hover:bg-gray-50 px-6 py-4 border-r border-gray-100 font-medium text-gray-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[200px]" title={row.teacherName}>
                        {row.teacherName}
                      </span>
                      {row.error && (
                        <span className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5" title={row.error}>
                          <AlertCircle className="h-3 w-3 inline shrink-0" />
                          Error reading tabs
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(row.lastModified)}
                  </td>

                  {dataset.columns.map((columnDate) => {
                    const isSubmitted = row.submissions[columnDate];
                    return (
                      <td
                        key={columnDate}
                        className="px-4 py-4 text-center border-l border-gray-100 whitespace-nowrap"
                      >
                        {isSubmitted ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 font-bold" title={`Lesson Tab matches date: ${columnDate}`}>
                            <Check className="h-4 w-4 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="text-gray-200 font-light text-xs">-</span>
                        )}
                      </td>
                    );
                  })}

                  {dataset.columns.length === 0 && (
                    <td className="px-6 py-4 text-center text-xs text-gray-400 italic">
                      No document tabs to map
                    </td>
                  )}
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + dataset.columns.length}
                    className="px-6 py-10 text-center text-sm text-gray-400 italic"
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
