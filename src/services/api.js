// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000", // seu backend roda em porta 3000, com prefixo /api
});

export default api;

