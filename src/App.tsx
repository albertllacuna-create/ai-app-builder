import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { AppBuilder } from './pages/AppBuilder';
import { Login } from './pages/Login';
import { Preview } from './pages/Preview';
import { AppViewer } from './pages/AppViewer';
import { JoinWorkspace } from './pages/JoinWorkspace';

import { HubOverview } from './pages/hub/HubOverview';
import { HubUsers } from './pages/hub/HubUsers';
import { HubData } from './pages/hub/HubData';
import { HubDomains } from './pages/hub/HubDomains';
import { HubPayments } from './pages/hub/HubPayments';
import { HubSettings } from './pages/hub/HubSettings';
import { PricingPlans } from './pages/PricingPlans';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProjectDashboard />} />
        <Route path="/pricing" element={<PricingPlans />} />

        {/* AppBuilder is now the master layout for the project */}
        <Route path="/project/:projectId" element={<AppBuilder />}>
          <Route path="overview" element={<HubOverview />} />
          <Route path="users" element={<HubUsers />} />
          <Route path="data" element={<HubData />} />
          <Route path="editor" element={<div />} /> {/* AppBuilder intercepts this internally */}
          <Route path="domains" element={<HubDomains />} />
          <Route path="payments" element={<HubPayments />} />
          <Route path="settings" element={<HubSettings />} />
          <Route index element={<Navigate to="overview" replace />} />
        </Route>

        <Route path="/preview/:projectId" element={<Preview />} />
        <Route path="/app/:projectId" element={<AppViewer />} />
        <Route path="/join/:token" element={<JoinWorkspace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
