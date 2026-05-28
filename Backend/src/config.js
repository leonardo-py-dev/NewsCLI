const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const backendEnvPath = path.resolve(__dirname, "..", ".env");
const rootEnvPath = path.resolve(__dirname, "..", "..", ".env");

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const reportsDir = path.resolve(__dirname, "..", "reports");
const dataDir = path.resolve(__dirname, "..", "data");

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const defaultThemes = [
  "sustentabilidade e meio ambiente",
  "desigualdade social e pobreza",
  "saude publica no brasil",
  "tecnologia e inclusao digital",
  "educacao e analfabetismo",
  "seguranca publica e violencia",
  "mobilidade urbana",
  "crise energetica e transicao energetica",
  "demografia e envelhecimento da populacao",
  "cultura e valorizacao de minorias",
];

function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

module.exports = {
  port: Number(getEnv("PORT", "3001")),
  geminiApiKey: getEnv("GEMINI_API_KEY"),
  geminiModel: getEnv("GEMINI_MODEL", "gemini-2.5-flash"),
  reportsDir,
  dataDir,
  defaultThemes,
};
