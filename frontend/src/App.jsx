import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Spinner from './components/ui/Spinner.jsx';

/*
 * Every route is lazy.
 *
 * Left unsplit, the agent dashboard, the admin console and Leaflet all ride in
 * the entry chunk — so a visitor who only ever looks at one property downloads
 * a moderation queue and a mapping library to do it.
 */
const Home = lazy(() => import('./pages/Home.jsx'));
const Browse = lazy(() => import('./pages/Browse.jsx'));
const ListingDetail = lazy(() => import('./pages/ListingDetail.jsx'));
const AgentProfile = lazy(() => import('./pages/AgentProfile.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const Saved = lazy(() => import('./pages/Saved.jsx'));
const Enquiries = lazy(() => import('./pages/Enquiries.jsx'));
const EnquiryThread = lazy(() => import('./pages/EnquiryThread.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

const AgentDashboard = lazy(() => import('./pages/agent/Dashboard.jsx'));
const ListingForm = lazy(() => import('./pages/agent/ListingForm.jsx'));

const AdminOverview = lazy(() => import('./pages/admin/Overview.jsx'));
const AdminQueue = lazy(() => import('./pages/admin/Queue.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));

const PageFallback = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <Spinner size="lg" />
  </div>
);

export const App = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="listings" element={<Browse />} />
        <Route path="listing/:slug" element={<ListingDetail />} />
        <Route path="agents/:id" element={<AgentProfile />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="password/forgot" element={<ForgotPassword />} />
        <Route path="password/reset/:token" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="saved" element={<Saved />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="enquiries/:id" element={<EnquiryThread />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route element={<ProtectedRoute roles={['agent', 'admin']} />}>
          <Route path="agent" element={<AgentDashboard />} />
          <Route path="agent/listings/new" element={<ListingForm />} />
          <Route path="agent/listings/:id/edit" element={<ListingForm />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminOverview />} />
          <Route path="admin/queue" element={<AdminQueue />} />
          <Route path="admin/users" element={<AdminUsers />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </Suspense>
);

export default App;
