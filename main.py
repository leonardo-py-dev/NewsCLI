import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Garantir import do diretório atual
sys.path.append(str(Path(__file__).resolve().parent))

# Importar bibliotecas do Rich
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.table import Table
from rich.prompt import Prompt, IntPrompt
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.align import Align

import config
import buscador
import analisador
import exportador

console = Console()

def exibir_banner():
    """Exibe um banner visualmente incrível no terminal."""
    banner_text = Text("\n🎓 AGENTE NOTÍCIAS ENEM 🎓\n", style="bold white on blue", justify="center")
    sub_text = Text("Sua Automação Inteligente de Atualidades para Redação e Questões do ENEM\n", style="bold cyan", justify="center")
    
    panel = Panel(
        Align.center(Text.assemble(banner_text, "\n", sub_text)),
        border_style="blue",
        expand=True,
        title="[bold yellow]Antigravity System[/bold yellow]",
        subtitle="[bold green]v1.0.0[/bold green]"
    )
    console.print(panel)

def verificar_api_key():
    """Verifica e guia o usuário caso a chave de API não esteja configurada."""
    sucesso, _ = config.validar_config()
    if not sucesso:
        console.print(Panel(
            "[bold red]ERRO: GEMINI_API_KEY não configurada![/bold red]\n\n"
            "Para que esta automação funcione, você precisa de uma chave de API do Gemini.\n"
            "1. Acesse [link=https://aistudio.google.com/]Google AI Studio[/link] e obtenha sua chave gratuita.\n"
            "2. Crie um arquivo chamado [bold yellow].env[/bold yellow] na pasta deste projeto.\n"
            "3. Adicione a linha: [bold green]GEMINI_API_KEY=sua_chave_aqui[/bold green]\n\n"
            "A automação foi interrompida até que a chave seja configurada.",
            title="[bold red]Configuração Pendente[/bold red]",
            border_style="red"
        ))
        
        # Criar arquivo .env automaticamente se o usuário quiser digitar a chave agora
        resposta = Prompt.ask("\nDeseja inserir sua chave de API agora mesmo?", choices=["S", "N"], default="S")
        if resposta == "S":
            key = Prompt.ask("Digite ou cole sua GEMINI_API_KEY")
            if key.strip():
                with open(config.BASE_DIR / ".env", "w") as f:
                    f.write(f"GEMINI_API_KEY={key.strip()}\n")
                console.print("[bold green]Sucesso! Arquivo .env criado e chave salva. Recarregando...[/bold green]\n")
                load_dotenv(override=True)
                # Recarregar chave de API no módulo de configuração
                config.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
                return True
        return False
    return True

def exibir_analise_tela(analise: dict, arquivo_salvo: str):
    """Renderiza a análise de forma bonita e estruturada no console usando Rich."""
    noticia = analise["noticia_original"]
    
    # 1. Painel da Notícia
    console.print(Panel(
        f"[bold blue]Título:[/bold blue] {noticia['titulo']}\n"
        f"[bold blue]Fonte:[/bold blue] {noticia['fonte']} | [bold blue]Data:[/bold blue] {noticia['data_publicacao']}\n"
        f"[bold blue]Link:[/bold blue] [link={noticia['link']}]{noticia['link']}[/link]",
        title="[bold cyan]📰 Notícia Analisada[/bold cyan]",
        border_style="cyan"
    ))
    
    # 2. Painel do Resumo
    console.print(Panel(
        analise["resumo"],
        title="[bold yellow]📝 Resumo do Fato[/bold yellow]",
        border_style="yellow"
    ))
    
    # 3. Painel da Redação
    eixos = ", ".join([f"[bold magenta]{e}[/bold magenta]" for e in analise["eixos_tematicos"]])
    console.print(Panel(
        f"[bold]🎯 Eixos Temáticos:[/bold] {eixos}\n\n"
        f"[bold green]💡 Como aplicar na Redação (Repertório Sociocultural):[/bold green]\n"
        f"{analise['repertorio_redacao']}",
        title="[bold magenta]✍️ Aplicação na Redação[/bold magenta]",
        border_style="magenta"
    ))
    
    # 4. Painel das Provas Objetivas
    conceitos = "\n".join([f"• {c}" for c in analise["conceitos_teoricos"]])
    console.print(Panel(
        f"[bold]🏫 Área do Conhecimento principal:[/bold] [bold cyan]{analise['area_conhecimento']}[/bold cyan]\n\n"
        f"[bold green]🧠 Conceitos Acadêmicos Associados:[/bold green]\n"
        f"{conceitos}",
        title="[bold green]🧬 Provas Objetivas[/bold green]",
        border_style="green"
    ))
    
    # 5. Painel da Questão Inédita
    questao = analise["questao"]
    alts = "\n".join(questao["alternativas"])
    console.print(Panel(
        f"[bold]Enunciado:[/bold]\n{questao['enunciado']}\n\n"
        f"[bold yellow]Alternativas:[/bold yellow]\n{alts}\n\n"
        f"[bold green]🔑 Gabarito:[/bold green] [bold white on green] {questao['gabarito']} [/bold white on green]\n\n"
        f"[bold blue]💡 Resolução Comentada:[/bold blue]\n{questao['explicacao']}",
        title="[bold red]✏️ Questão Inédita Padrão ENEM[/bold red]",
        border_style="red"
    ))
    
    # 6. Painel de Sucesso da Exportação
    console.print(Panel(
        f"[bold green]✓[/bold green] Relatório em Markdown gerado com sucesso!\n"
        f"[bold white]Salvo em:[/bold white] [bold cyan]{arquivo_salvo}[/bold cyan]\n"
        f"[bold dim]Abra este arquivo em qualquer leitor de Markdown para estudar mais tarde.[/bold dim]",
        border_style="green"
    ))
    console.print("\n" + "="*80 + "\n")

