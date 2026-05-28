import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List
import config

# Definição do Schema para Garantia de Estrutura do Gemini (Structured Output)

class QuestaoEnem(BaseModel):
    enunciado: str = Field(description="Enunciado contextualizado e completo no estilo do ENEM com base na notícia.")
    alternativas: List[str] = Field(description="Lista contendo exatamente 5 alternativas (A, B, C, D e E), formatadas como ['A) ...', 'B) ...', 'C) ...', 'D) ...', 'E) ...'].")
    gabarito: str = Field(description="Somente a letra correspondente à alternativa correta (A, B, C, D ou E).")
    explicacao: str = Field(description="Explicação pedagógica detalhada comentando o porquê da alternativa correta estar certa e por que as outras alternativas estão incorretas.")

class AnaliseEnem(BaseModel):
    resumo: str = Field(description="Resumo conciso e informativo dos principais pontos e fatos relatados na notícia.")
    eixos_tematicos: List[str] = Field(description="Lista de eixos temáticos gerais da redação do ENEM correlacionados com o assunto (ex: Meio Ambiente, Direitos Humanos, Tecnologia e Sociedade, Saúde Pública, Cidadania).")
    repertorio_redacao: str = Field(description="Orientação de como citar esta notícia de forma produtiva na redação do ENEM. Explique o uso prático como repertório sociocultural e faça conexões ricas com teorias sociológicas, filosóficas, fatos históricos ou conceitos clássicos (ex: Zygmunt Bauman, Michel Foucault, Revolução Industrial, Cidadão de Papel de Gilberto Dimenstein).")
    area_conhecimento: str = Field(description="A principal Área do Conhecimento do ENEM relacionada (Linguagens, Códigos e suas Tecnologias; Ciências Humanas e suas Tecnologias; Ciências da Natureza e suas Tecnologias; Matemática e suas Tecnologias).")
    conceitos_teoricos: List[str] = Field(description="Lista de conceitos acadêmicos específicos cobrados no ENEM que estão associados ao tema da notícia (ex: Urbanização, Globalização, Cadeia Alimentar, Termodinâmica, Funções de Linguagem, Geopolítica).")
    questao: QuestaoEnem = Field(description="Uma questão inédita baseada no tema da notícia, simulando fielmente o grau de complexidade e o modelo de competências/habilidades do ENEM.")

def analisar_noticia_para_enem(noticia: dict) -> dict:
    """
    Usa o Gemini 2.5-flash com Saída Estruturada para analisar
    uma notícia sob a ótica das exigências do ENEM.
    """
    sucesso, msg = config.validar_config()
    if not sucesso:
        raise ValueError(msg)
        
    # Inicializar o cliente oficial da API do Gemini
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    
    # Criar o prompt detalhado para o professor-IA
    prompt = f"""
    Você é um professor renomado do Ensino Médio e especialista na banca elaboradora das provas do ENEM (Exame Nacional do Ensino Médio).
    Sua tarefa é analisar a notícia a seguir e fornecer uma análise pedagógica aprofundada de alta qualidade, focada em como este tema pode ser cobrado nas provas objetivas e na redação do ENEM.
    
    DADOS DA NOTÍCIA:
    - Título: {noticia.get('titulo')}
    - Fonte: {noticia.get('fonte')}
    - Data: {noticia.get('data_publicacao')}
    - Descrição/Trecho: {noticia.get('descricao')}
    - Link original: {noticia.get('link')}
    
    INSTRUÇÕES IMPORTANTES:
    1. A questão deve ser inédita, criativa e fiel ao estilo ENEM, cobrando interpretação aliada a conceitos teóricos reais.
    2. Evite respostas genéricas. Faça conexões teóricas profundas (ex: sociólogos, filósofos, fatos históricos, leis brasileiras ou conceitos de biologia/física/química).
    3. As 5 alternativas da questão devem ser plausíveis, mas com apenas uma inequivocamente correta.
    """
    
    # Configurar a chamada para garantir o retorno estruturado no formato JSON/Pydantic
    generate_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=AnaliseEnem,
        temperature=0.3,  # Temperatura mais baixa para garantir foco e fidelidade científica/pedagógica
    )
    
    # Executar a chamada
    response = client.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=prompt,
        config=generate_config
    )
    
    # Fazer o parsing do JSON retornado pelo Gemini
    try:
        dados_analise = json.loads(response.text)
        # Adicionar metadados da notícia original na resposta
        dados_analise["noticia_original"] = noticia
        return dados_analise
    except Exception as e:
        raise RuntimeError(f"Erro ao parsear a resposta estruturada do Gemini: {e}\nRetorno bruto: {response.text}")

if __name__ == "__main__":
    # Teste rápido se a chave estiver configurada
    import os
    if os.getenv("GEMINI_API_KEY"):
        print("Chave de API detectada. Testando análise...")
        teste_noticia = {
            "titulo": "Brasil bate recorde de geração de energia solar em 2026",
            "fonte": "G1",
            "data_publicacao": "20/05/2026",
            "descricao": "A capacidade instalada de energia solar fotovoltaica atingiu marcas históricas, impulsionada por novos parques solares no Nordeste e geração distribuída residencial.",
            "link": "https://g1.globo.com"
        }
        try:
            resultado = analisar_noticia_para_enem(teste_noticia)
            print("\nResumo da Análise:")
            print(json.dumps(resultado, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Erro no teste: {e}")
    else:
        print("GEMINI_API_KEY não configurada no ambiente. Teste ignorado.")
