import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Garantir import do diretório atual
sys.path.append(str(Path(__file__).resolve().parent))

# Rich para logs estilizados no terminal
from rich.console import Console
from rich.panel import Panel

import config
import buscador
import analisador
import exportador

console = Console()
load_dotenv()

HISTORICO_FILE = config.BASE_DIR / "historico_noticias.json"

def carregar_historico() -> set:
    """Carrega o histórico de URLs de notícias já analisadas."""
    if HISTORICO_FILE.exists():
        try:
            with open(HISTORICO_FILE, "r", encoding="utf-8") as f:
                urls = json.load(f)
                return set(urls)
        except Exception as e:
            console.print(f"[bold red]Aviso: Erro ao carregar histórico ({e}). Criando um novo.[/bold red]")
    return set()

def salvar_historico(urls: set):
    """Salva a lista de URLs analisadas de volta ao arquivo JSON."""
    try:
        with open(HISTORICO_FILE, "w", encoding="utf-8") as f:
            json.dump(list(urls), f, indent=4, ensure_ascii=False)
    except Exception as e:
        console.print(f"[bold red]Erro ao salvar histórico de notícias: {e}[/bold red]")

def executar_rotina_atualizacao():
    """
    Rotina principal: busca notícias para os eixos do ENEM,
    filtra as inéditas e gera os relatórios de estudo pedagógicos.
    """
    console.print(f"\n[bold magenta][{datetime.now().strftime('%H:%M:%S')}] Iniciando varredura agendada de notícias...[/bold magenta]")
    
    sucesso, msg = config.validar_config()
    if not sucesso:
        console.print(f"[bold red]Erro de configuração no agendador: {msg}[/bold red]")
        return
        
    historico = carregar_historico()
    novas_analises_realizadas = 0
    
    # Vamos selecionar uma lista rotativa de temas principais para analisar por ciclo
    # Para evitar estourar limites de API ou criar muitos arquivos de uma vez,
    # analisamos até 3 temas por ciclo, buscando a notícia mais recente de cada um.
    import random
    temas_do_ciclo = random.sample(config.TEMAS_ENEM_PADRAO, 3)
    
    console.print(f"[cyan]Temas selecionados para este ciclo:[/cyan] {', '.join(temas_do_ciclo)}")
    
    for tema in temas_do_ciclo:
        console.print(f"[yellow]Buscando notícias para o tema: '{tema}'...[/yellow]")
        # Busca as 3 mais recentes do tema, mas tentaremos pegar apenas a primeira que for inédita
        noticias = buscador.buscar_noticias(tema, limite=3)
        
        noticia_inedita = None
        for n in noticias:
            if n["link"] not in historico:
                noticia_inedita = n
                break
                
        if not noticia_inedita:
            console.print(f"[dim]Nenhuma notícia nova encontrada para o tema '{tema}'. Pulando.[/dim]")
            continue
            
        console.print(f"[bold green]Nova notícia inédita encontrada![/bold green] '{noticia_inedita['titulo']}'")
        
        try:
            # Solicitar análise do Gemini
            console.print(f"[cyan]Solicitando análise pedagógica ao Gemini...[/cyan]")
            analise = analisador.analisar_noticia_para_enem(noticia_inedita)
            
            # Exportar relatório em Markdown
            caminho_salvo = exportador.salvar_relatorio_markdown(analise)
            console.print(f"[bold green]✓ Relatório gerado com sucesso em:[/bold green] {caminho_salvo}")
            
            # Adicionar ao histórico e salvar imediatamente
            historico.add(noticia_inedita["link"])
            salvar_historico(historico)
            
            novas_analises_realizadas += 1
            
            # Aguardar um breve intervalo entre chamadas do Gemini para evitar rate limit
            time.sleep(2)
            
        except Exception as e:
            console.print(f"[bold red]Erro ao processar notícia '{noticia_inedita['titulo']}': {e}[/bold red]")
            
    console.print(f"[bold green][{datetime.now().strftime('%H:%M:%S')}] Ciclo de varredura concluído. Novas análises geradas: {novas_analises_realizadas}[/bold green]\n")

def main():
    parser = argparse.ArgumentParser(description="Agendador de automação de notícias do ENEM.")
    parser.add_argument("--once", action="store_true", help="Executa a varredura apenas uma vez e sai. Ideal para agendadores externos como o Agendador de Tarefas do Windows.")
    parser.add_argument("--intervalo", type=int, default=6, help="Intervalo de execução em horas para o modo contínuo (padrão: 6 horas).")
    args = parser.parse_args()
    
    console.print(Panel(
        "[bold white]MODO AGENDADOR AUTOMÁTICO (24/7)[/bold white]\n\n"
        "Este script busca novos fatos e os analisa automaticamente.\n"
        "Ideal para ser executado no servidor ou configurado no Agendador de Tarefas do Windows.",
        title="[bold magenta]Agendador de Notícias ENEM[/bold magenta]",
        border_style="magenta"
    ))
    
    if args.once:
        console.print("[cyan]Execução em modo único (--once). Rodando rotina agora...[/cyan]")
        executar_rotina_atualizacao()
        console.print("[cyan]Rotina concluída. Encerrando processo.[/cyan]")
    else:
        intervalo_segundos = args.intervalo * 3600
        console.print(f"[green]Modo Contínuo Ativado. O script rodará a cada {args.intervalo} hora(s) em segundo plano.[/green]")
        console.print("[dim]Para encerrar, pressione CTRL+C.[/dim]")
        
        # Executar a primeira vez imediatamente
        executar_rotina_atualizacao()
        
        try:
            while True:
                console.print(f"[dim][{datetime.now().strftime('%H:%M:%S')}] Aguardando {args.intervalo} horas para o próximo ciclo...[/dim]")
                time.sleep(intervalo_segundos)
                executar_rotina_atualizacao()
        except KeyboardInterrupt:
            console.print("\n[bold red]Agendador interrompido pelo usuário. Encerrando...[/bold red]")

if __name__ == "__main__":
    main()
