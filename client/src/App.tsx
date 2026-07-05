import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Training from './pages/Training'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import Callback from './pages/Callback'
import Landing from './pages/Landing'
import ProtectedRoute from './components/ProtectedRoute'
import PrivacyPolicy from './pages/PrivacyPolicy'

function App() {
  return (
    <Routes>
      <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/training" element={<Training />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="/callback" element={<Callback />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/landing" element={<Landing />} />
  </Routes>
  )
}

export default App