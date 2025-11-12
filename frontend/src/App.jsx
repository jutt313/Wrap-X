import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import ChatPage from './pages/ChatPage'
import Documentation from './pages/Documentation'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/apis" element={<ProtectedRoute><div>APIs Page - Coming Soon</div></ProtectedRoute>} />
      <Route path="/llm-settings" element={<ProtectedRoute><div>LLM Settings - Coming Soon</div></ProtectedRoute>} />
      <Route path="/tools" element={<ProtectedRoute><div>Tools - Coming Soon</div></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><div>Billing - Coming Soon</div></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><div>Audit Logs - Coming Soon</div></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><div>Notifications - Coming Soon</div></ProtectedRoute>} />
      <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><div>Messages - Coming Soon</div></ProtectedRoute>} />
      <Route path="/organization" element={<ProtectedRoute><div>Organization - Coming Soon</div></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><div>Account Settings - Coming Soon</div></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><div>Profile - Coming Soon</div></ProtectedRoute>} />
      <Route path="/chat/:wrappedApiId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/" element={<Welcome />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
