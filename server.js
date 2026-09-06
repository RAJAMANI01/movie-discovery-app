require("dotenv").config();
const express=require("express");
const mongoose=require("mongoose");
const cors=require("cors");
const axios=require("axios");
const path=require("path");
const Favorite=require("./models/Favorite");

const app=express();
const PORT=process.env.PORT||5000;
const TMDB_BASE_URL="https://api.themoviedb.org/3";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,"../frontend")));

const tmdb=axios.create({
  baseURL:TMDB_BASE_URL,
  headers:{
    Authorization:`Bearer ${process.env.TMDB_TOKEN}`,
    accept:"application/json"
  }
});

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected successfully"))
.catch(err=>console.error("MongoDB connection error:",err.message));

app.get("/api/movies/popular",async(req,res)=>{
  try{
    const page=req.query.page||1;
    const response=await tmdb.get("/movie/popular",{
      params:{language:"en-US",page}
    });
    res.json(response.data);
  }catch(error){
    console.error(error.response?.data||error.message);
    res.status(500).json({message:"Unable to fetch popular movies"});
  }
});

app.get("/api/movies/search",async(req,res)=>{
  try{
    const query=req.query.query;

    if(!query){
      return res.status(400).json({message:"Search query is required"});
    }

    const response=await tmdb.get("/search/movie",{
      params:{
        query,
        include_adult:false,
        language:"en-US",
        page:1
      }
    });

    res.json(response.data);
  }catch(error){
    console.error(error.response?.data||error.message);
    res.status(500).json({message:"Unable to search movies"});
  }
});

app.get("/api/movies/:id",async(req,res)=>{
  try{
    const movieId=req.params.id;

    const [movie,credits]=await Promise.all([
      tmdb.get(`/movie/${movieId}`,{
        params:{language:"en-US"}
      }),
      tmdb.get(`/movie/${movieId}/credits`,{
        params:{language:"en-US"}
      })
    ]);

    res.json({
      ...movie.data,
      credits:credits.data
    });
  }catch(error){
    console.error(error.response?.data||error.message);
    res.status(500).json({message:"Unable to fetch movie details"});
  }
});

app.get("/api/favorites",async(req,res)=>{
  try{
    const favorites=await Favorite.find().sort({createdAt:-1});
    res.json(favorites);
  }catch(error){
    res.status(500).json({message:"Unable to fetch favorites"});
  }
});

app.post("/api/favorites",async(req,res)=>{
  try{
    const favorite=await Favorite.create(req.body);
    res.status(201).json(favorite);
  }catch(error){
    if(error.code===11000){
      return res.status(409).json({message:"Movie already exists in favorites"});
    }
    res.status(500).json({message:"Unable to save favorite"});
  }
});

app.delete("/api/favorites/:movieId",async(req,res)=>{
  try{
    const deleted=await Favorite.findOneAndDelete({
      movieId:Number(req.params.movieId)
    });

    if(!deleted){
      return res.status(404).json({message:"Favorite not found"});
    }

    res.json({message:"Movie removed from favorites"});
  }catch(error){
    res.status(500).json({message:"Unable to remove favorite"});
  }
});


app.listen(PORT,()=>{
  console.log(`Server running on http://localhost:${PORT}`);
});