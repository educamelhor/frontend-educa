// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:3000/api"
      : "https://backend-educa.onrender.com/api",
});

export default api;
