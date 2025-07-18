// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:3000"
      : "https://backend-educa.onrender.com",
});

export default api;
