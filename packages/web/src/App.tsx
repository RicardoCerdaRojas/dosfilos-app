import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { FirebaseProvider } from '@/context/firebase-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DashboardPage } from '@/pages/dashboard';
import { SermonsPage } from '@/pages/sermons';
import { SermonNewPage } from '@/pages/sermons/new';
import { SermonDetailPage } from '@/pages/sermons/detail';
import { SermonEditPage } from '@/pages/sermons/edit';
import { PreachModePage } from '@/pages/sermons/preach';
import { SeriesList } from '@/pages/series/SeriesList';
import { SeriesForm } from '@/pages/series/SeriesForm';
import { SeriesDetail } from '@/pages/series/SeriesDetail';
import { LibraryManager } from '@/pages/library/LibraryManager';
import { PlannerWizard } from '@/pages/planner/PlannerWizard';
import { SermonWizard } from './pages/sermons/generator/SermonWizard';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { PublicSermonPage } from '@/pages/public/sermon';
import { PricingPage } from '@/pages/public/pricing';
import { WelcomePage } from '@/pages/onboarding/WelcomePage';
import { GeneratorSettings } from '@/pages/settings/GeneratorSettings';
import SubscriptionPage from '@/pages/subscription/SubscriptionPage';
import { GeminiTest } from '@/pages/GeminiTest';
import { Landing } from '@/pages/Landing';
import { AdminLeads } from '@/pages/admin/AdminLeads';
import CoreLibraryAdmin from '@/pages/admin/CoreLibraryAdmin';
import { GreekTutorPage } from '@/pages/greek-tutor/GreekTutorPage';
import { GreekTutorProvider } from './pages/sermons/generator/exegesis/greek-tutor/GreekTutorProvider';
import { GreekTutorDashboardView } from './pages/sermons/generator/exegesis/greek-tutor/GreekTutorDashboardView';
import { useEffect } from 'react';

// Redirect component for old sermon routes
function RedirectToSermon({ suffix = '' }: { suffix?: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (id) {
      navigate(`/dashboard/sermons/${id}${suffix}`, { replace: true });
    }
  }, [id, suffix, navigate]);
  
  return null;
}

function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page - Root */}
          <Route path="/" element={<Landing />} />
          
          {/* Public Pricing Page */}
          <Route path="/pricing" element={<PricingPage />} />
          
          {/* Onboarding - Welcome/Plan Selection */}
          <Route path="/welcome" element={<WelcomePage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/share/:token" element={<PublicSermonPage />} />

          {/* Redirect old sermon routes to new dashboard routes */}
          <Route path="/sermons" element={<Navigate to="/dashboard/sermons" replace />} />
          <Route path="/sermons/new" element={<Navigate to="/dashboard/sermons/new" replace />} />
          <Route path="/sermons/generate" element={<Navigate to="/dashboard/generate-sermon" replace />} />
          <Route path="/sermons/:id" element={<RedirectToSermon />} />
          <Route path="/sermons/:id/edit" element={<RedirectToSermon suffix="/edit" />} />
          <Route path="/sermons/:id/preach" element={<RedirectToSermon suffix="/preach" />} />

          {/* Preach Mode - Standalone route without sidebar */}
          <Route 
            path="/dashboard/sermons/:id/preach" 
            element={
              <ProtectedRoute>
                <PreachModePage />
              </ProtectedRoute>
            } 
          />

          {/* Greek Tutor Active Session - Standalone route without dashboard sidebar (immersive experience) */}
          <Route 
            path="/dashboard/greek-tutor/session" 
            element={
              <ProtectedRoute>
                <GreekTutorPage />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes (Protected by component) */}
          <Route path="/admin/leads" element={
            <ProtectedRoute>
              <AdminLeads />
            </ProtectedRoute>
          } />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            
            {/* Sermons Management */}
            <Route path="sermons">
              <Route index element={<SermonsPage />} />
              <Route path="new" element={<SermonNewPage />} />
              <Route path="generate" element={<SermonWizard />} />
              <Route path=":id" element={<SermonDetailPage />} />
              <Route path=":id/edit" element={<SermonEditPage />} />
              {/* Preach mode removed - moved outside dashboard layout */}
            </Route>

            {/* Preaching Plans Management */}
            <Route path="plans">
              <Route index element={<SeriesList />} />
              <Route path="new" element={<SeriesForm />} />
              <Route path=":id" element={<SeriesDetail />} />
              <Route path=":id/edit" element={<SeriesForm />} />
            </Route>
            <Route path="planner" element={<PlannerWizard />} />
            <Route path="library" element={<LibraryManager />} />
            <Route path="subscription" element={<SubscriptionPage />} />

            {/* AI Sermon Generator */}
            <Route path="generate-sermon" element={<SermonWizard />} />

            {/* Greek Tutor - Start page with sidebar for navigation */}
            <Route path="greek-tutor" element={<GreekTutorPage />} />
            
            {/* Greek Tutor Dashboard - Sessions list with sidebar */}
            <Route path="greek-tutor-dashboard" element={
              <GreekTutorProvider>
                <GreekTutorDashboardView />
              </GreekTutorProvider>
            } />

            {/* Settings */}
            <Route path="settings" element={<GeneratorSettings />} />
            
            {/* 🎯 Admin Routes - Inside Dashboard Layout */}
            <Route path="admin/core-library" element={<CoreLibraryAdmin />} />
            
            {/* PoC Routes */}
            <Route path="gemini-test" element={<GeminiTest />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </FirebaseProvider>
  );
}

export default App;
