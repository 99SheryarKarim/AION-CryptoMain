"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import Home from "./pages/Home"
import ContactUs from "./pages/ContactUs/Contact"
import Coins from "./pages/Coins/Coins"
import Predict from "./pages/Predict/Predict"
import GoPro from "./pages/GoPro/GoPro"
import Portfolio from "./pages/Portfolio/Portfolio"
import Signup from "./pages/Signup/Signup"
import Dashboard from "./pages/Dashboard/Dashboard"
import Info from "./pages/Info/Info"
import Services from "./sections/HomeComponents/Services/Services"
import About from "./sections/HomeComponents/AboutUs/AboutUs"
import Header from "./pages/Header/Header"
import Footer from "./pages/Footer/Footer"
import Loader from "./sections/HomeComponents/Loader/Loader"
import AdminLogin from "./pages/Admin/AdminLogin"
import AdminDashboard from "./pages/Admin/AdminDashboard"
import ScrollToTopButton from "./pages/ScrollTop/ScrollTop" // Import button

// Protected route component for regular users
const ProtectedRoute = ({ children }) => {
  const { token } = useSelector((state) => state.Auth)

  if (!token) {
    return <Navigate to="/signup" replace />
  }

  return children
}

// Protected route component for admin users
const AdminProtectedRoute = ({ children }) => {
  const { adminToken } = useSelector((state) => state.Auth)

  if (!adminToken) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

function App() {
  const [loading, setLoading] = useState(true)
  const { token } = useSelector((state) => state.Auth)

  useEffect(() => {
    document.body.style.overflow = "hidden" // Prevent scrolling while loading

    setTimeout(() => {
      setLoading(false)
      document.body.style.overflow = "auto" // Re-enable scrolling
    }, 2000)
  }, [])

  if (loading) {
    return <Loader />
  }

  return (
    <Router>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/coins" element={<Coins />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/gopro" element={<GoPro />} />
            <Route path="/portfolio" element={<Portfolio />} />

            {/* Auth routes */}
            <Route path="/signup" element={token ? <Navigate to="/dashboard" /> : <Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin routes - hidden from navigation */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />

            <Route path="/info" element={<Info />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTopButton /> {/* Scroll-to-top button */}
      </div>
    </Router>
  )
}

export default App
