const express = require('express'),
        morgan = require('morgan'),
        path = require('path'),
        mysql = require('mysql'),
        mySqlConnection = require('express-myconnection'),
        session = require('express-session'),
        bodyParser = require('body-parser'),
        sha256 = require('sha256');
const app = express();

// Settings
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({secret: '12dfdfdfsd.aj.l&&3456', resave: true, saveUninitialized: true}));

// register the bodyParser middleware for processing forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Middlewares
app.use(morgan('dev')); // watching file changes
app.use(mySqlConnection(mysql, {
    host : 'localhost',
    user : 'root',
    password : '123456',
    port : 3306,
    database: 'laststop'
}, 'single'));

// Middlewares - watch User session
app.use((req, res, next) => { 
    res.header("Access-Control-Allow-Origin", "*");
    if (req.path != '/login' && req.method != 'POST'){ 
        if(!req.session.email && !req.session.userid && !req.session.name && !req.session.isadmin) {
            // VERIFY SESSION VARIABLES
            res.status(400).redirect('/login');

        }else if(req.path != '/trepairs' && req.session.isadmin == 0 && req.path != '/logout'){
            res.render('accessdenied');
            return;
        }
    }
    next()
  });
  
// Routes
app.get('/', function(req, res, next){
    res.render('home');
    next()
});

app.get('/login', function(req,res, next){
    try {
        //res.render('login');
        // If it is, we will redirect to the admin page.
        if(req.session.email) {
            res.redirect('/');
            return;
        }
        
    res.render('login');
    next()
    } catch (error) {
        console.log(error);
    }
});

app.post('/login', function (req, res, next) {
    try {
        var email = req.body.email;
        var encryptedPass = sha256(req.body.password);
        req.getConnection((err, conn) => {

            conn.query('SELECT id, name, email, password, isadmin FROM users WHERE email = ? AND password = ?', 
            [email, encryptedPass], (err, users) => {
             if (err)
              res.json(err);

             // res.status(200).json({ users: users }); // Returning a Json
                var user = users[0];

                if (user){ // User is correct
                    // Creating session variables
                    req.session.userid = user.id;
                    req.session.email = req.body.email;
                    req.session.name = user.name;
                    req.session.isadmin = user.isadmin;

                    if(user.isadmin == 1){
                        res.redirect('/');
                    }else if(user.isadmin == 0){
                        res.redirect('/trepairs');
                    }
                }else{
                    res.render('login', {error: 'Error Login, Please try again'});
                } 
                
            });
          });

    } catch (error) {
        console.log(error)
    }
});

app.get('/trepairs', function(req, res, next){
    res.render('trepairs');
});

app.get('/accessdenied', function (req, res, next) {
    res.render('accessdenied');
    next()
})

app.get('/logout', function (req, res, next) {
    // if the user logs out, destroy all of their individual session
	// information
	req.session.destroy((err) => {
        if(err){
            console.log(err);
        }else{
            res.redirect('/login');
            return;
        }
    });
});

app.get('/users', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, email, phone, createdate, isadmin FROM users', (err, users) => {
            if (err)
                res.json(err);

            res.status(200).render('users', { data: users });

        });
    });
});

app.post('/adduser', function (req, res, next) {
    req.getConnection((err, conn) => {
        var data = req.body;
        data.createdate = getDateTime();
        data.password = sha256(req.body.password)
        conn.query('INSERT INTO users set ?', [data], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ res: 'User saved success' });
            console.log('User saved success');

        });
    });
});

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.listen(3000, () => {
    console.log('running server');
});

// Some functions
function arrayContain(arr, element) {
    // Check if array contain a element
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === element) {
            return true;
        }
    }
    return false;
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}