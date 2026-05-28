const Parser = require("rss-parser");

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

async function searchNews(term, limit = 5) {
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

module.exports = {
  searchNews,
};
