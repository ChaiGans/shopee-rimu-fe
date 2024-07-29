// src/api/axios.ts
import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Try to refresh the access token
      try {
        const refreshTokenResponse = await axios.post(
          "/api/auth/refresh-token",
          null,
          { withCredentials: true }
        );

        // Extract the new access token and its expiration time
        const newAccessToken = refreshTokenResponse.data.accessToken;
        const expiresIn = refreshTokenResponse.data.expires_in;

        // Set the new access token in the cookie
        Cookies.set("accessToken", newAccessToken, {
          maxAge: expiresIn,
          path: "/",
        });

        // Retry the original request with the new access token
        return api(originalRequest);
      } catch (refreshError) {
        // Handle refresh token expiration (e.g., log out the user)
        console.error("Refresh token expired. Please log in again.");
        // Perform logout or redirect to login page
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
