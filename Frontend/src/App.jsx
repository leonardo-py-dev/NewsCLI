import { useEffect, useMemo, useState } from 'react'
import { 
  Search, 
  Filter, 
  Bookmark, 
  BookmarkCheck, 
  BarChart3, 
  ArrowLeftRight, 
  FileText, 
  Trash2,
  Calendar,
  Globe,
  Tag
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [term, setTerm] = useState('politica')
  const [limit, setLimit] = useState(5)
  const [themes, setThemes] = useState([])
  const [news, setNews] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [results, setResults] = useState([])
  const [health, setHealth] = useState(null)
  const [loadingNews, setLoadingNews] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [error, setError] = useState('')
  const [showGabarito, setShowGabarito] = useState({})
  
  // Novas funcionalidades
  const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem('bookmarks') || '[]'))
  const [annotations, setAnnotations] = useState(() => JSON.parse(localStorage.getItem('annotations') || '{}'))
  const [filterSource, setFilterSource] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [activeTab, setActiveTab] = useState('search') // 'search', 'bookmarks', 'trends', 'compare'
  const [compareIds, setCompareIds] = useState([])

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  useEffect(() => {
    localStorage.setItem('annotations', JSON.stringify(annotations))
  }, [annotations])

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

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const matchSource = filterSource ? item.fonte.toLowerCase().includes(filterSource.toLowerCase()) : true
      const matchDate = filterDate ? item.data_publicacao.includes(filterDate) : true
      return matchSource && matchDate
    })
  }, [news, filterSource, filterDate])

  const sources = useMemo(() => {
    const set = new Set(news.map(n => n.fonte))
    return Array.from(set)
  }, [news])

  const trendData = useMemo(() => {
    const counts = {}
    // Analisa temas nos resultados e nas noticias
    results.forEach(res => {
      if (res.success) {
        res.analysis.eixos_tematicos.forEach(tema => {
          counts[tema] = (counts[tema] || 0) + 1
        })
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [results])

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
    const newsToAnalyze = activeTab === 'bookmarks' 
      ? bookmarks.filter(n => selectedIds.includes(n.id))
      : news.filter(n => selectedIds.includes(n.id))

    if (!newsToAnalyze.length) {
      setError('Selecione ao menos uma noticia para analisar.')
      return
    }

    setLoadingAnalysis(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news: newsToAnalyze }),
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

  const toggleBookmark = (item) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.id === item.id)
      if (exists) return prev.filter(b => b.id !== item.id)
      return [...prev, item]
    })
  }

  const updateAnnotation = (id, text) => {
    setAnnotations(prev => ({ ...prev, [id]: text }))
  }

  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const newsToDisplay = activeTab === 'bookmarks' ? bookmarks : filteredNews

  return (
    <div className="app-container">
      {/* Sidebar de Navegação */}
      <aside className="sidebar">
        <div className="logo-section">
          <span className="eyebrow">Agente Inteligente</span>
          <h1>NewsCLI Pro</h1>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={20} />
            <span>Busca Ativa</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <Bookmark size={20} />
            <span>Salvos ({bookmarks.length})</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <BarChart3 size={20} />
            <span>Tendências</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <ArrowLeftRight size={20} />
            <span>Comparar</span>
          </button>
        </nav>

        <div className="status-widget">
          <div className="status-item">
            <span className={`status-dot ${health?.ok ? 'ok' : 'warn'}`} />
            <span>Backend: <strong>{health?.ok ? 'Online' : 'Offline'}</strong></span>
          </div>
        </div>

        {activeTab === 'search' && (
          <div className="search-section">
            <form className="search-form" onSubmit={handleSearch}>
              <div className="form-group">
                <label>Tema de Estudo</label>
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Ex: IA na Educação..."
                />
              </div>

              <div className="form-group">
                <label>Notícias (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="primary-button" disabled={loadingNews}>
                {loadingNews ? 'Pesquisando...' : 'Buscar Agora'}
              </button>
            </form>

            <div className="themes-section">
              <label>Sugestões</label>
              <div className="themes-grid">
                {themes.slice(0, 6).map((t) => (
                  <button key={t} className="theme-chip" onClick={() => setTerm(t)}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Conteúdo Principal */}
      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        {activeTab === 'trends' ? (
          <div className="trends-view">
            <section className="section-card">
              <h2>Tendências de Temas no ENEM</h2>
              <p>Visualização baseada nos eixos temáticos das notícias analisadas nesta sessão.</p>
              <div className="chart-container" style={{ height: 400, marginTop: 20 }}>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                        {trendData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--primary-hue), 70%, ${40 + index * 10}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">Analise algumas notícias para ver o gráfico de tendências.</div>
                )}
              </div>
            </section>
          </div>
        ) : activeTab === 'compare' ? (
          <div className="compare-view">
            <section className="section-card">
              <div className="section-header">
                <h2>Comparador de Notícias</h2>
                <p>Selecione duas notícias abaixo para comparar seus pontos de vista.</p>
              </div>
              
              <div className="compare-grid">
                {[0, 1].map(idx => {
                  const newsItem = bookmarks.find(b => b.id === compareIds[idx]) || news.find(n => n.id === compareIds[idx])
                  return (
                    <div key={idx} className="compare-column">
                      {newsItem ? (
                        <div className="news-item selected">
                          <h3>{newsItem.titulo}</h3>
                          <p>{newsItem.descricao}</p>
                          <div className="news-meta">{newsItem.fonte} • {newsItem.data_publicacao}</div>
                          <button className="text-button" onClick={() => toggleCompare(newsItem.id)}>Remover</button>
                        </div>
                      ) : (
                        <div className="empty-slot">Selecione uma notícia</div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {compareIds.length === 2 && (
                <div className="comparison-actions">
                  <button className="primary-button">Gerar Quadro Comparativo (IA)</button>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="content-grid">
            {/* Lista de Notícias */}
            <section className="section-card">
              <div className="section-header">
                <div className="header-title">
                  <h2>{activeTab === 'bookmarks' ? 'Notícias Salvas' : 'Resultados da Busca'}</h2>
                  <span className="count-badge">{newsToDisplay.length}</span>
                </div>
                {activeTab === 'search' && (
                  <div className="filters-bar">
                    <div className="filter-item">
                      <Globe size={14} />
                      <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                        <option value="">Todas as Fontes</option>
                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="news-stack">
                {newsToDisplay.length > 0 ? (
                  newsToDisplay.map((item) => (
                    <div
                      key={item.id}
                      className={`news-item ${selectedIds.includes(item.id) ? 'selected' : ''}`}
                    >
                      <div className="news-actions-top">
                        <button 
                          className={`icon-button ${bookmarks.some(b => b.id === item.id) ? 'active' : ''}`}
                          onClick={() => toggleBookmark(item)}
                          title="Salvar"
                        >
                          {bookmarks.some(b => b.id === item.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                        </button>
                        <button 
                          className={`icon-button ${compareIds.includes(item.id) ? 'active' : ''}`}
                          onClick={() => toggleCompare(item.id)}
                          title="Comparar"
                        >
                          <ArrowLeftRight size={18} />
                        </button>
                      </div>
                      
                      <div className="news-content" onClick={() => handleToggleNews(item.id)}>
                        <h3>{item.titulo}</h3>
                        <p>{item.descricao}</p>
                        <div className="news-meta">
                          <span>{item.fonte}</span>
                          <span>{item.data_publicacao}</span>
                        </div>
                      </div>

                      <div className="news-annotations">
                        <div className="annotation-header">
                          <FileText size={14} />
                          <span>Anotações Pessoais</span>
                        </div>
                        <textarea 
                          placeholder="Clique para adicionar sua análise sobre este fato..."
                          value={annotations[item.id] || ''}
                          onChange={(e) => updateAnnotation(item.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    {activeTab === 'bookmarks' ? 'Você ainda não salvou nenhuma notícia.' : 'Nenhum resultado encontrado.'}
                  </div>
                )}
              </div>

              {newsToDisplay.length > 0 && (
                <button
                  className="primary-button"
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={handleAnalyze}
                  disabled={loadingAnalysis || selectedIds.length === 0}
                >
                  {loadingAnalysis ? 'IA Processando...' : `Analisar ${selectedIds.length} Itens`}
                </button>
              )}
            </section>

            {/* Resultados da Análise */}
            <section className="section-card">
              <div className="section-header">
                <h2>Análise Pedagógica</h2>
              </div>
              <div className="results-stack">
                {results.map((result, index) => (
                  <div key={index} className="analysis-card">
                    {result.success ? (
                      <div className="analysis-content">
                        <div className="analysis-tag">#{index + 1} • {result.analysis.area_conhecimento}</div>
                        <h3>{result.analysis.noticia_original?.titulo}</h3>
                        
                        <div className="info-grid">
                          <div className="info-box">
                            <label>Resumo</label>
                            <p>{result.analysis.resumo}</p>
                          </div>
                          <div className="info-box">
                            <label>Repertório para Redação</label>
                            <p>{result.analysis.repertorio_redacao}</p>
                          </div>
                        </div>

                        <div className="tags-container">
                          {result.analysis.eixos_tematicos.map(t => <span key={t} className="tag theme">{t}</span>)}
                          {result.analysis.conceitos_teoricos.map(c => <span key={c} className="tag concept">{c}</span>)}
                        </div>

                        <div className="quiz-section">
                          <h4>Desafio ENEM</h4>
                          <p className="enunciado">{result.analysis.questao.enunciado}</p>
                          <div className="alternatives">
                            {result.analysis.questao.alternativas.map(alt => (
                              <div key={alt} className="alt-item">{alt}</div>
                            ))}
                          </div>
                          <button className="text-button" onClick={() => setShowGabarito(prev => ({...prev, [index]: !prev[index]}))}>
                            {showGabarito[index] ? 'Ocultar Resposta' : 'Ver Gabarito'}
                          </button>
                          {showGabarito[index] && (
                            <div className="gabarito-reveal">
                              <strong>Gabarito: {result.analysis.questao.gabarito}</strong>
                              <p>{result.analysis.questao.explicacao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="error-card">Erro: {result.error}</div>
                    )}
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="empty-state">As análises detalhadas aparecerão aqui.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
