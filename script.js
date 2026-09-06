const API="/api";
const IMAGE="https://image.tmdb.org/t/p/w500";
const BACKDROP="https://image.tmdb.org/t/p/w1280";

let favorites=[];
let currentMovies=[];

document.addEventListener("DOMContentLoaded",()=>{
  loadPopular();
  loadFavorites();
  document.getElementById("searchInput").addEventListener("keydown",e=>{
    if(e.key==="Enter") searchMovies();
  });
});

async function loadPopular(){
  const grid=document.getElementById("movieGrid");
  document.getElementById("sectionTitle").textContent="Popular Movies";
  grid.innerHTML='<div class="loader">Loading movies...</div>';

  try{
    const response=await fetch(`${API}/movies/popular`);
    const data=await response.json();
    currentMovies=data.results||[];
    renderMovies(currentMovies,grid);
  }catch(error){
    grid.innerHTML='<div class="loader">Unable to load movies.</div>';
  }
}

async function searchMovies(){
  const input=document.getElementById("searchInput");
  const query=input.value.trim();

  if(!query){
    showToast("Enter a movie name");
    return;
  }

  const grid=document.getElementById("movieGrid");
  document.getElementById("sectionTitle").textContent=`Results for "${query}"`;
  grid.innerHTML='<div class="loader">Searching...</div>';

  try{
    const response=await fetch(`${API}/movies/search?query=${encodeURIComponent(query)}`);
    const data=await response.json();
    currentMovies=data.results||[];
    renderMovies(currentMovies,grid);

    if(!currentMovies.length){
      grid.innerHTML='<div class="loader">No movies found.</div>';
    }
  }catch(error){
    grid.innerHTML='<div class="loader">Search failed.</div>';
  }
}

function quickSearch(query){
  document.getElementById("searchInput").value=query;
  searchMovies();
}

function renderMovies(movies,container){
  if(!movies.length){
    container.innerHTML='<div class="loader">No movies available.</div>';
    return;
  }

  container.innerHTML=movies.map(movie=>{
    const saved=favorites.some(f=>f.movieId===movie.id);
    const poster=movie.poster_path
      ? `${IMAGE}${movie.poster_path}`
      : "https://via.placeholder.com/500x750/19191f/777?text=No+Poster";

    const year=movie.release_date
      ? movie.release_date.substring(0,4)
      : "N/A";

    return `
      <article class="movie-card" onclick="openMovie(${movie.id})">
        <div class="poster-wrap">
          <img src="${poster}" alt="${escapeHtml(movie.title)}">
          <div class="rating">★ ${movie.vote_average?.toFixed(1)||"N/A"}</div>
          <button class="favorite-btn ${saved?"saved":""}"
            onclick="event.stopPropagation();toggleFavorite(${movie.id})">
            ${saved?"♥":"♡"}
          </button>
        </div>
        <div class="movie-info">
          <div class="movie-title">${escapeHtml(movie.title)}</div>
          <div class="movie-year">${year}</div>
        </div>
      </article>
    `;
  }).join("");
}

async function openMovie(id){
  const modal=document.getElementById("movieModal");
  const content=document.getElementById("modalContent");

  modal.classList.remove("hidden");
  document.body.style.overflow="hidden";
  content.innerHTML='<div class="loader">Loading movie details...</div>';

  try{
    const response=await fetch(`${API}/movies/${id}`);
    const movie=await response.json();

    if(!response.ok) throw new Error();

    renderMovieDetails(movie);
  }catch(error){
    content.innerHTML='<div class="loader">Unable to load movie details.</div>';
  }
}

