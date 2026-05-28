import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [term, setTerm] = useState('politica')
  const [limit, setLimit] = useState(3)
  const [themes, setThemes] = useState([])
  const [news, setNews] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [results, setResults] = useState([])
  const [health, setHealth] = useState(null)
  const [loadingNews, setLoadingNews] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [error, setError] = useState('')
  const [showGabarito, setShowGabarito] = useState({})

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [themesResponse, healthResponse] = await Promise.all([
          fetch(`${API_BASE}/themes`),
          fetch(`${API_BASE}/health`),
        ])

        const themesData = await themesResponse.json()
        const healthData = await healthResponse.json()

        setThemes(themesData.themes || [])
        setHealth(healthData)
      } catch (requestError) {
        console.error('Fetch error:', requestError)
        setError('Nao foi possivel conectar ao backend.')
      }
    }

    loadInitialData()
  }, [])

  const selectedNews = useMemo(
    () => news.filter((item) => selectedIds.includes(item.id)),
    [news, selectedIds],
  )

  const handleSearch = async (event) => {
    if (event) event.preventDefault()
    setLoadingNews(true)
    setError('')
    setResults([])

    try {
      const response = await fetch(
        `${API_BASE}/news?term=${encodeURIComponent(term)}&limit=${limit}`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar noticias.')
      }

      setNews(data.news || [])
      setSelectedIds((data.news || []).map((item) => item.id))
    } catch (requestError) {
      setNews([])
      setSelectedIds([])
      setError(requestError.message)
    } finally {
      setLoadingNews(false)
    }
  }

  const handleToggleNews = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  const handleAnalyze = async () => {
    if (!selectedNews.length) {
      setError('Selecione ao menos uma noticia para analisar.')
      return
    }

    setLoadingAnalysis(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news: selectedNews }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao analisar noticias.')
      }

      setResults(data.results || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const toggleGabarito = (index) => {
    setShowGabarito((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  return (
    <div className="app-container">
      {/* Sidebar de Configurações */}
      <aside className="sidebar">
        <div className="logo-section">
          <span className="eyebrow">Agente Inteligente</span>
          <h1>Noticias ENEM</h1>
        </div>

        <div className="status-widget">
          <div className="status-item">
            <span className={`status-dot ${health?.ok ? 'ok' : 'warn'}`} />
            <span>Backend: <strong>{health?.ok ? 'Online' : 'Offline'}</strong></span>
          </div>
          <div className="status-item">
            <span className={`status-dot ${health?.hasGeminiKey ? 'ok' : 'warn'}`} />
            <span>Gemini API: <strong>{health?.hasGeminiKey ? 'Pronta' : 'Pendente'}</strong></span>
          </div>
        </div>

        <div className="search-section">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="form-group">
              <label>Tema de Estudo</label>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Ex: IA, Sustentabilidade..."
              />
            </div>

            <div className="form-group">
              <label>Quantidade de Noticias</label>
              <input
                type="number"
                min="1"
                max="10"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>

            <button type="submit" className="primary-button" disabled={loadingNews}>
              {loadingNews ? 'Buscando...' : 'Buscar Noticias'}
            </button>
          </form>

          <div className="form-group">
            <label>Sugestões de Temas</label>
            <div className="themes-grid">
              {themes.slice(0, 8).map((theme) => (
                <button
                  key={theme}
                  className="theme-chip"
                  onClick={() => {
                    setTerm(theme)
                    // Trigger search immediately if not loading
                    if (!loadingNews) setTimeout(() => handleSearch(), 0)
                  }}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        <div className="content-grid">
          {/* Coluna de Notícias */}
          <section className="section-card">
            <div className="section-header">
              <h2>Noticias Recentes</h2>
              {news.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => setSelectedIds(news.map((n) => n.id))}
                >
                  Selecionar Todas
                </button>
              )}
            </div>

            <div className="news-stack">
              {news.length > 0 ? (
                news.map((item) => (
                  <div
                    key={item.id}
                    className={`news-item ${selectedIds.includes(item.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleNews(item.id)}
                  >
                    <div className="news-content">
                      <h3>{item.titulo}</h3>
                      <p>{item.descricao || 'Sem descrição.'}</p>
                      <div className="news-meta">
                        {item.fonte} • {item.data_publicacao}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  Use a busca ao lado para encontrar fatos atuais.
                </div>
              )}
            </div>

            <button
              className="primary-button"
              style={{ width: '100%' }}
              onClick={handleAnalyze}
              disabled={loadingAnalysis || selectedNews.length === 0}
            >
              {loadingAnalysis
                ? 'Gerando Analise Pedagógica...'
                : `Analisar ${selectedNews.length} Selecionada(s)`}
            </button>
          </section>

          {/* Coluna de Resultados */}
          <section className="section-card">
            <div className="section-header">
              <h2>Analise Pedagógica</h2>
            </div>

            <div className="results-stack">
              {results.length > 0 ? (
                results.map((result, index) => (
                  <div key={index} className="analysis-card">
                    {result.success ? (
                      <>
                        <div className="analysis-header">
                          <span className="eyebrow">Analise #{index + 1}</span>
                          <h3>{result.analysis.noticia_original?.titulo}</h3>
                        </div>
                        <div className="analysis-body">
                          <div className="info-block">
                            <h4>Resumo do Fato</h4>
                            <p>{result.analysis.resumo}</p>
                          </div>

                          <div className="info-block">
                            <h4>Repertório Sociocultural</h4>
                            <p>{result.analysis.repertorio_redacao}</p>
                          </div>

                          <div className="info-block">
                            <h4>Eixos e Conceitos</h4>
                            <div className="tag-cloud">
                              {(result.analysis.eixos_tematicos || []).map((t) => (
                                <span key={t} className="tag">{t}</span>
                              ))}
                              {(result.analysis.conceitos_teoricos || []).map((c) => (
                                <span key={c} className="tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>{c}</span>
                              ))}
                            </div>
                          </div>

                          <div className="quiz-box">
                            <h4>Questão Inédita (Padrão ENEM)</h4>
                            <p style={{ marginTop: '8px', fontWeight: '500' }}>
                              {result.analysis.questao?.enunciado}
                            </p>
                            <ul className="quiz-alternatives">
                              {(result.analysis.questao?.alternativas || []).map((alt) => (
                                <li key={alt}>{alt}</li>
                              ))}
                            </ul>

                            <div className="gabarito-toggle">
                              <button
                                className="text-button"
                                onClick={() => toggleGabarito(index)}
                              >
                                {showGabarito[index] ? 'Ocultar Resolução' : 'Ver Gabarito e Explicação'}
                              </button>
                              {showGabarito[index] && (
                                <div className="gabarito-content">
                                  <strong>Gabarito: {result.analysis.questao?.gabarito}</strong>
                                  <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
                                    {result.analysis.questao?.explicacao}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="error-banner" style={{ margin: '16px' }}>
                        Falha ao analisar: {result.error}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  As analises detalhadas e questões aparecerão aqui após o processamento.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
