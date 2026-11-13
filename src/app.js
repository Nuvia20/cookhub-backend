import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import testRoutes from "./routes/testRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import recetasRoutes from "./routes/recetas.js";
import usuariosRoutes from "./routes/usuarios.js";

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// 🔐 Configuración de CORS para permitir tu frontend
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

//  Rutas principales
app.use("/api", testRoutes);
app.use("/auth", authRoutes);
app.use("/", profileRoutes);
app.use("/api/recipes", recipeRoutes);

//  Servir imágenes estáticas
const uploadsDirectory = fileURLToPath(new URL("../uploads", import.meta.url));
app.use("/uploads", express.static(uploadsDirectory));

//  Rutas de recetas y usuarios
app.use("/recetas", recetasRoutes);
app.use("/usuarios", usuariosRoutes);

//  Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

export default app;
