import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { ToastProvider } from "./context/ToastContext";

// Kaizen Con Conference & System Pages
import Home from "./pages/Dashboard/Home";
import SpeakersPage from "./pages/Conference/SpeakersPage";
import SessionsPage from "./pages/Conference/SessionsPage";
import TopicsPage from "./pages/Conference/TopicsPage";
import DelegatesPage from "./pages/Conference/DelegatesPage";
import UsersPage from "./pages/System/UsersPage";
import GroupsPage from "./pages/System/GroupsPage";
import SendToEmailPage from "./pages/AgentSettings/SendToEmailPage";
import CampaignsPage from "./pages/AgentSettings/CampaignsPage";
import CreateCampaignPage from "./pages/AgentSettings/CreateCampaignPage";
import TemplatesPage from "./pages/AgentSettings/TemplatesPage";
import PollsPage from "./pages/Conference/PollsPage";

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard & Conference Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Overview */}
              <Route index path="/" element={<Home />} />
              <Route path="/dashboard" element={<Home />} />

              {/* Conference */}
              <Route path="/faculty" element={<SpeakersPage />} />
              <Route path="/conference/faculty" element={<SpeakersPage />} />
              <Route path="/speakers" element={<SpeakersPage />} />
              <Route path="/conference/speakers" element={<SpeakersPage />} />

              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/conference/sessions" element={<SessionsPage />} />

              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/conference/topics" element={<TopicsPage />} />

              <Route path="/delegates" element={<DelegatesPage />} />
              <Route path="/conference/delegates" element={<DelegatesPage />} />

              {/* Agent Settings */}
              <Route path="/send-to-email" element={<SendToEmailPage />} />
              <Route path="/conference/send-to-email" element={<SendToEmailPage />} />
              <Route path="/agent-settings/send-to-email" element={<SendToEmailPage />} />

              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/create" element={<CreateCampaignPage />} />
              <Route path="/conference/campaigns" element={<CampaignsPage />} />
              <Route path="/conference/campaigns/create" element={<CreateCampaignPage />} />
              <Route path="/agent-settings/campaigns" element={<CampaignsPage />} />
              <Route path="/agent-settings/campaigns/create" element={<CreateCampaignPage />} />

              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/conference/templates" element={<TemplatesPage />} />
              <Route path="/agent-settings/templates" element={<TemplatesPage />} />

              {/* Conference Features */}
              <Route path="/polls" element={<PollsPage />} />
              <Route path="/conference/polls" element={<PollsPage />} />
              <Route path="/agent-settings/polls" element={<PollsPage />} />

              {/* System */}
              <Route path="/users" element={<UsersPage />} />
              <Route path="/system/users" element={<UsersPage />} />

              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/system/groups" element={<GroupsPage />} />
              <Route path="/admin/auth/group" element={<GroupsPage />} />

              {/* Profile */}
              <Route path="/profile" element={<UserProfiles />} />
            </Route>
          </Route>

          {/* Public Auth Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/login" element={<Navigate to="/signin" replace />} />
            <Route path="/signup" element={<Navigate to="/signin" replace />} />
          </Route>

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
