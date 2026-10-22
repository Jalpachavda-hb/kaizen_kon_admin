import React from "react";
import { SearchMiniIcon } from "../../icons/conferenceIcons";

interface AdminPageContainerProps {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminPageContainer: React.FC<AdminPageContainerProps> = ({
  title,
  subtitle,
  searchPlaceholder = "Type to search",
  searchValue = "",
  onSearchChange,
  actionButton,
  children,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Top Search Input (matches screenshot) */}
      <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-xs">
        <div className="relative flex items-center w-full">
          <span className="absolute left-3 text-gray-400 pointer-events-none">
            <SearchMiniIcon className="w-4 h-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-9 pr-10 py-2 text-sm text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 focus:outline-none"
          />
          <span className="absolute right-3 px-2 py-0.5 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            /
          </span>
        </div>
      </div>

      {/* Main Content Container Card (matches screenshot) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs overflow-hidden">
        {(title || actionButton) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <div>
              {title && (
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {actionButton && <div>{actionButton}</div>}
          </div>
        )}

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
