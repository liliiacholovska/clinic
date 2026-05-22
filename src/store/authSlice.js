import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: JSON.parse(localStorage.getItem('clinicUser')) || null
};

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload;

      localStorage.setItem(
        'clinicUser',
        JSON.stringify(action.payload)
      );
    },

    logout(state) {
      state.user = null;

      localStorage.removeItem('clinicUser');
    }
  }
});

export const {
  loginSuccess,
  logout
} = authSlice.actions;

export default authSlice.reducer;