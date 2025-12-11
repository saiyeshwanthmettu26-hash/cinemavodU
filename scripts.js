const TMDB_KEY = "ce0c5d71987b89120633fe51450b4c61";
const OMDB_KEY = "6b99d2c3";

// DOM
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");
const details = document.getElementById("details");
const toggleTheme = document.getElementById("toggleTheme");

// THEME TOGGLE
toggleTheme.addEventListener("click", () => {
  document.body.dataset.theme =
    document.body.dataset.theme === "dark" ? "light" : "dark";
});

// SEARCH BUTTON CLICK
searchBtn.addEventListener("click", () => {
  let q = searchInput.value.trim();
  if (q.length > 0) getMovie(q);
});

// AUTOSUGGEST
searchInput.addEventListener("input", async () => {
  let q = searchInput.value.trim();
  if (q.length < 2) {
    suggestions.innerHTML = "";
    return;
  }

  const url = https://www.omdbapi.com/?s=${encodeURIComponent(q)}&apikey=${OMDB_KEY};

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.Search) {
      suggestions.innerHTML = "";
      return;
    }

    suggestions.innerHTML = data.Search
      .map((m) => <li onclick="selectMovie('${m.Title}')">${m.Title}</li>)
      .join("");

  } catch (err) {
    console.log("Suggestion error:", err);
  }
});

window.selectMovie = function (title) {
  searchInput.value = title;
  suggestions.innerHTML = "";
  getMovie(title);
};

// MAIN MOVIE FETCH
async function getMovie(title) {
  details.innerHTML = "<p>Loading...</p>";

  try {
    const omdbURL = https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_KEY};
    const omdbRes = await fetch(omdbURL);
    const omdb = await omdbRes.json();

    if (omdb.Response === "False") {
      details.innerHTML = "<p>Movie not found.</p>";
      return;
    }

    // get trailer from YouTube (first video match)
    const ytQuery = ${omdb.Title} official trailer;
    const ytURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      ytQuery
    )}&key=${TMDB_KEY}&type=video&maxResults=1`;

    let ytRes = await fetch(ytURL);
    let ytData = await ytRes.json();

    let trailer = "";
    if (ytData.items && ytData.items.length > 0) {
      let videoId = ytData.items[0].id.videoId;
      trailer = <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>;
    } else {
      trailer = "<p>No trailer found.</p>";
    }

    // Render Output
    details.innerHTML = `
      <div class="movie-box">
        <img src="${omdb.Poster}" class="poster">

        <div class="info">
          <h2>${omdb.Title} (${omdb.Year})</h2>
          <p><b>Genre:</b> ${omdb.Genre}</p>
          <p><b>Plot:</b> ${omdb.Plot}</p>
          <p><b>Actors:</b> ${omdb.Actors}</p>
          <p><b>Awards:</b> ${omdb.Awards}</p>
        </div>
      </div>

      <h3>🎥 Trailer</h3>
      <div class="trailer-box">${trailer}</div>
    `;

  } catch (e) {
    details.innerHTML = "<p>Error fetching movie.</p>";
  }
}
