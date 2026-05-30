const Parser = require("rss-parser");
const NodeCache = require("node-cache");
const { searchActiveNews } = require("./geminiService");

// Cache com TTL reduzido para 5 minutos (300 segundos) para maior dinamismo nas pesquisas de notícias
const newsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

if (process.env.ALLOW_INVALID_CERTIFICATES !== "false") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 NewsCLI Web App",
  },
});

function cleanHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * Busca noticias via RSS (Google News)
 */
async function searchNewsRSS(term, limit = 5) {
  const encodedTerm = encodeURIComponent(term);
  const url = `https://news.google.com/rss/search?q=${encodedTerm}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const feed = await parser.parseURL(url);

  return (feed.items || []).slice(0, limit).map((item) => {
    const titleWithSource = item.title || "";
    let title = titleWithSource;
    let source = item.source?.title || "Desconhecida";

    if (titleWithSource.includes(" - ")) {
      const parts = titleWithSource.split(" - ");
      source = parts.pop() || source;
      title = parts.join(" - ");
    }

    return {
      id: item.guid || item.link || `${title}-${item.pubDate || ""}`,
      titulo: title,
      fonte: source,
      data_publicacao: formatDate(item.pubDate || item.isoDate),
      link: item.link || "",
      descricao: cleanHtml(item.contentSnippet || item.content || ""),
    };
  });
}

/**
 * Funcao principal de busca com cache e busca ativa
 */
async function searchNews(term, limit = 5) {
  const cacheKey = `news_${term}_${limit}`;
  const cachedData = newsCache.get(cacheKey);

  if (cachedData) {
    console.log(`[Cache] Retornando resultados para: ${term}`);
    return cachedData;
  }

  console.log(`[Busca Ativa] Buscando noticias para: ${term}`);
  
  try {
    // Tenta busca ativa com Gemini primeiro
    let news = await searchActiveNews(term, limit);
    
    // Se falhar ou vier vazio, cai no RSS
    if (!news || news.length === 0) {
      console.log(`[Fallback] Usando RSS para: ${term}`);
      news = await searchNewsRSS(term, limit);
    }

    // Salva no cache
    newsCache.set(cacheKey, news);
    return news;
  } catch (error) {
    console.error("Erro na busca de noticias:", error);
    // Fallback final para RSS se o Gemini explodir
    return await searchNewsRSS(term, limit);
  }
}

module.exports = {
  searchNews,
};
