const { GoogleGenAI } = require("@google/genai");
const { geminiApiKey, geminiModel } = require("./config");

function extractJson(text = "") {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("O Gemini nao retornou um JSON valido.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function buildPrompt(news) {
  return `
Voce e um professor renomado do Ensino Medio e especialista na banca elaboradora do ENEM.
Analise a noticia abaixo e retorne uma resposta em JSON puro, sem markdown e sem texto adicional.

DADOS DA NOTICIA:
- Titulo: ${news.titulo}
- Fonte: ${news.fonte}
- Data: ${news.data_publicacao}
- Descricao/Trecho: ${news.descricao}
- Link original: ${news.link}

INSTRUCOES:
1. A resposta deve ser profunda, especifica e util para redacao e provas objetivas do ENEM.
2. A questao deve ser inedita, contextualizada e conter exatamente 5 alternativas plausiveis.
3. O campo "gabarito" deve conter apenas a letra correta.
4. Retorne apenas JSON valido com a seguinte estrutura:
{
  "resumo": "string",
  "eixos_tematicos": ["string", "string"],
  "repertorio_redacao": "string",
  "area_conhecimento": "string",
  "conceitos_teoricos": ["string", "string"],
  "questao": {
    "enunciado": "string",
    "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "gabarito": "A",
    "explicacao": "string"
  }
}
`;
}

async function analyzeNews(news) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: buildPrompt(news),
    config: {
      temperature: 0.3,
    },
  });

  const parsed = extractJson(response.text || "");
  parsed.noticia_original = news;
  return parsed;
}

module.exports = {
  analyzeNews,
};
