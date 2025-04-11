"use client"

import { useState, useEffect } from "react"
import "./Signup.css"
import { useDispatch, useSelector } from "react-redux"
import { Register, Login, setToastMessage, setToastStatus, setShowToast } from "../../RTK/Slices/AuthSlice"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const Signup = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token, showToast, toastMessage, toastStatus, loading: authLoading } = useSelector((state) => state.Auth || {})

  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")

  // API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  // Set mounted state
  useEffect(() => {
    setMounted(true)
    console.log("Component mounted, API URL:", API_URL)
  }, [API_URL])

  // Redirect if already authenticated
  useEffect(() => {
    if (mounted && token) {
      console.log("Token found in Redux state, redirecting to dashboard:", token)
      navigate("/dashboard")
    }
  }, [token, navigate, mounted])

  // Check token in localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      console.log("Found token in localStorage:", storedToken)
      navigate("/dashboard")
    }
  }, [navigate])

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Direct API call for registration
  const registerUser = async (userData) => {
    try {
      console.log("Registering user with direct API call to:", `${API_URL}/auth/register`)
      const response = await axios.post(`${API_URL}/auth/register`, userData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      console.log("Registration response:", response.data)
      return response.data
    } catch (error) {
      console.error("Direct registration error:", error)
      if (error.response) {
        throw new Error(error.response.data.detail || "Registration failed")
      } else if (error.request) {
        throw new Error("No response from server. Please check your connection.")
      } else {
        throw new Error(error.message || "Registration failed")
      }
    }
  }

  // Direct API call for login
  const loginUser = async (userData) => {
    try {
      console.log("Logging in user with direct API call to:", `${API_URL}/auth/login`)
      const response = await axios.post(`${API_URL}/auth/login`, userData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      console.log("Login response:", response.data)
      return response.data
    } catch (error) {
      console.error("Direct login error:", error)
      if (error.response) {
        throw new Error(error.response.data.detail || "Login failed")
      } else if (error.request) {
        throw new Error("No response from server. Please check your connection.")
      } else {
        throw new Error(error.message || "Login failed")
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Validate form
    if (!formData.username || !formData.password) {
      setError("Please fill in all required fields")
      return
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!isLogin && formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        // Handle login - try both Redux and direct API call
        try {
          // First try with Redux
          console.log("Attempting login with Redux")
          const loginResult = await dispatch(
            Login({
              username: formData.username,
              password: formData.password,
            }),
          ).unwrap()

          console.log("Login success with Redux:", loginResult)
          handleLoginSuccess(loginResult)
        } catch (reduxError) {
          console.error("Redux login failed, trying direct API call:", reduxError)

          // If Redux fails, try direct API call
          const loginResult = await loginUser({
            username: formData.username,
            password: formData.password,
          })

          console.log("Login success with direct API:", loginResult)
          handleLoginSuccess(loginResult)
        }
      } else {
        // Handle registration - try both Redux and direct API call
        try {
          // First try with Redux
          console.log("Attempting registration with Redux")
          const registrationResult = await dispatch(
            Register({
              username: formData.username,
              password: formData.password,
            }),
          ).unwrap()

          console.log("Registration success with Redux:", registrationResult)
          handleRegistrationSuccess()
        } catch (reduxError) {
          console.error("Redux registration failed, trying direct API call:", reduxError)

          // If Redux fails, try direct API call
          await registerUser({
            username: formData.username,
            password: formData.password,
          })

          console.log("Registration success with direct API")
          handleRegistrationSuccess()
        }
      }
    } catch (error) {
      console.error(isLogin ? "Login error:" : "Registration error:", error)
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  // Handle successful login
  const handleLoginSuccess = (result) => {
    const token = result.access_token || result.token

    if (token) {
      // Store token in localStorage
      localStorage.setItem("token", token)

      // Update UI
      dispatch(setToastMessage("Login successful!"))
      dispatch(setToastStatus("success"))
      dispatch(setShowToast(true))

      // Navigate to dashboard
      console.log("Redirecting to dashboard after successful login")
      navigate("/dashboard")
    } else {
      throw new Error("No token received from server")
    }
  }

  // Handle successful registration
  const handleRegistrationSuccess = () => {
    // Show success toast and switch to login
    dispatch(setToastMessage("Account created successfully! Please log in."))
    dispatch(setToastStatus("success"))
    dispatch(setShowToast(true))

    // Clear form and switch to login after delay
    setTimeout(() => {
      setIsLogin(true)
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
      })
      dispatch(setShowToast(false))
    }, 3000)
  }

  // Handle errors
  const handleError = (error) => {
    let errorMessage = "An error occurred. Please try again."

    if (error?.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.message) {
      errorMessage = error.message
    } else if (!navigator.onLine) {
      errorMessage = "Please check your internet connection."
    }

    setError(errorMessage)
    dispatch(setToastMessage(errorMessage))
    dispatch(setToastStatus("error"))
    dispatch(setShowToast(true))

    setTimeout(() => {
      dispatch(setShowToast(false))
    }, 3000)
  }

  // Toggle between login and signup
  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
    })
  }

  return (
    <div className="auth-container">
      {showToast && <div className={`toast-notification ${toastStatus}`}>{toastMessage}</div>}

      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <img src="/logoooo.png" alt="Logo" className="logo-image" />
          </div>
        </div>
        <div className="auth-header">
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>{isLogin ? "Sign in to access your account" : "Join us to start trading crypto"}</p>
        </div>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>

          <div className="auth-switch">
            <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
            <button className="switch-button" onClick={toggleAuthMode} type="button">
              {isLogin ? "Sign up" : "Login"}
            </button>
          </div>
        </form>
      </div>

      <div className="auth-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
    </div>
  )
}

export default Signup
