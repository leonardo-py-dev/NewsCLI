const fs = require("fs");
const path = require("path");
const { reportsDir } = require("./config");

function slugify(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function saveReportMarkdown(analysis) {
  const news = analysis.noticia_original || {};
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
  const fileName = `enem_${slugify(news.titulo || "noticia_sem_titulo").slice(0, 50)}_${timestamp}.md`;
  const filePath = path.join(reportsDir, fileName);

  const lines = [
    "# Fato e Repertorio: Analise ENEM",
    `*Relatorio gerado automaticamente em: ${new Date().toLocaleString("pt-BR")}*`,
    "",
    "---",
    "",
    "## Noticia Analisada",
    `> **Titulo:** ${news.titulo || "Sem titulo"}`,
    `> **Fonte:** *${news.fonte || "Desconhecida"}* | **Publicado em:** ${news.data_publicacao || "Sem data"}`,
    `> **Descricao:** ${news.descricao || "Sem descricao"}`,
    `> **Link:** ${news.link || "#"}`,
    "",
    "## Resumo do Fato",
    analysis.resumo || "",
    "",
    "---",
    "",
    "## Aplicacao na Redacao",
    `**Eixos Tematicos:** ${(analysis.eixos_tematicos || []).join(", ")}`,
    "",
    analysis.repertorio_redacao || "",
    "",
    "---",
    "",
    "## Aplicacao nas Provas Objetivas",
    `**Area do Conhecimento:** ${analysis.area_conhecimento || ""}`,
    "",
    "**Conceitos Teoricos Associados:**",
    ...(analysis.conceitos_teoricos || []).map((item) => `- ${item}`),
    "",
    "---",
    "",
    "## Questao Inedita Modelo ENEM",
    analysis.questao?.enunciado || "",
    "",
    "**Alternativas:**",
    ...(analysis.questao?.alternativas || []).map((item) => `- ${item}`),
    "",
    `**Gabarito:** ${analysis.questao?.gabarito || ""}`,
    "",
    "**Resolucao Comentada:**",
    analysis.questao?.explicacao || "",
    "",
  ];

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");

  return {
    fileName,
    filePath,
    relativePath: path.relative(path.resolve(__dirname, ".."), filePath),
  };
}

module.exports = {
  saveReportMarkdown,
};
