import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { GeneratorSettings } from '@/pages/settings/GeneratorSettings';
import { GeminiTest } from '@/pages/GeminiTest';
import { Landing } from '@/pages/Landing';

function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page - Root */}
          <Route path="/" element={<Landing />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/share/:token" element={<PublicSermonPage />} />

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
              <Route path=":id/preach" element={<PreachModePage />} />
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

            {/* AI Sermon Generator */}
            <Route path="generate-sermon" element={<SermonWizard />} />

            {/* Settings */}
            <Route path="settings" element={<GeneratorSettings />} />
            
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
