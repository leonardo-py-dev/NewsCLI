# NewsCLI Pro - Sistema de Análise de Notícias para o ENEM

O **NewsCLI Pro** é uma plataforma inteligente projetada para auxiliar estudantes na preparação para o ENEM. O sistema realiza buscas ativas na internet por notícias recentes, utiliza o modelo **Google Gemini** para realizar análises pedagógicas profundas e oferece ferramentas interativas para organização de estudos.

## 🚀 Funcionalidades

- **Busca Ativa com IA**: Utiliza a ferramenta `googleSearch` do Gemini para encontrar fatos reais e recentes em tempo real.
- **Análise Pedagógica**: Gera resumos, eixos temáticos, repertórios socioculturais e questões inéditas no padrão ENEM para cada notícia.
- **Sistema de Favoritos**: Salve notícias importantes para revisar mais tarde.
- **Anotações Pessoais**: Registre suas próprias reflexões e análises sobre cada fato diretamente na plataforma.
- **Gráficos de Tendências**: Visualize quais temas estão em alta através de gráficos interativos (Recharts).
- **Comparador de Notícias**: Analise dois fatos lado a lado para entender diferentes perspectivas.
- **Cache Inteligente**: Otimização de performance e redução de custos com cache local no backend.

## 🛠️ Tecnologias

### Frontend
- **React 19** + **Vite**
- **Lucide React** (Ícones)
- **Recharts** (Gráficos)
- **CSS3** (Design Moderno e Responsivo)

### Backend
- **Node.js** + **Express**
- **Google Generative AI SDK** (Gemini API)
- **Node-Cache** (Sistema de Cache)
- **RSS Parser** (Fallback de notícias)

## 📦 Como Instalar e Rodar

### Pré-requisitos
- Node.js instalado
- Uma API Key do [Google AI Studio](https://aistudio.google.com/)

### 1. Configuração do Backend
1. Entre na pasta `Backend`:
   ```bash
   cd Backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` com sua chave:
   ```env
   PORT=3001
   GEMINI_API_KEY=SUA_CHAVE_AQUI
   GEMINI_MODEL=gemini-1.5-flash
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```

### 2. Configuração do Frontend
1. Entre na pasta `Frontend`:
   ```bash
   cd Frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie a aplicação:
   ```bash
   npm run dev
   ```

## 📄 Licença

Este projeto está sob a licença ISC.
