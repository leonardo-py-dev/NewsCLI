const express = require("express");
const cors = require("cors");
const { port, defaultThemes, geminiApiKey } = require("./config");
const { searchNews } = require("./newsService");
const { analyzeNews, compareNews, chatWithAI } = require("./geminiService");
const { saveReportMarkdown } = require("./reportService");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasGeminiKey: Boolean(geminiApiKey),
  });
});

app.get("/api/themes", (_req, res) => {
  res.json({ themes: defaultThemes });
});

app.get("/api/news", async (req, res) => {
  const term = String(req.query.term || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 3), 1), 10);

  if (!term) {
    return res.status(400).json({ error: "Informe um termo para pesquisar noticias." });
  }

  try {
    const news = await searchNews(term, limit);
    return res.json({ news });
  } catch (error) {
    return res.status(500).json({
      error: "Falha ao buscar noticias no Google News.",
      details: error.message,
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { news, saveReport = true } = req.body || {};

  if (!news || !news.titulo || !news.link) {
    return res.status(400).json({ error: "Envie uma noticia valida para analise." });
  }

  try {
    const analysis = await analyzeNews(news);
    const report = saveReport ? saveReportMarkdown(analysis) : null;

    return res.json({
      analysis,
      report,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Falha ao analisar a noticia com Gemini.",
      details: error.message,
    });
  }
});

app.post("/api/analyze-batch", async (req, res) => {
  const items = Array.isArray(req.body?.news) ? req.body.news : [];

  if (!items.length) {
    return res.status(400).json({ error: "Envie ao menos uma noticia para analise." });
  }

  const results = [];

  for (const item of items) {
    try {
      const analysis = await analyzeNews(item);
      const report = saveReportMarkdown(analysis);
      results.push({ success: true, analysis, report });
    } catch (error) {
      results.push({
        success: false,
        news: item,
        error: error.message,
      });
    }
  }

  return res.json({ results });
});
app.post("/api/chat", async (req, res) => {
  const { message, history = [], newsContext = [] } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "Envie uma mensagem para o chat." });
  }

  try {
    const reply = await chatWithAI(message, history, newsContext);
    return res.json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "Falha ao interagir com o Tutor IA.",
      details: error.message,
    });
  }
});

app.post("/api/compare", async (req, res) => {
  const { news1, news2 } = req.body || {};

  if (!news1 || !news2) {
    return res.status(400).json({ error: "Envie duas noticias para comparacao." });
  }

  try {
    const comparison = await compareNews(news1, news2);
    return res.json({ comparison });
  } catch (error) {
    return res.status(500).json({
      error: "Falha ao gerar o quadro comparativo.",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
