require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Exponer carpeta "public" para imágenes y videos
app.use(express.static("public"));

// 🔹 Ruta por defecto: abrir focusgrupo.html al entrar a /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "focusgrupo.html"));
});

// 🔹 Configuración OAuth2 con variables de entorno
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://focus-encuesta.onrender.com/oauth2callback";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Usar directamente el refresh_token guardado en Render
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// 🔹 Paso 1: redirigir al usuario para autorizar (solo la primera vez)
app.get("/auth", (req, res) => {
  console.log("REDIRECT_URI usado:", REDIRECT_URI);
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    response_type: "code",
    scope: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  res.redirect(url);
});

// 🔹 Paso 2: recibir el código y obtener el token (solo para generar el refresh_token inicial)
app.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // ⚠️ Ya no guardamos tokens.json en disco
    // El refresh_token lo copiás y lo guardás en Render como variable de entorno
    console.log("Tokens obtenidos:", tokens);

    res.send("✅ Autenticación completada. Copiá el refresh_token y guardalo en Render.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en la autenticación");
  }
});

// 🔹 Paso 3: endpoint para guardar respuestas
app.post("/guardar", async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);
    const sheets = google.sheets({ version: "v4", auth: oAuth2Client });
    const SHEET_ID = "102dUBkP3RcBGiSPIB0CDJz52t6Q-U7GUYQ5ttpEC8IY";

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Respuestas!A:I",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          req.body.pieza || "Sin identificar",
          req.body.q1,
          req.body.q2,
          req.body.q3,
          req.body.q4,
          req.body.q5,
          req.body.q6,
          req.body.recordacionCarrusel || "",
          new Date().toLocaleString()
        ]]
      }
    });
    res.send("Respuestas guardadas!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al guardar respuestas");
  }
});

// 🔹 Puerto de Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
