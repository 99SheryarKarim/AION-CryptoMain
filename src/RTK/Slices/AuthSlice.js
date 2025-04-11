import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import axios from "axios"

// Get the API URL from environment variables or use a default
const API_URL = "http://127.0.0.1:8000"

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  validateStatus: (status) => {
    return status >= 200 && status < 500 // Handle only server errors as errors
  },
})

// Add request interceptor to handle redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 308) {
      // Handle redirect
      const redirectUrl = error.response.headers.location
      return api.request({
        method: error.config.method,
        url: redirectUrl,
        data: error.config.data,
      })
    }
    return Promise.reject(error)
  },
)

const initialState = {
  username: null,
  token: localStorage.getItem("token") || null,
  adminToken: localStorage.getItem("adminToken") || null,
  isAdmin: !!localStorage.getItem("adminToken"),
  toastStatus: "",
  loading: false,
  toastMessage: "",
  showToast: false,
  error: null,
}

export const Login = createAsyncThunk("AuthSlice/Login", async ({ username, password }, { rejectWithValue }) => {
  try {
    console.log("Login attempt with:", username)
    console.log("API URL:", API_URL)

    const response = await api.post("/auth/login", {
      username,
      password,
    })

    console.log("Login response:", response.data)

    // Handle the token format from the backend
    const token = response.data.access_token || response.data.token
    if (!token) {
      throw new Error("No token received from server")
    }

    // Store token in localStorage
    localStorage.setItem("token", token)

    return {
      access_token: token,
      username: username,
    }
  } catch (error) {
    console.error("Login error:", error)
    console.error("Full error object:", JSON.stringify(error, null, 2))

    if (error.response) {
      console.error("Error response data:", error.response.data)
      console.error("Error response status:", error.response.status)
      console.error("Error response headers:", error.response.headers)
      return rejectWithValue(error.response.data)
    }

    if (error.request) {
      console.error("Error request:", error.request)
      return rejectWithValue({ detail: "No response received from server. Please check your connection." })
    }

    return rejectWithValue({ detail: error.message || "Login failed. Please try again." })
  }
})

export const AdminLogin = createAsyncThunk(
  "AuthSlice/AdminLogin",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      console.log("Admin login attempt with:", username)
      console.log("API URL:", API_URL)

      // Replace with your actual admin login endpoint
      const response = await api.post("/auth/admin/login", {
        username,
        password,
      })

      console.log("Admin login response:", response.data)

      // Handle the token format from the backend
      const token = response.data.access_token || response.data.token
      if (!token) {
        throw new Error("No token received from server")
      }

      // Store admin token in localStorage
      localStorage.setItem("adminToken", token)

      return {
        access_token: token,
        username: username,
      }
    } catch (error) {
      console.error("Admin login error:", error)
      console.error("Full error object:", JSON.stringify(error, null, 2))

      if (error.response) {
        console.error("Error response data:", error.response.data)
        console.error("Error response status:", error.response.status)
        console.error("Error response headers:", error.response.headers)
        return rejectWithValue(error.response.data)
      }

      if (error.request) {
        console.error("Error request:", error.request)
        return rejectWithValue({ detail: "No response received from server. Please check your connection." })
      }

      return rejectWithValue({ detail: error.message || "Admin login failed. Please try again." })
    }
  },
)

export const Register = createAsyncThunk("AuthSlice/register", async ({ username, password }, { rejectWithValue }) => {
  try {
    console.log("Register attempt with:", username)
    console.log("API URL:", API_URL)

    const userData = {
      username,
      password,
    }

    console.log("Sending registration data:", userData)

    const response = await api.post("/auth/register", userData)

    console.log("Registration response:", response.data)

    // If registration includes a token, store it
    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token)
    }

    return {
      message: response.data.message || "Registration successful",
      user: response.data.user,
      access_token: response.data.access_token,
    }
  } catch (error) {
    console.error("Registration error:", error)
    console.error("Full error object:", JSON.stringify(error, null, 2))

    if (error.response) {
      console.error("Error response data:", error.response.data)
      console.error("Error response status:", error.response.status)
      console.error("Error response headers:", error.response.headers)
      return rejectWithValue(error.response.data)
    }

    if (error.request) {
      console.error("Error request:", error.request)
      return rejectWithValue({ detail: "No response received from server. Please check your connection." })
    }

    return rejectWithValue({ detail: error.message || "Registration failed. Please try again." })
  }
})

