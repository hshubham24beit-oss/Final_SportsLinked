import { Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import PublicLayout from '../layouts/PublicLayout';
import GuestRoute from './GuestRoute';
import OnboardingGate from './OnboardingGate';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Feed from '../pages/Feed';
import MyNetwork from '../pages/MyNetwork';
import Messages from '../pages/Messages';
import Settings from '../pages/Settings';
import Onboarding from '../pages/Onboarding';
import ProfileEdit from '../pages/ProfileEdit';
import PublicProfile from '../pages/PublicProfile';
import Discovery from '../pages/Discovery';
import Opportunities from '../pages/Opportunities';
import OpportunityDetail from '../pages/OpportunityDetail';
import OpportunityForm from '../pages/OpportunityForm';
import MyOpportunities from '../pages/MyOpportunities';
import Applicants from '../pages/Applicants';
import Applications from '../pages/Applications';
import ApplicationDetail from '../pages/ApplicationDetail';
import Events from '../pages/Events';
import EventDetail from '../pages/EventDetail';
import EventForm from '../pages/EventForm';
import EventRegistrants from '../pages/EventRegistrants';
import Teams from '../pages/Teams';
import TeamDetail from '../pages/TeamDetail';
import TeamForm from '../pages/TeamForm';
import Notifications from '../pages/Notifications';
import AiAssistant from '../pages/AiAssistant';
import Verification from '../pages/Verification';
import Safety from '../pages/Safety';
import AdminVerifications from '../pages/AdminVerifications';
import AdminUsers from '../pages/AdminUsers';
import AdminReports from '../pages/AdminReports';
import AdminOrganisations from '../pages/AdminOrganisations';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
import DesignSystem from '../pages/DesignSystem';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<OnboardingGate />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/feed" element={<Feed />} />
            <Route
              path="/ai"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <AiAssistant />
                </RoleRoute>
              }
            />
            <Route
              path="/network"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <MyNetwork />
                </RoleRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <Messages />
                </RoleRoute>
              }
            />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/saved" element={<Opportunities savedOnly />} />
            <Route
              path="/opportunities/new"
              element={
                <RoleRoute allowedRoles={['coach', 'recruiter']}>
                  <OpportunityForm />
                </RoleRoute>
              }
            />
            <Route
              path="/opportunities/mine"
              element={
                <RoleRoute allowedRoles={['coach', 'recruiter']}>
                  <MyOpportunities />
                </RoleRoute>
              }
            />
            <Route path="/opportunities/:id" element={<OpportunityDetail />} />
            <Route
              path="/opportunities/:id/edit"
              element={
                <RoleRoute allowedRoles={['coach', 'recruiter']}>
                  <OpportunityForm />
                </RoleRoute>
              }
            />
            <Route
              path="/opportunities/:id/applicants"
              element={
                <RoleRoute allowedRoles={['coach', 'recruiter']}>
                  <Applicants />
                </RoleRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <RoleRoute allowedRoles={['athlete']}>
                  <Applications />
                </RoleRoute>
              }
            />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/events" element={<Events />} />
            <Route
              path="/events/mine"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <Events mineOnly />
                </RoleRoute>
              }
            />
            <Route
              path="/events/new"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <EventForm />
                </RoleRoute>
              }
            />
            <Route
              path="/events/:id/edit"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <EventForm />
                </RoleRoute>
              }
            />
            <Route
              path="/events/:id/registrants"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <EventRegistrants />
                </RoleRoute>
              }
            />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route
              path="/teams"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <Teams />
                </RoleRoute>
              }
            />
            <Route
              path="/teams/mine"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <Teams mineOnly />
                </RoleRoute>
              }
            />
            <Route
              path="/teams/new"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <TeamForm />
                </RoleRoute>
              }
            />
            <Route
              path="/teams/:id/edit"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <TeamForm />
                </RoleRoute>
              }
            />
            <Route
              path="/teams/:id"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <TeamDetail />
                </RoleRoute>
              }
            />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/verification"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <Verification />
                </RoleRoute>
              }
            />
            <Route
              path="/safety"
              element={
                <RoleRoute allowedRoles={['athlete', 'coach', 'recruiter']}>
                  <Safety />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <AdminVerifications />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/organisations"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <AdminOrganisations />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <AdminUsers />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <AdminReports />
                </RoleRoute>
              }
            />
            <Route
              path="/discovery/saved"
              element={
                <RoleRoute allowedRoles={['coach', 'recruiter']}>
                  <Discovery savedOnly />
                </RoleRoute>
              }
            />
            <Route
              path="/discovery"
              element={
                <RoleRoute allowedRoles={['coach', 'recruiter', 'admin']}>
                  <Discovery />
                </RoleRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/p/:slug" element={<PublicProfile />} />
      </Route>

      <Route path="/design-system" element={<DesignSystem />} />

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}