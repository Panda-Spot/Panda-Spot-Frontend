import { Routes, Route, NavLink } from 'react-router-dom'
import Albums from './pages/Albums.jsx'
import AlbumDetail from './pages/AlbumDetail.jsx'
import Search from './pages/Search.jsx'
import './app.css'

function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">AI-Backend <span>face search</span></div>
        <nav>
          <NavLink to="/" end>Albums</NavLink>
          <NavLink to="/search">Search</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Albums />} />
          <Route path="/albums/:albumId" element={<AlbumDetail />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
