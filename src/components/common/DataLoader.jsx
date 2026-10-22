import React from "react";

/**
 * TopProgressBar: Renders a sleek, slim glowing gradient progress bar at the very top of the app
 */
export function TopProgressBar() {
  return null;
}

/**
 * TableLoader: Standard loader for Table components
 */
export function TableLoader({
  colSpan = 6,
  text = "Loading data, please wait...",
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="py-12 px-6 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="size-8 rounded-full border-2 border-gray-200 border-t-[#AA2D7B] animate-spin" />
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {text}
          </p>
        </div>
      </td>
    </tr>
  );
}

/**
 * DataLoader: Standalone container loader
 */
export function DataLoader({
  text = "Loading data, please wait...",
  minHeight = "240px",
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 w-full p-8 text-center"
      style={{ minHeight }}
    >
      <div className="size-8 rounded-full border-2 border-gray-200 border-t-[#AA2D7B] animate-spin" />
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
        {text}
      </p>
    </div>
  );
}

export default DataLoader;
