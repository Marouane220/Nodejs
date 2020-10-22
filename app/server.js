const express = require("express");
const mongoose = require("mongoose");
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');

const dotenv = require("dotenv");



dotenv.config();

const app = express();
const http = require('http').createServer(app);
const port = 8888 || process.env.PORT;
// Passport Config
require('./passport')(passport);

const io = require('socket.io')(http);

io.on("connection", (socket) => {
    //Client connecté
    console.log('Client connected');

    //import routes
    const Route = require('./routes');

    // EJS
    app.use(expressLayouts);
    app.set('view engine', 'ejs');

    // Express body parser
    app.use(express.urlencoded({ extended: true }));

    // Express session
    app.use(
      session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true
      })
    );
    // Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Connect flash
    app.use(flash());

    // Global variables
    app.use(function(req, res, next) {
      res.locals.success_msg = req.flash('success_msg');
      res.locals.error_msg = req.flash('error_msg');
      res.locals.error = req.flash('error');
      next();
    });

    //Routes middelware
    app.use('/', Route);

    //Connect to db
    mongoose.connect(process.env.DB_CONNECT,
                      {useNewUrlParser: true, useUnifiedTopology: true },
                      () => console.log('connect to the db'));
});

http.listen(port, ()=>{
  console.log("server running on " + port)
});