def main():
    exibir_banner()
    
    if not verificar_api_key():
        return
        
    console.print("[bold yellow]Iniciando sistema...[/bold yellow]")
    
    # Pergunta o termo de pesquisa
    termo = Prompt.ask("\n🔍 O que você deseja pesquisar nas notícias hoje? (Ex: inteligência artificial, transição energética)")
    limite = IntPrompt.ask("📰 Quantas notícias deseja analisar? (Máximo recomendado: 5)", default=3)
    
    # Etapa 1: Busca
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True
    ) as progress:
        progress.add_task(description=f"Buscando notícias sobre '{termo}' no Google News RSS...", total=None)
        noticias = buscador.buscar_noticias(termo, limite=limite)
        
    if not noticias:
        console.print(f"[bold red]Nenhuma notícia recente foi encontrada para o termo '{termo}'. Tente outra palavra-chave.[/bold red]")
        return
        
    # Exibir tabela de notícias encontradas
    tabela = Table(title=f"Notícias recentes encontradas sobre: {termo}", show_lines=True)
    tabela.add_column("Nº", style="cyan", justify="center")
    tabela.add_column("Título", style="bold white", width=50)
    tabela.add_column("Fonte", style="green")
    tabela.add_column("Data", style="magenta")
    
    for i, n in enumerate(noticias, 1):
        tabela.add_row(str(i), n["titulo"], n["fonte"], n["data_publicacao"])
        
    console.print(tabela)
    
    # Perguntar se deseja analisar todas ou uma específica
    opcao = Prompt.ask(
        "\nEscolha o que deseja fazer",
        choices=["A", "T"] + [str(i) for i in range(1, len(noticias)+1)],
        default="A"
    )
    # A = Analisar Todas, T = Terminar
    
    if opcao == "T":
        console.print("[bold yellow]Processo encerrado pelo usuário.[/bold yellow]")
        return
        
    noticias_para_analisar = []
    if opcao == "A":
        noticias_para_analisar = noticias
    else:
        noticias_para_analisar = [noticias[int(opcao) - 1]]
        
    console.print(f"\n[bold yellow]Iniciando a análise de {len(noticias_para_analisar)} notícia(s) com o Gemini...[/bold yellow]\n")
    
    # Processar cada notícia
    for idx, noticia in enumerate(noticias_para_analisar, 1):
        console.print(Panel(f"Processando ({idx}/{len(noticias_para_analisar)}): {noticia['titulo']}", style="bold white on blue"))
        
        analise = None
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True
        ) as progress:
            progress.add_task(description="Gemini elaborando resumo, repertório redação e questão modelo ENEM...", total=None)
            try:
                analise = analisador.analisar_noticia_para_enem(noticia)
            except Exception as e:
                console.print(f"[bold red]Erro ao analisar notícia: {e}[/bold red]\nPulando para a próxima...")
                continue
                
        if analise:
            # Salvar no arquivo markdown
            caminho_salvo = exportador.salvar_relatorio_markdown(analise)
            # Exibir na tela formatado com Rich
            exibir_analise_tela(analise, caminho_salvo)
            
    console.print("[bold green]🎉 Processamento concluído de todas as notícias! Os relatórios estão prontos para estudo.[/bold green]\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[bold red]Execução cancelada pelo usuário.[/bold red]\n")
