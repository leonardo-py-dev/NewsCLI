import urllib.parse
import feedparser
import ssl
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List
import config

class NoticiaBuscada(BaseModel):
    titulo: str = Field(description="Título da notícia.")
    fonte: str = Field(description="Fonte da notícia (ex: G1, Folha de S.Paulo, Estadão, etc.).")
    data_publicacao: str = Field(description="Data de publicação formatada como DD/MM/AAAA HH:mm ou DD/MM/AAAA.")
    link: str = Field(description="URL direta do link da notícia.")
    descricao: str = Field(description="Resumo conciso de 2 a 3 frases da notícia.")

class RespostaBuscaNoticias(BaseModel):
    news: List[NoticiaBuscada] = Field(description="Lista com as notícias mais recentes e relevantes encontradas sobre o tema.")

def buscar_noticias_rss(termo: str, limite: int = 5) -> list:
    """
    Busca notícias no Google News RSS com base em um termo de pesquisa (Método Tradicional/Fallback).
    Retorna uma lista de dicionários contendo os dados da notícia.
    """
    # Criar contexto SSL que ignora verificação (para resolver erro de certificado)
    if not hasattr(ssl, '_create_unverified_context'):
        ssl_context = None
    else:
        ssl_context = ssl._create_unverified_context()

    # Escapar o termo para usar na URL de pesquisa do Google News
    termo_codificado = urllib.parse.quote(termo)
    
    # URL do feed RSS do Google News para o Brasil (pt-BR)
    url_feed = f"https://news.google.com/rss/search?q={termo_codificado}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    
    # Fazer o parsing do feed RSS
    if ssl_context:
        ssl._create_default_https_context = ssl._create_unverified_context
        
    feed = feedparser.parse(url_feed, agent='Mozilla/5.0')
    
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

def buscar_noticias(termo: str, limite: int = 5) -> list:
    """
    Tenta realizar uma busca ativa e profunda de notícias usando o Gemini 2.5 Flash
    com a ferramenta de busca do Google (Google Search Grounding).
    Se falhar ou se a chave de API não estiver configurada, realiza o fallback transparente
    para a busca no Google News RSS tradicional.
    """
    sucesso, _ = config.validar_config()
    if not sucesso:
        # Fallback se a chave não estiver configurada
        return buscar_noticias_rss(termo, limite)

    try:
        from google import genai
        from google.genai import types
        import json

        # Inicializar o cliente oficial da API do Gemini usando a SDK moderna
        client = genai.Client(api_key=config.GEMINI_API_KEY)
        
        today = datetime.now().strftime("%d/%m/%Y")
        prompt = f"""
        Hoje é dia {today}. Realize uma busca ativa e aprofundada na internet por notícias em tempo real, reais, recentes e confiáveis em português sobre o tema: "{termo}".
        Foque em portais de notícias jornalísticos conhecidos no Brasil (como G1, Folha de S.Paulo, Estadão, CNN Brasil, BBC Brasil, etc.).
        Retorne exatamente as {limite} notícias mais relevantes e recentes sobre o assunto.
        """
        
        # Configurar chamada com Grounding da Pesquisa do Google e Saída Estruturada via Pydantic
        generate_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RespostaBuscaNoticias,
            tools=[{"google_search": {}}],
            temperature=0.2,  # Baixa temperatura para manter a fidelidade e precisão dos fatos
        )
        
        response = client.models.generate_content(
            model=config.GEMINI_MODEL,  # 'gemini-2.5-flash' por padrão
            contents=prompt,
            config=generate_config
        )
        
        dados = json.loads(response.text)
        noticias = dados.get("news", [])
        
        resultado = []
        for n in noticias[:limite]:
            resultado.append({
                "titulo": n.get("titulo", ""),
                "fonte": n.get("fonte", ""),
                "data_publicacao": n.get("data_publicacao", ""),
                "link": n.get("link", ""),
                "descricao": n.get("descricao", "")
            })
            
        if resultado:
            return resultado
            
    except Exception as e:
        # Fallback silencioso/informativo caso a cota da API estoure ou ocorra algum erro de rede
        # mantendo a robustez e resiliência da CLI
        pass
        
    return buscar_noticias_rss(termo, limite)

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