function renderMovieDetails(movie){
  const poster=movie.poster_path
    ? `${IMAGE}${movie.poster_path}`
    : "https://via.placeholder.com/500x750/19191f/777?text=No+Poster";

  const backdrop=movie.backdrop_path
    ? `${BACKDROP}${movie.backdrop_path}`
    : poster;

  const saved=favorites.some(f=>f.movieId===movie.id);

  const genres=(movie.genres||[])
    .map(g=>`<span class="genre">${escapeHtml(g.name)}</span>`)
    .join("");

  const cast=(movie.credits?.cast||[]).slice(0,8)
    .map(person=>{
      const image=person.profile_path
        ? `${IMAGE}${person.profile_path}`
        : "https://via.placeholder.com/100/222/777?text=No";

      return `
        <div class="cast-item">
          <img src="${image}" alt="${escapeHtml(person.name)}">
          <p>${escapeHtml(person.name)}</p>
        </div>
      `;
    }).join("");

  const year=movie.release_date
    ? movie.release_date.substring(0,4)
    : "N/A";

  document.getElementById("modalContent").innerHTML=`
    <div class="detail-backdrop" style="background-image:url('${backdrop}')"></div>

    <div class="detail-content">
      <img class="detail-poster" src="${poster}" alt="${escapeHtml(movie.title)}">

      <div class="detail-info">
        <h2>${escapeHtml(movie.title)}</h2>

        <div class="detail-meta">
          <span class="score">★ ${movie.vote_average?.toFixed(1)||"N/A"}</span>
          <span>${year}</span>
          <span>${movie.runtime||"N/A"} min</span>
          <span>${movie.original_language?.toUpperCase()||"N/A"}</span>
        </div>

        <div class="genres">${genres}</div>

        <button class="detail-fav" onclick="toggleFavorite(${movie.id},true)">
          ${saved?"♥ Remove from Favorites":"♡ Add to Favorites"}
        </button>

        <p class="overview">${escapeHtml(movie.overview||"No overview available.")}</p>

        <div class="cast-title">Top Cast</div>
        <div class="cast">${cast||"<p>No cast information.</p>"}</div>
      </div>
    </div>
  `;
}

async function toggleFavorite(id,refreshModal=false){
  const existing=favorites.find(f=>f.movieId===id);

  try{
    if(existing){
      const response=await fetch(`${API}/favorites/${id}`,{
        method:"DELETE"
      });

      if(!response.ok) throw new Error();

      favorites=favorites.filter(f=>f.movieId!==id);
      showToast("Removed from favorites");
    }else{
      const movie=currentMovies.find(m=>m.id===id);

      let movieData=movie;

      if(!movieData){
        const response=await fetch(`${API}/movies/${id}`);
        movieData=await response.json();
      }

      const favorite={
        movieId:movieData.id,
        title:movieData.title,
        posterPath:movieData.poster_path||"",
        backdropPath:movieData.backdrop_path||"",
        rating:movieData.vote_average||0,
        releaseDate:movieData.release_date||"",
        overview:movieData.overview||""
      };

      const response=await fetch(`${API}/favorites`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(favorite)
      });

      if(!response.ok) throw new Error();

      const savedMovie=await response.json();
      favorites.unshift(savedMovie);
      showToast("Added to favorites");
    }

    renderMovies(currentMovies,document.getElementById("movieGrid"));

    if(refreshModal){
      openMovie(id);
    }

    if(!document.getElementById("favoritesSection").classList.contains("hidden")){
      renderFavorites();
    }
  }catch(error){
    showToast("Unable to update favorites");
  }
}

async function loadFavorites(){
  try{
    const response=await fetch(`${API}/favorites`);
    favorites=await response.json();
  }catch(error){
    favorites=[];
  }
}

function renderFavorites(){
  const grid=document.getElementById("favoritesGrid");

  if(!favorites.length){
    grid.innerHTML='<div class="loader">Your favorites list is empty.</div>';
    return;
  }

  const movies=favorites.map(movie=>({
    id:movie.movieId,
    title:movie.title,
    poster_path:movie.posterPath,
    vote_average:movie.rating,
    release_date:movie.releaseDate
  }));

  renderMovies(movies,grid);
}

function showHome(){
  document.getElementById("homeSection").classList.remove("hidden");
  document.getElementById("favoritesSection").classList.add("hidden");
  setActiveNav(0);
}

function showFavorites(){
  document.getElementById("homeSection").classList.add("hidden");
  document.getElementById("favoritesSection").classList.remove("hidden");
  setActiveNav(1);
  renderFavorites();
}

function setActiveNav(index){
  document.querySelectorAll(".nav-btn").forEach((button,i)=>{
    button.classList.toggle("active",i===index);
  });
}

function closeModal(){
  document.getElementById("movieModal").classList.add("hidden");
  document.body.style.overflow="";
}

function showToast(message){
  const toast=document.getElementById("toast");
  toast.textContent=message;
  toast.classList.add("show");

  setTimeout(()=>{
    toast.classList.remove("show");
  },2500);
}

function escapeHtml(value){
  return String(value||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}