import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Layout from './components/layout/Layout'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Setup from './pages/auth/Setup'

import TrainerDashboard from './pages/trainer/Dashboard'
import Terms from './pages/trainer/Terms'
import Subjects from './pages/trainer/Subjects'
import Classes from './pages/trainer/Classes'
import Students from './pages/trainer/Students'
import Participation from './pages/trainer/Participation'
import Trainers from './pages/trainer/Trainers'

import StudentDashboard from './pages/student/Dashboard'
import EvaluationGuide from './pages/shared/EvaluationGuide'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-gray-800 dark:text-white',
              duration: 3000,
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/setup" element={<Setup />} />

            {/* Trainer + Admin shared layout */}
            <Route
              path="/trainer"
              element={
                <ProtectedRoute role="trainer">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<TrainerDashboard />} />
              <Route path="terms" element={<Terms />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="classes" element={<Classes />} />
              <Route path="students" element={<Students />} />
              <Route path="participation" element={<Participation />} />
              <Route path="trainers" element={<Trainers />} />
              <Route path="guide" element={<EvaluationGuide />} />
            </Route>

            {/* Student */}
            <Route
              path="/student"
              element={
                <ProtectedRoute role="student">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="guide" element={<EvaluationGuide />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
