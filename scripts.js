const TMDB_API_KEY = "ce0c5d71987b89120633fe51450b4c61"; // your TMDb key
const OMDB_API_KEY = "6d39aa3d";                             // your OMDb key
// ---------------------------

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const IMG_BASE_SMALL = "https://image.tmdb.org/t/p/w185";

const searchInput = document.getElementById("search");
const suggestionsEl = document.getElementById("suggestions");
const detailsEl = document.getElementById("details");
const searchBtn = document.getElementById("searchBtn");
const loader = document.getElementById("loader");

// --------------------------- Helper Functions ---------------------------
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&','<':'<','>':'>','"':'"' }[c]));
}

function showLoader(show) {
  if (!loader) return;
  loader.classList.toggle("hidden", !show);
}

// --------------------------- TMDb + OMDb fetchers ---------------------------
async function tmdbSearch(query) {
  const url = ${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDb search failed: " + res.status);
  return await res.json();
}

async function tmdbGetMovie(id) {
  const url = ${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY};
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDb movie fetch failed: " + res.status);
  return await res.json();
}

async function tmdbGetExtras(id) {
  const creditsP = fetch(${TMDB_BASE}/movie/${id}/credits?api_key=${TMDB_API_KEY}).then(r => r.json());
  const videosP = fetch(${TMDB_BASE}/movie/${id}/videos?api_key=${TMDB_API_KEY}).then(r => r.json());
  const watchP = fetch(${TMDB_BASE}/movie/${id}/watch/providers?api_key=${TMDB_API_KEY}).then(r => r.json());
  const [credits, videos, watch] = await Promise.all([creditsP, videosP, watchP]);
  return { credits, videos, watch };
}

async function omdbByImdbId(imdb_id) {
  if (!imdb_id) return null;
  const url = https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdb_id}&plot=short;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    return j.Response === "True" ? j : null;
  } catch (e) {
    return null;
  }
}

// --------------------------- Suggestions UI & keyboard navigation ---------------------------
let currentSuggestions = [];
let focusedIndex = -1;

async function onType() {
  const q = searchInput.value.trim();
  suggestionsEl.innerHTML = "";
  focusedIndex = -1;
  currentSuggestions = [];

  if (q.length < 2) return;

  try {
    const data = await tmdbSearch(q);
    const results = data.results || [];
    currentSuggestions = results.slice(0, 10);

    if (currentSuggestions.length === 0) {  
      suggestionsEl.innerHTML = "";  
      return;  
    }  

    suggestionsEl.innerHTML = currentSuggestions.map((m, i) => {  
      const year = m.release_date ? ` (${m.release_date.slice(0,4)})` : "";  
      return <li role="option" data-idx="${i}" data-id="${m.id}">${escapeHtml(m.title)}${year}</li>;  
    }).join("");

  } catch (err) {
    console.error("Suggestion fetch error:", err);
    suggestionsEl.innerHTML = "";
  }
}

searchInput.addEventListener("input", debounce(onType, 300));

// Keyboard navigation
searchInput.addEventListener("keydown", (e) => {
  const items = suggestionsEl.querySelectorAll("li");
  if (items.length === 0) {
    if (e.key === "Enter") { e.preventDefault(); startSearchFromInput(); }
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
    updateSuggestionFocus(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    focusedIndex = Math.max(focusedIndex - 1, 0);
    updateSuggestionFocus(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (focusedIndex >= 0 && items[focusedIndex]) {
      const idx = parseInt(items[focusedIndex].dataset.idx, 10);
      selectSuggestion(idx);
    } else {
      startSearchFromInput();
    }
  }
});

function updateSuggestionFocus(items) {
  items.forEach((it, i) => it.setAttribute("aria-selected", i === focusedIndex ? "true" : "false"));
  if (items[focusedIndex]) items[focusedIndex].scrollIntoView({ block: "nearest" });
}

suggestionsEl.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const idx = parseInt(li.dataset.idx, 10);
  selectSuggestion(idx);
});

function selectSuggestion(idx) {
  const movie = currentSuggestions[idx];
  if (!movie) return;
  searchInput.value = movie.title;
  suggestionsEl.innerHTML = "";
  loadMovieById(movie.id);
}

// --------------------------- Search button ---------------------------
searchBtn.addEventListener("click", () => startSearchFromInput());

function startSearchFromInput() {
  const q = searchInput.value.trim();
  if (!q) return;
  performSearchAndShowMatches(q);
}

