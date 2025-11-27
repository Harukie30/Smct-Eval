import { CONFIG } from "../../config/config";
import axios from "axios";

const api = axios.create({
  baseURL: CONFIG.API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    "Content-Type": undefined,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timed out");
    }

    return Promise.reject(error);
  }
);

const sanctum = axios.create({
  baseURL: CONFIG.SANCTUM_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    "Content-Type": undefined,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

export { api, sanctum };
