const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const flatCache = require('flat-cache');
const path = require('path');
const fs = require('fs');

const app = express();

const cacheDir = path.join(__dirname, '.cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

const movieCache = flatCache.create({ cacheId: 'movie_data', storageLocation: cacheDir });
const PORT = 3000;
const SITE_PASSWORD = 'kinositeimba'; 
const TMDB_KEY = 'ваш ключ tmdb';
const J_URL = 'http://127.0.0.1:9117'; 
const J_KEY = 'api jacket ключ';

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'quantomix-pc-hybrid-v17',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

const getPoster = (p) => p ? '/proxy-img?url=' + p : 'https://via.placeholder.com/500x750?text=No+Poster';

app.get('/proxy-img', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).send('No URL');
    try {
        const response = await axios({ url: 'https://image.tmdb.org/t/p/w500' + url, method: 'GET', responseType: 'stream' });
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (e) { res.status(404).send('Not Found'); }
});

const checkAuth = (req, res, next) => {
    if (req.session.authorized) return next();
    res.send('<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#050505;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><form method="POST" action="/login" style="background:#111;padding:30px;border-radius:15px;text-align:center;width:340px;border:1px solid #222;"><h2>KINO.QUANTOMIX</h2><input type="password" name="password" style="width:100%;padding:12px;margin-bottom:20px;background:#000;border:1px solid #333;color:#fff;border-radius:5px;" autofocus required><button type="submit" style="width:100%;padding:12px;background:#e50914;color:#fff;border:none;border-radius:5px;font-weight:bold;cursor:pointer;">ВОЙТИ</button></form></body></html>');
};

app.post('/login', (req, res) => {
    if (req.body.password === SITE_PASSWORD) { req.session.authorized = true; res.redirect('/'); }
    else { res.send('<script>alert("Error"); window.location.href="/";</script>'); }
});

