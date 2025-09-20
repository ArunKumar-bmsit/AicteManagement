import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthContext } from './hooks/useAuthContext'

// pages & components
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Navbar from './components/Navbar'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
function App() {
  const { user } = useAuthContext()

  // Set global background image from public folder
  useEffect(() => {
    // Remove any existing overlay (handles React StrictMode double-invoke in dev)
    const existing = document.querySelector('[data-bg-overlay="true"]')
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing)
    }

    // Create a subtle tint overlay
    const overlay = document.createElement('div')
    overlay.setAttribute('data-bg-overlay', 'true')
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0, 0, 0, 0.25)', // subtle dark tint
      pointerEvents: 'none',
      zIndex: '0',
    })
    document.body.appendChild(overlay)

    const prev = {
      backgroundImage: document.body.style.backgroundImage,
      backgroundSize: document.body.style.backgroundSize,
      backgroundPosition: document.body.style.backgroundPosition,
      backgroundRepeat: document.body.style.backgroundRepeat,
      backgroundAttachment: document.body.style.backgroundAttachment,
      minHeight: document.body.style.minHeight,
      backgroundColor: document.body.style.backgroundColor,
    }
    document.body.style.backgroundImage = `url(${process.env.PUBLIC_URL}/image.png)`
    document.body.style.backgroundSize = 'cover'
    document.body.style.backgroundPosition = 'center'
    document.body.style.backgroundRepeat = 'no-repeat'
    document.body.style.backgroundAttachment = 'fixed'
    document.body.style.minHeight = '100vh'
    // Keep light bg color behind transparent areas
    if (!document.body.style.backgroundColor) {
      document.body.style.backgroundColor = '#f1f1f1'
    }

    return () => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
      document.body.style.backgroundImage = prev.backgroundImage
      document.body.style.backgroundSize = prev.backgroundSize
      document.body.style.backgroundPosition = prev.backgroundPosition
      document.body.style.backgroundRepeat = prev.backgroundRepeat
      document.body.style.backgroundAttachment = prev.backgroundAttachment
      document.body.style.minHeight = prev.minHeight
      document.body.style.backgroundColor = prev.backgroundColor
    }
  }, [])

  return (
    <div className="App" style={{ position: 'relative', zIndex: 1 }}>
      <BrowserRouter>
        <Navbar />
        <div className="pages">
          <Routes>
            <Route 
              path="/" 
              element={user ? <Home /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to="/" />} 
            />
            <Route 
              path="/signup" 
              element={!user ? <Signup /> : <Navigate to="/" />} 
            />
            <Route 
            path="/admin" 
            element={!user ? <Admin /> :<Dashboard />} 
            />
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
