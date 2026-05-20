import urllib.parse
import feedparser
from datetime import datetime

def buscar_noticias(termo: str, limite: int = 5) -> list:
    """
    Busca notícias no Google News RSS com base em um termo de pesquisa.
    Retorna uma lista de dicionários contendo os dados da notícia.
    """
    # Escapar o termo para usar na URL de pesquisa do Google News
    termo_codificado = urllib.parse.quote(termo)
    
    # URL do feed RSS do Google News para o Brasil (pt-BR)
    # hl=pt-BR: Linguagem português
    # gl=BR: Região Brasil
    # ceid=BR:pt-419: ID de Edição Brasil
    url_feed = f"https://news.google.com/rss/search?q={termo_codificado}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    
    # Fazer o parsing do feed RSS
    feed = feedparser.parse(url_feed)
    
    noticias = []
    for entrada in feed.entries[:limite]:
        # Tentar extrair a fonte do título (geralmente formato "Título - Fonte")
        titulo_completo = entrada.get("title", "")
        fonte = "Desconhecida"
        titulo = titulo_completo
        
        if " - " in titulo_completo:
            partes = titulo_completo.rsplit(" - ", 1)
            titulo = partes[0]
            fonte = partes[1]
            
        # Formatando a data
        data_pub = entrada.get("published", "")
        try:
            # Exemplo de data do feed: Wed, 20 May 2026 12:00:00 GMT
            data_struct = entrada.get("published_parsed")
            if data_struct:
                data_formatada = datetime(*data_struct[:6]).strftime("%d/%m/%Y %H:%M")
            else:
                data_formatada = data_pub
        except Exception:
            data_formatada = data_pub
            
        noticias.append({
            "titulo": titulo,
            "link": entrada.get("link", ""),
            "data_publicacao": data_formatada,
            "fonte": fonte,
            "descricao": entrada.get("summary", "").replace("<ol>", "").replace("</ol>", "").replace("<li>", "").replace("</li>", "").strip()
        })
        
    return noticias

if __name__ == "__main__":
    # Teste rápido do buscador
    print("Testando busca por 'aquecimento global'...")
    resultados = buscar_noticias("aquecimento global", 2)
    for i, n in enumerate(resultados, 1):
        print(f"\nNotícia {i}:")
        print(f"Título: {n['titulo']}")
        print(f"Fonte: {n['fonte']}")
        print(f"Data: {n['data_publicacao']}")
        print(f"Link: {n['link']}")
