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
  
  const model = genAI.getGenerativeModel({
    model: geminiModel || "gemini-2.5-flash", // Utiliza o modelo configurado (gemini-2.5-flash por padrão)
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
async function compareNews(news1, news2) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: geminiModel || "gemini-2.5-flash" });

  const prompt = `
Você é um professor de redação e atualidades especialista no ENEM.
Sua tarefa é analisar as duas notícias abaixo de forma comparativa e gerar um relatório estruturado no formato JSON.

DADOS DA NOTÍCIA 1:
- Título: ${news1.titulo}
- Fonte: ${news1.fonte}
- Descrição: ${news1.descricao}

DADOS DA NOTÍCIA 2:
- Título: ${news2.titulo}
- Fonte: ${news2.fonte}
- Descrição: ${news2.descricao}

INSTRUÇÕES:
1. Identifique as principais convergências e divergências de abordagens/fatos entre as duas notícias.
2. Forneça uma análise crítica detalhada sobre como esse contraste ou conjunto de notícias pode ser cobrado nas redações do ENEM (eixos temáticos, teses e repertório).
3. Retorne a resposta APENAS em JSON estruturado com a seguinte estrutura exata:
{
  "convergencias": ["string", "string"],
  "divergencias": ["string", "string"],
  "analise_critica": "string",
  "repertorio_redacao_comparativo": "string"
}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return extractJson(text);
}

async function chatWithAI(message, history = [], newsContext = []) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: geminiModel || "gemini-2.5-flash" });

  // Injetar contexto das notícias salvas do usuário se existirem de forma segura
  let contextPrompt = "";
  if (newsContext && newsContext.length > 0) {
    contextPrompt = "\nVocê tem acesso ao contexto das notícias que o usuário está visualizando ou salvou recentemente:\n" +
      newsContext.map((n, i) => `[Notícia ${i + 1}]:\n- Título: ${n.titulo}\n- Fonte: ${n.fonte}\n- Resumo/Descrição: ${n.descricao}`).join("\n\n") + "\n";
  }

  const systemInstructions = `
Você é o "Tutor de Inteligência Artificial do NewsCLI Pro", um renomado professor particular de atualidades, redação e ciências humanas especialista na banca do ENEM.
Seu objetivo é ajudar o estudante a compreender profundamente os fatos da atualidade, a fazer conexões intelectuais brilhantes (com sociólogos, filósofos, fatos históricos, leis, etc.) e a planejar seus textos de redação.

INSTRUÇÕES DE RESPOSTA:
1. Responda de forma extremamente acolhedora, rica, didática e pedagógica.
2. Utilize formatação Markdown rica (títulos, negrito, listas) para deixar a resposta bonita e escaneável.
3. Use o contexto de notícias fornecido para fazer conexões reais sempre que apropriado.
4. Mantenha um tom profissional, engajador e inspirador.
` + contextPrompt;

  // Converter o histórico do chat em formato de conversa amigável para o prompt
  let formattedHistory = "";
  if (history && history.length > 0) {
    formattedHistory = history.map(h => `${h.role === "user" ? "Estudante" : "Tutor"}: ${h.content}`).join("\n");
  }

  const prompt = `
${systemInstructions}

HISTÓRICO DA CONVERSA:
${formattedHistory}

Estudante: ${message}
Tutor:`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = {
  analyzeNews,
  searchActiveNews,
  compareNews,
  chatWithAI,
};
