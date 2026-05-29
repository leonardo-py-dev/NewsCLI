const { GoogleGenerativeAI } = require("@google/generative-ai");
const { geminiApiKey, geminiModel } = require("./config");

function extractJson(text = "") {
  // Tenta extrair JSON de blocos de codigo ou do texto puro
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;

  try {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("JSON não encontrado no texto.");
    }

    return JSON.parse(candidate.slice(start, end + 1));
  } catch (e) {
    console.error("Erro ao parsear JSON do Gemini:", text);
    throw new Error("O Gemini não retornou um JSON válido.");
  }
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

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: geminiModel });
  
  const result = await model.generateContent(buildPrompt(news));
  const response = await result.response;
  const text = response.text();

  const parsed = extractJson(text);
  parsed.noticia_original = news;
  return parsed;
}

/**
 * Realiza busca ativa de noticias usando o Google Search do Gemini
 */
async function searchActiveNews(term, limit = 5) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  
  // Usamos o modelo que suporta ferramentas de busca (geralmente gemini-1.5-flash ou pro)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Garantindo um modelo que suporta tools
    tools: [{ googleSearch: {} }],
  });

  const today = new Date().toLocaleDateString("pt-BR");
  const prompt = `
    Hoje é dia ${today}. 
    Realize uma busca ativa na internet por notícias reais, recentes e confiáveis sobre o tema: "${term}".
    Foque em portais de notícias conhecidos (G1, Folha, Estadão, CNN Brasil, BBC Brasil, etc).
    Retorne uma lista com as ${limit} notícias mais relevantes no formato JSON.
    
    ESTRUTURA DO JSON:
    {
      "news": [
        {
          "id": "string unica",
          "titulo": "string",
          "fonte": "string",
          "data_publicacao": "DD/MM/AAAA HH:mm",
          "link": "URL",
          "descricao": "resumo de 2-3 frases"
        }
      ]
    }
    
    Retorne APENAS o JSON.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    const data = extractJson(text);
    return data.news || [];
  } catch (error) {
    console.error("Erro na busca ativa do Gemini:", error);
    return [];
  }
}

module.exports = {
  analyzeNews,
  searchActiveNews,
};
