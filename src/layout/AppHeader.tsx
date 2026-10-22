import React from "react";
import { useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import UserDropdown from "../components/header/UserDropdown";
import { SidebarToggleIcon } from "../icons/conferenceIcons";

const AppHeader: React.FC = () => {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  // Determine breadcrumb based on current route
  const getBreadcrumbs = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("group")) {
      return {
        section: "Authentication and Authorization",
        page: "Groups",
      };
    }
    if (path.includes("user")) {
      return {
        section: "System",
        page: "Users",
      };
    }
    if (path.includes("speaker")) {
      return {
        section: "Conference",
        page: "Speakers",
      };
    }
    if (path.includes("session")) {
      return {
        section: "Conference",
        page: "Sessions",
      };
    }
    if (path.includes("topic")) {
      return {
        section: "Conference",
        page: "Topics",
      };
    }
    return {
      section: "Overview",
      page: "Dashboard",
    };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between w-full h-16 px-4 md:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Toggle Navigation"
          aria-label="Toggle Sidebar"
        >
          <SidebarToggleIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

        {/* Breadcrumb matching the user's screenshot */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs md:text-sm">
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {breadcrumbs.section}
          </span>
          <span className="text-gray-400 text-xs font-normal">
            &gt;
          </span>
          <span className="font-bold text-gray-950 dark:text-white">
            {breadcrumbs.page}
          </span>
        </nav>
      </div>

      {/* Right: User Dropdown & Status */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#faedf5] dark:bg-[#55355E]/30 text-[#AA2D7B] dark:text-[#f0c3df] text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#AA2D7B]" />
          <span>Kaizen Con Admin</span>
        </div>
        <UserDropdown />
      </div>
    </header>
  );
};

export default AppHeader;
