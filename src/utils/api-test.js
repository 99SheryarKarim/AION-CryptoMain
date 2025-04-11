import axios from "axios"

// This file can be used to test API connections directly
// You can run this in the browser console or in a Node.js environment

export const testRegisterAPI = async (username, password) => {
  try {
    console.log("Testing registration with:", { username, password })

    const response = await axios.post(
      "http://127.0.0.1:8000/auth/register",
      {
        username,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    )

    console.log("Registration successful:", response.data)
    return response.data
  } catch (error) {
    console.error("Registration test failed:", error)
    if (error.response) {
      console.error("Error response:", error.response.data)
      console.error("Status:", error.response.status)
    }
    throw error
  }
}

export const testLoginAPI = async (username, password) => {
  try {
    console.log("Testing login with:", { username, password })

    const response = await axios.post(
      "http://127.0.0.1:8000/auth/login",
      {
        username,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    )

    console.log("Login successful:", response.data)
    return response.data
  } catch (error) {
    console.error("Login test failed:", error)
    if (error.response) {
      console.error("Error response:", error.response.data)
      console.error("Status:", error.response.status)
    }
    throw error
  }
}

// You can call these functions from the browser console:
// import { testRegisterAPI, testLoginAPI } from './utils/api-test.js';
// testRegisterAPI('test@example.com', 'password123');

