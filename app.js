//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findOrCreate");
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

//configuring the express session package with default settings
app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize()); //initializing passport package
app.use(passport.session()); //adding sessions package to the passport package

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});   //connecting to the database using mongoose.

// Creating Schema through which new user data is stored. new mongoose.scheme is used so that any plugins can be added and initialized to this schema.
const userSchema =new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//using the passport local mongoose plugin to our userSchema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//creating model that can be used to create new users
const User = new mongoose.model("User", userSchema);

// use static authenticate method of model. Here we use passportLocalMongoose to create a LocalStrategy. This will save the user data
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res){
  res.render("home");
});

app.route('/auth/google')

  .get(passport.authenticate('google', {

    scope: ['profile']

  }));

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});


app.get("/submit", function(req, res){
  if(req.isAuthenticated()){   // checks whether the user is indeed authenticated. checks the cookie
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout(function(err){   // logout is a passport function
   if(err){
     console.log(err);
   }  else {
       res.redirect("/");
   }
  });
});

app.post("/register", function(req, res){
 User.register({username: req.body.username}, req.body.password, function(err, user){
   if(err){
     console.log(err);
     res.redirect("/register");
   }else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
     });
   }
 });
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){   //This is a function that authenticates the user and starts the session
        res.redirect("/secrets");
    }
  );
}});
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
   console.log(req.user.id);

  User.findById(req.user._id.toString(), function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.listen(3000, function(){
   console.log("Server started at port: 3000");
});
