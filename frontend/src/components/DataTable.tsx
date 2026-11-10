import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SecondaryButton } from './SecondaryButton';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="w-full bg-white rounded-2xl border border-app-border shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-app-border bg-main-bg/60 text-xs font-semibold uppercase tracking-wider text-secondary-text">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-3.5 ${col.headerClassName || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border/70">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-secondary-text">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-pastel-lavender/20 transition-colors ${
                    onRowClick ? 'cursor-pointer active:bg-pastel-lavender/30' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => {
                    const content =
                      typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : col.accessor
                        ? (row[col.accessor] as React.ReactNode)
                        : null;
                    return (
                      <td key={colIdx} className={`px-5 py-3.5 text-primary-text ${col.className || ''}`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="px-6 py-3.5 border-t border-app-border bg-main-bg/40 flex items-center justify-between text-xs text-secondary-text">
          <span>
            Page <strong className="text-primary-text font-semibold">{currentPage}</strong> of{' '}
            <strong className="text-primary-text font-semibold">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              icon={<ChevronRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Next
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
