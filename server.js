require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname)));

// Ruta por defecto: abrir focusgrupo.html al entrar a /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "focusgrupo.html"));
});

// Configuración OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const fs = require("fs");

// Al iniciar el servidor, intentar cargar tokens
if (fs.existsSync("tokens.json")) {
  const tokens = JSON.parse(fs.readFileSync("tokens.json"));
  oAuth2Client.setCredentials(tokens);
}



  // Guardar tokens en archivo


// Paso 1: redirigir al usuario para autorizar
app.get("/auth", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
     prompt: "consent",
    scope: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  res.redirect(url);
});

// Paso 2: recibir el código y obtener el token
app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
    fs.writeFileSync("tokens.json", JSON.stringify(tokens));
  res.send("✅ Autenticación completada, ya podés guardar respuestas.");
 });

// Paso 3: endpoint para guardar respuestas
app.post("/guardar", async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);
    const sheets = google.sheets({ version: "v4", auth: oAuth2Client });
    const SHEET_ID = "102dUBkP3RcBGiSPIB0CDJz52t6Q-U7GUYQ5ttpEC8IY";

   await sheets.spreadsheets.values.append({
  spreadsheetId: "102dUBkP3RcBGiSPIB0CDJz52t6Q-U7GUYQ5ttpEC8IY", // tu SHEET_ID
  range: "Respuestas!A:I", // nombre exacto de la pestaña
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));