import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResumeSuite from "./pages/ResumeSuite";
import ResumeBuilder from "./pages/ResumeBuilder";
import Tracker from "./pages/Tracker";
import InterviewPrep from "./pages/InterviewPrep";
import Chat from "./pages/Chat";
import OfferVerification from "./pages/OfferVerification";
import Onboarding from "./pages/Onboarding";
import OpportunityHub from "./pages/OpportunityHub";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-builder"
            element={
              <ProtectedRoute>
                <ResumeBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-builder/:id"
            element={
              <ProtectedRoute>
                <ResumeBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-suite"
            element={
              <ProtectedRoute>
                <ResumeSuite />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracker"
            element={
              <ProtectedRoute>
                <Tracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/opportunities"
            element={
              <ProtectedRoute>
                <OpportunityHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/offer-verification"
            element={
              <ProtectedRoute>
                <OfferVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview-prep"
            element={
              <ProtectedRoute>
                <InterviewPrep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
