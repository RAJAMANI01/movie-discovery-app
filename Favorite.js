const mongoose=require("mongoose");

const favoriteSchema=new mongoose.Schema({
  movieId:{type:Number,required:true,unique:true},
  title:{type:String,required:true},
  posterPath:String,
  backdropPath:String,
  rating:Number,
  releaseDate:String,
  overview:String
},{timestamps:true});

module.exports=mongoose.model("Favorite",favoriteSchema);