//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const app = express();
const saltRounds = 10;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});   //connecting to the database using mongoose.

// Creating Schema through which new user data is stored. new mongoose.scheme is they syntax.
const userSchema =new mongoose.Schema({
  email: String,
  password: String
});


//creating model that can be used to create new users
const User = new mongoose.model("User", userSchema);



app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const newUser = new User({
      email:req.body.username,
      password: hash
    });
    newUser.save(function(err){
    if(!err){
      res.render("secrets");
    } else{
      console.log("error");
    }
    });
  });


});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, foundUser){
    if(err){
      console.log(err);
    } else{
    if(foundUser){
      bcrypt.compare(password, foundUser.password, function(err, result) {
      if(result === true){
        res.render("secrets");
      }
    });


    }
  }
});
});


app.listen(3000, function(){
   console.log("Server started at port: 3000");
});