// Show top matches
async function performSearchAndShowMatches(query) {
  showLoader(true);
  detailsEl.innerHTML = "";
  try {
    const j = await tmdbSearch(query);
    if (!j || !j.results || j.results.length === 0) {
      detailsEl.innerHTML = <p>No results for <b>${escapeHtml(query)}</b></p>;
      return;
    }

    const matches = j.results.slice(0, 8);  
    detailsEl.innerHTML = `  
      <div class="matches">  
        <h3 style="margin-top:0">Matches for "${escapeHtml(query)}"</h3>  
        ${matches.map(m => `  
          <div class="movie-card small" style="cursor:pointer" data-id="${m.id}">  
            <div style="min-width:100px;max-width:100px">  
              <img src="${m.poster_path ? IMG_BASE + m.poster_path : ''}" style="width:100%;border-radius:8px" alt="">  
            </div>  
            <div style="flex:1;padding-left:12px">  
              <div style="font-weight:700">${escapeHtml(m.title)} ${m.release_date ? '(' + m.release_date.slice(0,4) + ')' : ''}</div>  
              <div style="color:var(--muted);margin-top:6px">${escapeHtml(m.overview ? m.overview.slice(0,130) : '')}</div>  
            </div>  
          </div>  
        `).join("")}  
      </div>  
    `;  

    const cards = detailsEl.querySelectorAll('.movie-card.small');  
    cards.forEach(c => c.addEventListener('click', () => {  
      const id = c.getAttribute('data-id');  
      if (id) loadMovieById(parseInt(id, 10));  
    }));

  } catch (err) {
    console.error(err);
    detailsEl.innerHTML = <p>Search failed.</p>;
  } finally {
    showLoader(false);
  }
}

// --------------------------- Load movie ---------------------------
async function loadMovieById(id) {
  if (!id) return;
  showLoader(true);
  suggestionsEl.innerHTML = "";
  try {
    const [movie, extra] = await Promise.all([tmdbGetMovie(id), tmdbGetExtras(id)]);
    const omdb = await omdbByImdbId(movie.imdb_id);
    renderFullMovie(movie, extra, omdb);
  } catch (err) {
    console.error("Load movie error:", err);
    detailsEl.innerHTML = <p>Could not load movie details.</p>;
  } finally {
    showLoader(false);
  }
}

// --------------------------- Render Movie ---------------------------
function renderFullMovie(movie, extra, omdb) {
  const castArr = (extra.credits?.cast) || [];
  const director = (extra.credits?.crew.find(c => c.job === "Director") || {}).name || "N/A";
  const genres = (movie.genres || []).map(g => g.name).join(",") || "N/A";
  const imdbRating = omdb?.imdbRating || (movie.vote_average ? String(movie.vote_average) : "N/A");
  const awards = omdb?.Awards || "N/A";
  const vids = (extra.videos?.results) || [];

  // Trailer fallback to YouTube search
  let trailerUrl = vids.find(v => v.type.toLowerCase().includes("trailer") && v.site === "YouTube")?.key;
  if(trailerUrl) trailerUrl = https://www.youtube.com/watch?v=${trailerUrl};
  else trailerUrl = https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " trailer")};

  const castHtml = castArr.length ? <div class="cast-grid">${castArr.map(c=>
      <div class="cast-card">
        <img src="${c.profile_path?('https://image.tmdb.org/t/p/w185'+c.profile_path):''}" alt="${escapeHtml(c.name)}">
        <div style="font-weight:700">${escapeHtml(c.name)}</div>
        <div style="color:var(--muted);font-size:13px">${c.character?escapeHtml(c.character.split('/')[0]):''}</div>
      </div>).join('')}</div> : '<div><em>No cast info</em></div>';

  detailsEl.innerHTML = `
  <div class="movie-card">
    <div class="poster"><img src="${movie.poster_path?IMG_BASE + movie.poster_path:''}" alt="${escapeHtml(movie.title)} poster"></div>
    <div class="meta">
      <div class="title-row"><h2>${escapeHtml(movie.title)} ${movie.release_date? '('+movie.release_date.slice(0,4)+')':''}</h2><span class="badge">${movie.status||""}</span></div>
      <div class="info"><div><b>Genres:</b> ${escapeHtml(genres)}</div><div><b>IMDb Rating:</b> ${escapeHtml(imdbRating)}</div><div><b>Awards:</b> ${escapeHtml(awards)}</div></div>
      <p class="plot"><b>Plot:</b> ${escapeHtml(movie.overview||"No overview available")}</p>
      ${castHtml}
      <div class="actions">
        <button id="showTrailer" class="btn trailer">▶ Watch Trailer</button>
      </div>
    </div>
  </div>
  `;

  document.getElementById("showTrailer").addEventListener("click",()=>window.open(trailerUrl,"_blank"));
}

// --------------------------- Initialize ---------------------------
window.loadMovieById = loadMovieById;
searchInput?.focus();
