var exec = require("child_process").exec;
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const router = require('express').Router();
const User = require('./User');
const bcrypt = require('bcryptjs');
const {ensureAuthenticated} = require('./auth');
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const GridFSBucket = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodeOverride = require("method-override");
const passport = require('passport');



// register page
router.get('/register', (req, res)=>{
  res.render('register');
});

router.post('/register', (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2
    });
  } else {
      User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('register', {
          errors,
          name,
          email,
          password,
          password2
        });
      } else {
        const newUser = new User({
          name,
          email,
          password
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

//Login Page
router.get('/login', (req, res)=>{
  res.render('login');
});


router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});
// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/login');
});


//Start page
router.get('/', (req, res)=>{
  res.render('start');
});


router.get('/start', (req, res)=>{
  res.render('start');
});


//Find Service
router.get('/find', ensureAuthenticated, (req, res)=>{
  exec("ls", { timeout: 10000,
	 			maxBuffer: 2000*1024 },
		function (error, stdout, stderr) {
			res.send(stdout);
		});
});

//Upload and show  Service
router.use(bodyParser.json());
router.use (methodeOverride('_method'));

const mongoURI = process.env.DB_CONNECT;

const promise = mongoose.connect(mongoURI, { useNewUrlParser: true , useUnifiedTopology: true});

const conn = mongoose.connection;
let gfs;

conn.once('open',() => {
  gfs = Grid(conn, mongoose.mongo);
  gfs.collection('uploads');
});

//create storage object
const storage = new GridFSBucket({
  db: promise,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


router.get('/upload', ensureAuthenticated, (req, res) => {
      res.render('index')});

router.post('/show', upload.single('file'), (req, res) => {
  res.redirect('/upload');
});


router.get('/show', ensureAuthenticated, (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});


router.get('/show/:filename', ensureAuthenticated, (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});


//logout Service
router.get('/logout', ensureAuthenticated, (req, res) => {
 req.logout();
 return res.redirect('/');
});


//route doesn't exist
router.use((req, res)=>{
  res.status(404).send("sorry that's route doesn't existe!!")
})



module.exports = router;