const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload
    },
    setAdminToken: (state, action) => {
      state.adminToken = action.payload
      state.isAdmin = !!action.payload
      if (action.payload) {
        localStorage.setItem("adminToken", action.payload)
      } else {
        localStorage.removeItem("adminToken")
      }
    },
    setToastStatus: (state, action) => {
      state.toastStatus = action.payload
    },
    setToastMessage: (state, action) => {
      state.toastMessage = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setShowToast: (state, action) => {
      state.showToast = action.payload
    },
    clearToken: (state) => {
      state.token = null
      state.username = null
      localStorage.removeItem("token")
    },
    clearAdminToken: (state) => {
      state.adminToken = null
      state.isAdmin = false
      localStorage.removeItem("adminToken")
    },
    clearAllTokens: (state) => {
      state.token = null
      state.adminToken = null
      state.isAdmin = false
      state.username = null
      localStorage.removeItem("token")
      localStorage.removeItem("adminToken")
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(Login.pending, (state) => {
        state.loading = true
        state.showToast = false
      })
      .addCase(Login.fulfilled, (state, action) => {
        state.token = action.payload.access_token
        localStorage.setItem("token", action.payload.access_token)
        state.username = action.payload.username || action.payload.user?.username
        state.loading = false
        state.toastStatus = "success"
        state.toastMessage = "Login successful!"
        state.showToast = true
      })
      .addCase(Login.rejected, (state, action) => {
        state.loading = false
        state.toastStatus = "error"
        state.toastMessage = action.payload?.response?.data?.detail || "Login failed. Please check your credentials."
        state.showToast = true
      })
      .addCase(AdminLogin.pending, (state) => {
        state.loading = true
        state.showToast = false
      })
      .addCase(AdminLogin.fulfilled, (state, action) => {
        state.adminToken = action.payload.access_token
        state.isAdmin = true
        localStorage.setItem("adminToken", action.payload.access_token)
        state.username = action.payload.username || action.payload.user?.username
        state.loading = false
        state.toastStatus = "success"
        state.toastMessage = "Admin login successful!"
        state.showToast = true
      })
      .addCase(AdminLogin.rejected, (state, action) => {
        state.loading = false
        state.toastStatus = "error"
        state.toastMessage =
          action.payload?.response?.data?.detail || "Admin login failed. Please check your credentials."
        state.showToast = true
      })
      .addCase(Register.pending, (state) => {
        state.loading = true
        state.showToast = false
      })
      .addCase(Register.fulfilled, (state, action) => {
        state.loading = false
        state.toastStatus = "success"
        state.toastMessage = "Account created successfully! You can now log in."
        state.showToast = true
      })
      .addCase(Register.rejected, (state, action) => {
        state.loading = false
        state.toastStatus = "error"
        // Improved error message handling
        let errorMessage = "Registration failed. Please try again."

        if (action.payload?.response?.data?.detail) {
          errorMessage = action.payload.response.data.detail
        } else if (action.payload?.message) {
          errorMessage = action.payload.message
        } else if (typeof action.payload === "string") {
          errorMessage = action.payload
        }

        state.toastMessage = errorMessage
        state.showToast = true
      }),
})

export const {
  setToken,
  setAdminToken,
  setToastStatus,
  setToastMessage,
  setLoading,
  setShowToast,
  clearToken,
  clearAdminToken,
  clearAllTokens,
} = AuthSlice.actions

export default AuthSlice.reducer
