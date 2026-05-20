import re
from datetime import datetime
import config

def slugify(text: str) -> str:
    """Converte uma string em um formato seguro para nome de arquivo."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text)
    return text.strip("_")

def salvar_relatorio_markdown(analise: dict) -> str:
    """
    Recebe os dados da análise estruturada e gera um arquivo Markdown (.md)
    rico, organizado e elegante na pasta de relatórios.
    Retorna o caminho do arquivo criado.
    """
    noticia = analise.get("noticia_original", {})
    titulo_noticia = noticia.get("titulo", "Noticia Sem Titulo")
    fonte = noticia.get("fonte", "Desconhecida")
    data_pub = noticia.get("data_publicacao", "Desconhecida")
    link = noticia.get("link", "#")
    
    # Criar nome único para o arquivo
    data_slug = datetime.now().strftime("%Y%m%d_%H%M%S")
    nome_arquivo = f"enem_{slugify(titulo_noticia)[:50]}_{data_slug}.md"
    caminho_completo = config.REPORTS_DIR / nome_arquivo
    
    # Construção do conteúdo em Markdown
    md_content = []
    
    # Cabeçalho Principal
    md_content.append(f"# 📚 Fato e Repertório: Análise ENEM")
    md_content.append(f"*Relatório gerado automaticamente em: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}*\n")
    md_content.append("---")
    
    # Seção 1: Notícia Original
    md_content.append(f"\n## 📰 Notícia Analisada")
    md_content.append(f"> **Título:** {titulo_noticia}")
    md_content.append(f"> **Fonte:** *{fonte}* | **Publicado em:** {data_pub}")
    md_content.append(f"> **Descrição:** {noticia.get('descricao')}")
    md_content.append(f"> 🔗 [Ler notícia original na fonte]({link})\n")
    
    # Seção 2: Resumo Pedagógico
    md_content.append(f"## 📝 Resumo do Fato")
    md_content.append(f"{analise.get('resumo')}\n")
    md_content.append("---")
    
    # Seção 3: Conexão com a Redação (Repertório)
    md_content.append(f"## ✍️ Aplicação na Redação (Repertório Sociocultural)")
    
    # Eixos temáticos correlacionados
    eixos = ", ".join([f"`{e}`" for e in analise.get("eixos_tematicos", [])])
    md_content.append(f"🎯 **Eixos Temáticos Relacionados:** {eixos}\n")
    
    md_content.append(f"💡 **Como citar na redação:**")
    md_content.append(f"{analise.get('repertorio_redacao')}\n")
    md_content.append("---")
    
    # Seção 4: Provas Objetivas e Conceitos
    md_content.append(f"## 🧬 Aplicação nas Provas Objetivas")
    md_content.append(f"🏫 **Área do Conhecimento:** `{analise.get('area_conhecimento')}`\n")
    
    md_content.append("🧠 **Conceitos Teóricos Associados:**")
    for conceito in analise.get("conceitos_teoricos", []):
        md_content.append(f"- {conceito}")
    md_content.append("\n---")
    
    # Seção 5: Questão Inédita Modelo ENEM
    questao = analise.get("questao", {})
    md_content.append(f"## ✏️ Questão Inédita Modelo ENEM")
    md_content.append(f"**Enunciado:**\n")
    md_content.append(f"{questao.get('enunciado')}\n")
    
    md_content.append(f"**Alternativas:**\n")
    for alt in questao.get("alternativas", []):
        md_content.append(f"- {alt}")
        
    md_content.append(f"\n<details>")
    md_content.append(f"<summary>🔑 CLIQUE AQUI PARA VER O GABARITO E A RESOLUÇÃO</summary>\n")
    md_content.append(f"### Gabarito Correto: **{questao.get('gabarito')}**\n")
    md_content.append(f"#### Resolução Comentada:")
    md_content.append(f"{questao.get('explicacao')}")
    md_content.append(f"\n</details>")
    
    # Escrever no arquivo
    with open(caminho_completo, "w", encoding="utf-8") as f:
        f.write("\n".join(md_content))
        
    return str(caminho_completo)

if __name__ == "__main__":
    # Teste rápido de escrita
    teste_analise = {
        "resumo": "Teste de resumo do fato.",
        "eixos_tematicos": ["Meio Ambiente", "Saúde"],
        "repertorio_redacao": "Zygmunt Bauman e a modernidade líquida explicam como isso afeta as pessoas.",
        "area_conhecimento": "Ciências Humanas e suas Tecnologias",
        "conceitos_teoricos": ["Globalização", "Sustentabilidade"],
        "questao": {
            "enunciado": "Considerando o cenário atual, qual a consequência...",
            "alternativas": ["A) Alt 1", "B) Alt 2", "C) Alt 3", "D) Alt 4", "E) Alt 5"],
            "gabarito": "C",
            "explicacao": "A alternativa C é a única correta porque..."
        },
        "noticia_original": {
            "titulo": "Notícia de Teste do Exportador",
            "fonte": "Teste",
            "data_publicacao": "20/05/2026",
            "descricao": "Uma descrição de teste para validar o funcionamento do exportador de arquivos markdown.",
            "link": "https://google.com"
        }
    }
    path_salvo = salvar_relatorio_markdown(teste_analise)
    print(f"Relatório de teste criado com sucesso em: {path_salvo}")
