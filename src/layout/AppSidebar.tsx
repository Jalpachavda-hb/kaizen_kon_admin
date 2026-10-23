import React from "react";
import { Link, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import {
  DashboardIcon,
  SpeakersIcon,
  SessionsIcon,
  DelegatesIcon,
  SendEmailIcon,
  CampaignsIcon,
  TemplatesIcon,
  WhatsAppIcon,
  PollsIcon,
} from "../icons/conferenceIcons";

export interface NavItem {
  name: string;
  path: string;
  aliases?: string[];
  icon: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const conferenceNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        path: "/",
        aliases: ["/dashboard"],
        icon: <DashboardIcon className="w-5 h-5" />,
      },
    ],
  },
  {
    title: "Conference",
    items: [
      {
        name: "Faculty",
        path: "/faculty",
        aliases: ["/conference/faculty"],
        icon: <SpeakersIcon className="w-5 h-5" />,
      },
      {
        name: "Sessions",
        path: "/sessions",
        aliases: ["/conference/sessions"],
        icon: <SessionsIcon className="w-5 h-5" />,
      },
      {
        name: "Delegates",
        path: "/delegates",
        aliases: ["/conference/delegates"],
        icon: <DelegatesIcon className="w-5 h-5" />,
      },
    ],
  },
  {
    title: "Agent Settings",
    items: [
      {
        name: "Send To Email",
        path: "/send-to-email",
        aliases: ["/conference/send-to-email", "/agent-settings/send-to-email"],
        icon: <SendEmailIcon className="w-5 h-5" />,
      },
      {
        name: "Campaigns",
        path: "/campaigns",
        aliases: ["/conference/campaigns", "/agent-settings/campaigns"],
        icon: <CampaignsIcon className="w-5 h-5" />,
      },
       {
        name: "Templates",
        path: "/templates",
        aliases: ["/conference/templates", "/agent-settings/templates"],
        icon: <TemplatesIcon className="w-5 h-5" />,
      },
      {
        name: "WhatsApp",
        path: "#",
        icon: <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />,
        badge: "Coming Soon",
        disabled: true,
      },
    ],
  },
  {
    title: "Conference Features",
    items: [
      {
        name: "Polls",
        path: "/polls",
        aliases: ["/conference/polls", "/agent-settings/polls"],
        icon: <PollsIcon className="w-5 h-5" />,
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleMobileSidebar,
  } = useSidebar();
  const location = useLocation();

  const isCurrentActive = (path: string, aliases?: string[]) => {
    if (location.pathname === path) return true;
    if (aliases && aliases.some((a) => location.pathname === a || location.pathname.startsWith(a + "/"))) {
      return true;
    }
    if (path !== "/" && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  const showFullSidebar = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out ${
        showFullSidebar ? "w-[270px]" : "w-[78px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Header / Logo Box */}
      <div className="flex items-center justify-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Link
          to="/"
          className="flex items-center justify-center w-full"
        >
          <div
            className={`py-2 px-3   bg-white dark:bg-gray-800 flex items-center justify-center shadow-xs transition-all ${
              showFullSidebar ? "w-full max-w-[240px]" : "w-12 h-12 p-1"
            }`}
          >
            <img
              src="/logokaizecon.png"
              alt="Kaizen Con 2027 Logo"  
              className={`${
                showFullSidebar ? "h-20 max-h-20" : "h-8 max-h-8"
              } w-auto max-w-full object-contain transition-all`}
              onError={(e) => {
                // fallback to text if image fails
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <span className="font-extrabold text-base tracking-tight text-[#AA2D7B] uppercase hidden only-child:block">
              Kaizen<span className="text-[#55355E]">Con</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 no-scrollbar">
        <nav className="flex flex-col gap-3.5">
          {conferenceNavSections.map((section, sIndex) => {
            return (
              <div key={section.title}>
                {sIndex > 0 && (
                  <div className="my-2.5 border-t border-gray-200/80 dark:border-gray-800" />
                )}

                {showFullSidebar && (
                  <h3 className="px-2.5 mb-1.5 text-[13px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {section.title}
                  </h3>
                )}

                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    if (item.disabled) {
                      return (
                        <li key={item.name}>
                          <div
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-not-allowed select-none opacity-60 text-gray-400 dark:text-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${
                              !showFullSidebar ? "justify-center px-2" : ""
                            }`}
                            title={!showFullSidebar ? `${item.name} (Coming Soon)` : undefined}
                            aria-disabled="true"
                          >
                            <span className="shrink-0 flex items-center justify-center">
                              {item.icon}
                            </span>
                            {showFullSidebar && (
                              <span className="truncate flex-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                {item.name}
                              </span>
                            )}
                            {showFullSidebar && item.badge && (
                              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    }

                    const active = isCurrentActive(item.path, item.aliases);

                    return (
                      <li key={item.name}>
                        <Link
                          to={item.path}
                          onClick={() => isMobileOpen && toggleMobileSidebar()}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            active
                              ? "bg-[#f5ebf3] text-[#55355E] dark:bg-[#55355E]/30 dark:text-[#f5d8e9] font-bold shadow-xs"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                          } ${!showFullSidebar ? "justify-center px-2" : ""}`}
                          title={!showFullSidebar ? item.name : undefined}
                        >
                          <span
                            className={`shrink-0 flex items-center justify-center ${
                              active
                                ? "text-[#55355E] dark:text-[#f5d8e9]"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {item.icon}
                          </span>
                          {showFullSidebar && (
                            <span className="truncate flex-1 text-sm font-medium">
                              {item.name}
                            </span>
                          )}
                          {showFullSidebar && item.badge && (
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#AA2D7B] text-white font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer info / Theme Badge */}
      {showFullSidebar && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#AA2D7B] animate-pulse" />
            <span className="font-semibold text-gray-600 dark:text-gray-300">Kaizen Con 2027</span>
          </span>
          <span className="font-mono text-[10px] text-gray-400">Admin v2.0</span>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
