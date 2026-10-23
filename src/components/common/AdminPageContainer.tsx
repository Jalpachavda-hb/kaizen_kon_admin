import React from "react";

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
  searchPlaceholder: _searchPlaceholder,
  searchValue: _searchValue,
  onSearchChange: _onSearchChange,
  actionButton,
  children,
}) => {
  return (
    <div className="w-full">
      {/* Main Content Container Card */}
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
