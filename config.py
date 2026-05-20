import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Caminhos do Projeto
BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "relatorios"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# API Key do Gemini
# Pode ser definida no arquivo .env como GEMINI_API_KEY ou pego diretamente do ambiente
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configurações do Gemini
GEMINI_MODEL = "gemini-2.5-flash"

# Eixos temáticos principais do ENEM para a automação automática
TEMAS_ENEM_PADRAO = [
    "sustentabilidade e meio ambiente",
    "desigualdade social e pobreza",
    "saude publica no brasil",
    "tecnologia e inclusao digital",
    "educacao e analfabetismo",
    "seguranca publica e violencia",
    "mobilidade urbana",
    "crise energetica e transicao energetica",
    "demografia e envelhecimento da populacao",
    "cultura e valorizacao de minorias"
]

def validar_config():
    """Valida se as configurações básicas e chaves estão corretas."""
    if not GEMINI_API_KEY:
        return False, "GEMINI_API_KEY não encontrada no arquivo .env ou no sistema."
    return True, "Configuração válida."
