import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { TopProgressBar } from "../components/common/DataLoader";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex print:block print:min-h-0">
      <TopProgressBar />
      <div className="print:hidden">
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 min-w-0 max-w-full overflow-hidden transition-all duration-300 ease-in-out print:ml-0 print:overflow-visible print:p-0 ${
          isExpanded || isHovered ? "lg:ml-[270px]" : "lg:ml-[78px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <div className="print:hidden">
          <AppHeader />
        </div>
        <div className="p-4 md:p-6 w-full max-w-full min-w-0 print:p-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
