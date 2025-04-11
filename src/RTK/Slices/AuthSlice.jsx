import { createSlice } from "@reduxjs/toolkit"

const AuthSlice = createSlice({
  name: "Auth",
  initialState: {
    showToast: false,
    toastMessage: "",
    toastStatus: "",
  },
  reducers: {
    setToastMessage: (state, action) => {
      state.toastMessage = action.payload
    },
    setToastStatus: (state, action) => {
      state.toastStatus = action.payload
    },
    setShowToast: (state, action) => {
      state.showToast = action.payload
    },
  },
})

export const { setToastMessage, setToastStatus, setShowToast } = AuthSlice.actions

export default AuthSlice.reducer
