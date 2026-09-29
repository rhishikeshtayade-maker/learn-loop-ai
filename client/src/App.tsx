import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LectureList } from './pages/LectureList';
import { NewLecture } from './pages/NewLecture';
import { LectureDetail } from './pages/LectureDetail';
import { QuizResult } from './pages/QuizResult';
import { Revision } from './pages/Revision';
import { Profile } from './pages/Profile';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lectures"
            element={
              <ProtectedRoute>
                <LectureList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lecture/new"
            element={
              <ProtectedRoute>
                <NewLecture />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lecture/:id"
            element={
              <ProtectedRoute>
                <LectureDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz-attempts/:attemptId/result"
            element={
              <ProtectedRoute>
                <QuizResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/revision"
            element={
              <ProtectedRoute>
                <Revision />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