app.get('/api/dl', checkAuth, async (req, res) => {
    let target = req.query.url;
    if (!target) return res.status(400).send('No URL');
    if (target.includes('127.0.0.1')) target = target.replace(/http:\/\/127\.0\.0\.1:9117/g, J_URL);
    if (target.startsWith('magnet:')) return res.redirect(target);
    try {
        const response = await axios({ url: target, method: 'GET', responseType: 'stream', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', 'application/x-bittorrent');
        response.data.pipe(res);
    } catch (e) { res.redirect(target); }
});

app.get('/', checkAuth, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KINO.QUANTOMIX</title>
    <style>
        :root { --bg: #080808; --card-bg: #121212; --text: #eee; --accent: #e50914; --border: rgba(255,255,255,0.1); --sidebar: #000; --header: rgba(0,0,0,0.85); }
        body.light-mode { --bg: #f5f5f7; --card-bg: #fff; --text: #1d1d1f; --border: rgba(0,0,0,0.1); --sidebar: #fff; --header: rgba(255,255,255,0.8); }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }
        .header { position: fixed; top: 0; width: 100%; height: 70px; background: var(--header); backdrop-filter: blur(25px); display: flex; align-items: center; padding: 0 30px; border-bottom: 1px solid var(--border); z-index: 1000; justify-content: space-between; }
        .logo { font-weight: 900; color: var(--accent); font-size: 1.4rem; cursor: pointer; letter-spacing: 2px; }
        .theme-toggle { cursor: pointer; padding: 8px; border-radius: 50%; border: 1px solid var(--border); background: var(--card-bg); color: var(--text); font-size: 1.2rem; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; margin-left: 15px; }
        .mode-tabs { display: flex; gap: 25px; margin-left: 40px; }
        .mode-tab { color: #888; cursor: pointer; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; transition: 0.3s; position: relative; padding: 10px 0; }
        .mode-tab.active { color: var(--text); }
        .mode-tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: var(--accent); border-radius: 2px; }
        .search-bar { width: 280px; padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text); outline: none; }
        .container { display: flex; margin-top: 70px; }
        .sidebar { width: 240px; background: var(--sidebar); padding: 25px 15px; border-right: 1px solid var(--border); position: fixed; height: calc(100vh - 70px); overflow-y: auto; z-index: 100; }
        .nav-item { padding: 12px 15px; color: #888; cursor: pointer; border-radius: 8px; margin-bottom: 5px; font-size: 0.85rem; font-weight: 500; }
        .nav-item.active { background: var(--accent); color: #fff; font-weight: 700; }
        .main-content { flex: 1; margin-left: 240px; padding: 30px; min-height: 100vh; }
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 30px; }
        .movie-card { background: var(--card-bg); border-radius: 15px; overflow: hidden; border: 1px solid var(--border); cursor: pointer; transition: 0.3s; position: relative; }
        .movie-card:hover { transform: translateY(-8px); border-color: var(--accent); }
        .movie-card img { width: 100%; aspect-ratio: 2/3; object-fit: cover; }
        .movie-card .title { padding: 15px; font-size: 0.9rem; font-weight: 700; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rating-badge { position: absolute; top: 12px; right: 12px; padding: 5px 10px; border-radius: 8px; font-weight: 900; background: var(--accent); color: #fff; font-size: 0.8rem; }
        .global-list { max-width: 1000px; margin: 0 auto; display: none; flex-direction: column; gap: 15px; }
        .global-item { background: var(--card-bg); padding: 25px; border-radius: 15px; border: 1px solid var(--border); }
        .tag { font-size: 0.65rem; padding: 4px 10px; border-radius: 6px; background: rgba(128,128,128,0.1); color: #888; font-weight: 800; margin-right: 8px; border: 1px solid var(--border); text-transform: uppercase; }
        .tag.quality { color: var(--accent); border-color: var(--accent); }
        .modal { display: none; position: fixed; inset: 0; z-index: 2000; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,0.9); backdrop-filter: blur(8px); }
        .modal-body { background: var(--bg); width: 100%; max-width: 1200px; height: 88vh; border-radius: 25px; overflow: hidden; display: flex; border: 1px solid var(--border); position: relative; }
        .modal-left { width: 350px; padding: 40px; flex-shrink: 0; }
        .modal-left img { width: 100%; border-radius: 15px; }
        .modal-right { flex: 1; padding: 45px; overflow-y: auto; color: var(--text); }
        .btn { padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.7rem; color: #fff; cursor: pointer; text-transform: uppercase; margin-right: 8px; display: inline-flex; border: none; align-items: center; }
        .btn-play { background: var(--accent); }
        .btn-dl { background: #333; }
        .btn-site { background: #0071e3; }
        .close-btn { position: absolute; top: 20px; right: 25px; font-size: 2.5rem; cursor: pointer; color: var(--text); opacity: 0.5; }
        #loader { text-align: center; padding: 50px; color: var(--accent); font-weight: 900; display: none; }
        @media (max-width: 1000px) { .sidebar { display: none; } .main-content { margin-left: 0; } .modal-left { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <div style="display:flex; align-items:center;">
            <div class="logo" onclick="location.reload()">QUANTOMIX</div>
            <div class="mode-tabs">
                <div class="mode-tab active" id="tabMovies" onclick="setMode('movies')">Кино</div>
                <div class="mode-tab" id="tabTV" onclick="setMode('tv')">Сериалы</div>
                <div class="mode-tab" id="tabGlobal" onclick="setMode('global')">Глобал</div>
            </div>
        </div>
        <div style="display:flex; align-items:center;">
            <input type="text" class="search-bar" id="searchInput" placeholder="Поиск..." onkeyup="if(event.key==='Enter')search()">
            <div class="theme-toggle" onclick="toggleTheme()" id="themeIcon">🌙</div>
        </div>
    </div>

    <div class="container">
        <div class="sidebar" id="sidebar">
            <div class="nav-item active" id="pop-nav" onclick="changeCategory('popular', this)">🔥 Популярное</div>
            <div class="nav-item" onclick="changeCategory('top_rated', this)">⭐️ Лучшее</div>
            <div id="genresList" style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px;"></div>
        </div>
        <div class="main-content" id="mainContent">
            <div class="movie-grid" id="movieGrid"></div>
            <div id="loader">ЗАГРУЗКА...</div>
            <div class="global-list" id="globalGrid"></div>
        </div>
    </div>

    <div class="modal" id="movieModal">
        <div class="modal-body">
            <span class="close-btn" onclick="closeModal()">&times;</span>
            <div class="modal-left"><img id="mImg"></div>
            <div class="modal-right">
                <h2 id="mTitle" style="font-size:2rem; margin-bottom:10px;"></h2>
                <p id="mDesc" style="line-height:1.6; margin-bottom:30px; opacity:0.8;"></p>
                <div id="tList"></div>
            </div>
        </div>
    </div>

    <script>
        let curPage = 1, curType = 'popular', curGenre = null, loading = false, curMode = 'movies', hasMore = true;

        function toggleTheme() {
            const isLight = document.body.classList.toggle('light-mode');
            document.getElementById('themeIcon').innerText = isLight ? '☀️' : '🌙';
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        }

        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('themeIcon').innerText = '☀️';
        }

        function getQualityTags(title) { 
            const tags = [], t = title.toLowerCase();
            if (t.includes('2160p') || t.includes('4k')) tags.push('4K'); 
            else if (t.includes('1080p')) tags.push('1080p');
            if (t.includes('web')) tags.push('WEB');
            return tags.map(tag => '<span class="tag quality">' + tag + '</span>').join(''); 
        }

        function setMode(m) { 
            curMode = m; curPage = 1; hasMore = true;
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active')); 
            const tabId = m === 'movies' ? 'tabMovies' : (m === 'tv' ? 'tabTV' : 'tabGlobal');
            document.getElementById(tabId).classList.add('active'); 
            
            const isMedia = (m === 'movies' || m === 'tv');
            document.getElementById('sidebar').style.display = (isMedia && window.innerWidth > 1000) ? 'block' : 'none'; 
            document.getElementById('movieGrid').style.display = isMedia ? 'grid' : 'none'; 
            document.getElementById('globalGrid').style.display = isMedia ? 'none' : 'flex'; 
            document.getElementById('mainContent').style.marginLeft = (isMedia && window.innerWidth > 1000) ? '240px' : '0'; 
            
            if(isMedia) {
                document.getElementById('movieGrid').innerHTML = '';
                loadGenres();
                loadNextPage();
            }
        }

        function getAceLink(uri) {
            if (!uri) return '#';
            if (uri.toLowerCase().includes('magnet:')) return 'acestream://?magnet=' + encodeURIComponent(uri);
            return 'acestream://?url=' + encodeURIComponent(window.location.origin + '/api/dl?url=' + encodeURIComponent(uri));
        }

        async function loadGenres() { 
            try {
                const r = await fetch('/api/genres?mode=' + curMode); 
                const d = await r.json(); 
                document.getElementById('genresList').innerHTML = (d.genres || []).map(g => '<div class="nav-item" onclick="changeGenre('+g.id+', this)">'+g.name+'</div>').join(''); 
            } catch(e) {}
        }

        async function changeCategory(type, el) {
            curType = type; curGenre = null; curPage = 1; hasMore = true;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('movieGrid').innerHTML = '';
            loadNextPage();
        }

        async function changeGenre(id, el) {
            curType = 'genre'; curGenre = id; curPage = 1; hasMore = true;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('movieGrid').innerHTML = '';
            loadNextPage();
        }

        async function loadNextPage() {
            if (loading || !hasMore || curMode === 'global') return;
            loading = true;
            document.getElementById('loader').style.display = 'block';
            let url = curType === 'genre' ? \`/api/movies/genre/\${curGenre}?page=\${curPage}&mode=\${curMode}\` : \`/api/movies/type/\${curType}?page=\${curPage}&mode=\${curMode}\`;
            try {
                const r = await fetch(url);
                const d = await r.json();
                if (!d.results || d.results.length === 0) { hasMore = false; }
                else { render(d.results, true); curPage++; }
            } catch(e) {}
            document.getElementById('loader').style.display = 'none';
            loading = false;
        }

        function render(items, append = false) { 
            const html = (items || []).map(i => {
                const type = curMode === 'tv' ? 'tv' : 'movie';
                return '<div class="movie-card" onclick="openMovie('+i.id+', \\''+type+'\\')"><div class="rating-badge">'+(i.vote_average||0).toFixed(1)+'</div><img src="'+i.poster_path+'" loading="lazy"><div class="title">'+(i.title||i.name)+'</div></div>'
            }).join(''); 
            if(append) document.getElementById('movieGrid').innerHTML += html;
            else { document.getElementById('movieGrid').innerHTML = html; window.scrollTo(0,0); }
        }

        window.onscroll = function() {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 900) { loadNextPage(); }
        };
        
        async function search() { 
            const q = document.getElementById('searchInput').value; if(!q) return; 
            if (curMode !== 'global') { 
                document.getElementById('movieGrid').innerHTML = '';
                const r = await fetch('/api/movies/search?q=' + encodeURIComponent(q)); 
                const d = await r.json(); render(d.results); 
                hasMore = false; 
            } else { 
                document.getElementById('globalGrid').innerHTML = '<p style="text-align:center; width:100%; padding:50px;">ПОИСК...</p>'; 
                const r = await fetch('/api/jackett?q=' + encodeURIComponent(q)); 
                const d = await r.json(); 
                document.getElementById('globalGrid').innerHTML = (d.Results || []).map(t => {
                    const dlLink = t.MagnetUri || (window.location.origin + '/api/dl?url=' + encodeURIComponent(t.Link));
                    let btns = \`<a href="\${dlLink}" class="btn btn-dl">\${t.MagnetUri ? 'Магнит' : 'Торрент'}</a>\`;
                    btns += \`<a href="\${t.Details}" target="_blank" class="btn btn-site">Трекер</a>\`;
                    if (t.isMedia) btns += \`<a href="\${getAceLink(t.MagnetUri || t.Link)}" class="btn btn-play">Смотреть</a>\`;
                    return \`<div class="global-item"><b>\${t.Title}</b><br><br>\${getQualityTags(t.Title)}<span class="tag">🌱 \${t.Seeders}</span><span class="tag">\${(t.Size/1e9).toFixed(2)} GB</span><br><br>\${btns}</div>\`;
                }).join('') || '<p style="text-align:center; width:100%;">Ничего не найдено.</p>';
            } 
        }

        async function openMovie(id, type) { 
            try {
                const r = await fetch('/api/movies/details/'+id+'?type='+type); 
                const m = await r.json(); 
                document.getElementById('mTitle').innerText = m.title || m.name;
                document.getElementById('mImg').src = m.poster_path; 
                document.getElementById('mDesc').innerText = m.overview || '...'; 
                document.getElementById('movieModal').style.display = 'flex'; 
                document.getElementById('tList').innerHTML = 'Загрузка торрентов...'; 
                const tr = await fetch('/api/jackett?q=' + encodeURIComponent(m.original_title || m.original_name) + '&filter=true');
                const td = await tr.json();
                document.getElementById('tList').innerHTML = (td.Results || []).map(t => {
                    const dlLink = t.MagnetUri || (window.location.origin + '/api/dl?url=' + encodeURIComponent(t.Link));
                    let btns = \`<a href="\${dlLink}" class="btn btn-dl">\${t.MagnetUri ? 'Магнит' : 'Торрент'}</a>\`;
                    btns += \`<a href="\${t.Details}" target="_blank" class="btn btn-site">Трекер</a>\`;
                    if (t.isMedia) btns += \`<a href="\${getAceLink(t.MagnetUri || t.Link)}" class="btn btn-play">Смотреть</a>\`;
                    return \`<div class="global-item" style="margin-bottom:10px; border:1px solid var(--border)"><b>\${t.Title}</b><br><br>\${getQualityTags(t.Title)}<span class="tag">🌱 \${t.Seeders}</span><br><br>\${btns}</div>\`;
                }).join('') || '<p>Раздач не найдено.</p>'; 
            } catch(e) {}
        }

        function closeModal() { document.getElementById('movieModal').style.display = 'none'; }
        loadGenres(); loadNextPage();
    </script>
</body>
</html>
    `);
});

// API Routes
app.get('/api/genres', checkAuth, async (req, res) => {
    const mode = req.query.mode === 'tv' ? 'tv' : 'movie';
    try { const r = await axios.get('https://api.themoviedb.org/3/genre/'+mode+'/list?api_key='+TMDB_KEY+'&language=ru-RU'); res.json(r.data); } catch(e) { res.json({genres:[]}); }
});
app.get('/api/movies/type/:t', checkAuth, async (req, res) => {
    const mode = req.query.mode === 'tv' ? 'tv' : 'movie';
    try {
        const r = await axios.get('https://api.themoviedb.org/3/'+mode+'/'+req.params.t+'?api_key='+TMDB_KEY+'&language=ru-RU&page='+req.query.page);
        const processed = r.data.results.map(m => ({...m, poster_path: getPoster(m.poster_path)}));
        res.json({results: processed});
    } catch(e) { res.json({results:[]}); }
});
app.get('/api/movies/genre/:id', checkAuth, async (req, res) => {
    const mode = req.query.mode === 'tv' ? 'tv' : 'movie';
    try {
        const r = await axios.get('https://api.themoviedb.org/3/discover/'+mode+'?api_key='+TMDB_KEY+'&language=ru-RU&with_genres='+req.params.id+'&page='+req.query.page);
        const processed = r.data.results.map(m => ({...m, poster_path: getPoster(m.poster_path)}));
        res.json({results: processed});
    } catch(e) { res.json({results:[]}); }
});
app.get('/api/movies/search', checkAuth, async (req, res) => {
    try {
        const r = await axios.get('https://api.themoviedb.org/3/search/multi?api_key='+TMDB_KEY+'&language=ru-RU&query=' + encodeURIComponent(req.query.q));
        const processed = r.data.results.filter(i=>i.media_type!=='person').map(m=>({...m, poster_path:getPoster(m.poster_path)}));
        res.json({results: processed});
    } catch(e) { res.json({results:[]}); }
});
app.get('/api/movies/details/:id', checkAuth, async (req, res) => {
    try {
        const type = req.query.type === 'tv' ? 'tv' : 'movie';
        const r = await axios.get('https://api.themoviedb.org/3/'+type+'/'+req.params.id+'?api_key='+TMDB_KEY+'&language=ru-RU');
        const data = {...r.data, poster_path: getPoster(r.data.poster_path)};
        res.json(data);
    } catch(e) { res.status(404).send('Error'); }
});

app.get('/api/jackett', checkAuth, async (req, res) => {
    try {
        const r = await axios.get(J_URL + '/api/v2.0/indexers/all/results?apikey=' + J_KEY + '&Query=' + encodeURIComponent(req.query.q), { timeout: 20000 });
        let results = r.data.Results || [];
        
        // Фильтрация мусора (игры, софт, репаки)
        const trash = ['repack', 'pc', 'windows', 'linux', 'steamrip', 'crack', 'repack by', 'portable'];
        if (req.query.filter === 'true') {
            results = results.filter(t => {
                const title = t.Title.toLowerCase();
                return !trash.some(word => title.includes(word));
            });
        }

        const topResults = results.filter(t => t.Seeders > 0).sort((a,b) => b.Seeders - a.Seeders).slice(0, 30);
        
        const processed = await Promise.all(topResults.map(async (t) => {
            // Улучшенная проверка категорий (2000-е и 5000-е)
            const cats = Array.isArray(t.Category) ? t.Category : [t.Category];
            const isMediaCat = cats.some(c => (c >= 2000 && c < 3000) || (c >= 5000 && c < 6000));
            
            // Запасная проверка по качеству в названии (на случай если трекер не отдал категорию)
            const videoKeywords = ['1080p', '2160p', '4k', '720p', 'web-dl', 'hdtv', 'bluray', 'h.264', 'x264', 'h.265', 'x265', 'remux'];
            const hasVideoTags = videoKeywords.some(word => t.Title.toLowerCase().includes(word));

            t.isMedia = isMediaCat || hasVideoTags;
            
            if (!t.MagnetUri && t.Link) {
                try {
                    let internalUrl = t.Link.replace(/http:\/\/127\.0\.0\.1:9117/g, J_URL);
                    const check = await axios.get(internalUrl, { maxRedirects: 0, validateStatus: (status) => status >= 200 && status < 400, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
                    if (check.headers.location && check.headers.location.startsWith('magnet:')) t.MagnetUri = check.headers.location;
                } catch (e) {}
            }
            return t;
        }));
        res.json({ Results: processed });
    } catch(e) { res.json({ Results: [] }); }
});

app.listen(PORT, '0.0.0.0', () => console.log('QUANTOMIX ENGINE READY ON PORT ' + PORT));
