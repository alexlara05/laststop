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
app.use(session({ secret: '12dfdfdfsd.aj.l&&3456', resave: true, saveUninitialized: true }));

// register the bodyParser middleware for processing forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middlewares
app.use(morgan('dev')); // watching file changes
app.use(mySqlConnection(mysql, {
    host: 'localhost',
    user: 'root',
    password: '123456',
    port: 3306,
    database: 'laststop'
}, 'single'));

// Middlewares - watch User session
app.use((req, res, next) => {
    app.locals.userrol = req.session.isadmin; // Creating a Global var for request from view
    res.header("Access-Control-Allow-Origin", "*");
    if (req.path != '/login' && req.method != 'POST') {
        if (!req.session.email && !req.session.userid && !req.session.name && !req.session.isadmin) {
            // VERIFY SESSION VARIABLES
            res.status(400).redirect('/login');

        } else if (req.path != '/trepairs' && req.session.isadmin == 0 && req.path != '/logout') {
            res.render('accessdenied');
            return;
        }
    }
    next()
});

// Routes
app.get('/', function (req, res, next) {
    res.render('home');
    next()
});

app.get('/login', function (req, res, next) {
    try {
        //res.render('login');
        // If it is, we will redirect to the admin page.
        if (req.session.email) {
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

                    if (user) { // User is correct
                        // Creating session variables
                        req.session.userid = user.id;
                        req.session.email = req.body.email;
                        req.session.name = user.name;
                        req.session.isadmin = user.isadmin;

                        if (user.isadmin == 1) {
                            res.redirect('/');
                        } else if (user.isadmin == 0) {
                            res.redirect('/trepairs');
                        }
                    } else {
                        res.render('login', { error: 'Error Login, Por favor intente de nuevo' });
                    }

                });
        });

    } catch (error) {
        console.log(error)
    }
});

app.get('/trepairs', function (req, res, next) {
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
        if (err) {
            console.log(err);
        } else {
            res.redirect('/login');
            return;
        }
    });
});

// USERS
app.get('/users', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, email, phone, created_at, isadmin FROM users', (err, users) => {
            if (err)
                res.json(err);

            res.status(200).render('users', { data: users, isadmin: req.session.isadmin });

        });
    });
});

app.post('/add_user', function (req, res, next) {
    req.getConnection((err, conn) => {
        var data = req.body;
        data.created_at = getDateTime();
        data.password = sha256(req.body.password);

        conn.query('SELECT * FROM users WHERE email = ?', [req.body.email], (err, users) => {
            if (err)
                res.json(err);

            if (users.length > 0) {
                // There is already a user with this email in the database
                res.status(200).json({
                    userexist: true,
                    message: 'Ya existe un usuario con esta correo electronico'
                });
                console.log('Ya existe un usuario con este correo');
            } else {
                conn.query('INSERT INTO users set ?', [data], (err, users) => {
                    if (err)
                        res.json(err);

                    res.status(200).json({
                        userexist: false,
                        message: 'El usuario ha sido creado'
                    });
                    console.log('User has been saved success');
                });
            }
        });

    });
});

app.post('/delete_user/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('DELETE FROM users WHERE id = ?', [req.params.id], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ message: 'Usuario eliminado' });
        });
    });
});

app.get('/edit_user/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, email, phone, isadmin FROM users WHERE id = ?', [req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: user });
        });
    });
});

app.post('/edit_user/:id', function (req, res, next) {
    var usr = req.body;
    usr.password = sha256(usr.password);
    req.getConnection((err, conn) => {
        conn.query('UPDATE users set ? where id = ?', [usr, req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: 'Usuario Actualizado' });
        });
    });
});
// end users

// DEVICES
app.get('/devices', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, image FROM devices', (err, devices) => {
            if (err)
                res.json(err);

            res.status(200).render('devices', { data: devices });
        });
    });
});

app.post('/add_device', function (req, res, next) {
    req.getConnection((err, conn) => {

        conn.query('SELECT * FROM devices WHERE name = ?', [req.body.name], (err, devices) => {
            if (err)
                res.json(err);

            if (devices.length > 0) {
                // There is already a device with this name in the database
                res.status(200).json({
                    deviceexist: true,
                    message: 'Ya existe un dispositivo con este nombre'
                });
            } else {
                conn.query('INSERT INTO devices set ?', [req.body], (err, devices) => {
                    if (err)
                        res.json(err);

                    res.status(200).json({
                        deviceexist: false,
                        message: 'Se ha creado el nuevo dispositivo'
                    });
                });
            }
        });

    });
});

app.post('/delete_device/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('DELETE FROM devices WHERE id = ?', [req.params.id], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ message: 'Dispositivo eliminado' });
        });
    });
});

app.get('/edit_device/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, image FROM devices WHERE id = ?', [req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: user });
        });
    });
});

app.post('/edit_device/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('UPDATE devices set ? where id = ?', [req.body, req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: 'Dispositivo Actualizado' });
        });
    });
});
// end Devices

// DEVICES TYPES
app.get('/devices_types', function (req, res, next) {
    let  sql = 'SELECT devices_types.id, devices.name device, devices.image, devices_types.name FROM devices_types ';
    sql += 'INNER JOIN devices ON devices_types.device_id = devices.id;'
    req.getConnection((err, conn) => {
        conn.query(sql, (err, devices_types) => {
            if (err)
                res.json(err);

            res.status(200).render('devices_types', { data: devices_types });

        });
    });
});

app.get('/device_list', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, image FROM devices', (err, devices) => {
            if (err)
                res.json(err);

            res.status(200).json({ data: devices });
        });
    });
});

app.post('/add_device_type', function (req, res, next) {
    req.getConnection((err, conn) => {

        conn.query('SELECT * FROM devices_types WHERE name = ? AND device_id = ?', [req.body.name, req.body.device_id], (err, devices) => {
            if (err)
                res.json(err);

            if (devices.length > 0) {
                // There is already a device with this name in the database.
                res.status(200).json({
                    deviceexist: true,
                    message: 'Ya existe un electrodomestico con este nombre'
                });
            } else {
                conn.query('INSERT INTO devices_types set ?', [req.body], (err, devices) => {
                    if (err)
                        res.json(err);

                    res.status(200).json({
                        deviceexist: false,
                        message: 'Se ha creado un nuevo tipo de electrodomestico'
                    });
                });
            }
        });

    });
});

app.post('/delete_device_type/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('DELETE FROM devices_types WHERE id = ?', [req.params.id], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ message: 'Dispositivo eliminado' });
        });
    });
});

app.get('/edit_device_type/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, device_id FROM devices_types WHERE id = ?', [req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: user });
        });
    });
});

app.post('/edit_device_type/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('UPDATE devices_types set ? where id = ?', [req.body, req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: 'Dispositivo Actualizado' });
        });
    });
});
// End Devices Types
// MANUFACTURER
app.get('/manufacturers', function (req, res, next) {
    let  sql = 'SELECT manufacturers.id, devices.name device, devices.image, manufacturers.name, manufacturers.logo FROM manufacturers';
    sql += ' INNER JOIN devices ON manufacturers.device_id = devices.id;';
    req.getConnection((err, conn) => {
        conn.query(sql, (err, manufacturers) => {
            if (err)
                res.json(err);

            res.status(200).render('manufacturers', { data: manufacturers });
        });
    });
});

app.post('/add_manufacturer', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT * FROM manufacturers WHERE name = ? AND device_id = ?', [req.body.name, req.body.device_id], (err, devices) => {
            if (err)
                res.json(err);

            if (devices.length > 0) {
                // There is already a device with this name in the database.
                res.status(200).json({
                    deviceexist: true,
                    message: 'Ya existe una marca con este nombre para este electrodomestico'
                });
            } else {
                conn.query('INSERT INTO manufacturers set ?', [req.body], (err, devices) => {
                    if (err)
                        res.json(err);

                    res.status(200).json({
                        deviceexist: false,
                        message: 'Se ha creado una nueva marca para este electrodomestico'
                    });
                });
            }
        });

    });
});

app.post('/delete_manufacturer/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('DELETE FROM manufacturers WHERE id = ?', [req.params.id], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ message: 'Marca eliminada' });
        });
    });
});

app.get('/edit_manufacturer/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, logo, device_id FROM manufacturers WHERE id = ?', [req.params.id], (err, manufacturer) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: manufacturer });
        });
    });
});

app.post('/edit_manufacturer/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('UPDATE manufacturers set ? where id = ?', [req.body, req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: 'Marca Actualizada' });
        });
    });
});
// End MANUFACTURERS
// BREAKDOWNS
app.get('/breakdowns', function (req, res, next) {
    let  sql = 'SELECT breakdowns.id, devices.name device, devices.image, breakdowns.name FROM breakdowns ';
    sql += 'INNER JOIN devices ON breakdowns.device_id = devices.id;';
    req.getConnection((err, conn) => {
        conn.query(sql, (err, breakdowns) => {
            if (err)
                res.json(err);

            res.status(200).render('breakdowns', { data: breakdowns });
        });
    });
});

app.post('/add_breakdown', function (req, res, next) {
    req.getConnection((err, conn) => {

        conn.query('SELECT * FROM breakdowns WHERE name = ? AND device_id = ?', [req.body.name, req.body.device_id], (err, devices) => {
            if (err)
                res.json(err);

            if (devices.length > 0) {
                // There is already a device with this name in the database.
                res.status(200).json({
                    deviceexist: true,
                    message: 'Ya existe una falla para este electrodomestico con este nombre'
                });
            } else {
                conn.query('INSERT INTO breakdowns set ?', [req.body], (err, devices) => {
                    if (err)
                        res.json(err);

                    res.status(200).json({
                        deviceexist: false,
                        message: 'Se ha creado una nueva falla de electrodomestico'
                    });
                });
            }
        });

    });
});

app.post('/delete_breakdown/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('DELETE FROM breakdown WHERE id = ?', [req.params.id], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ message: 'Dispositivo eliminado' });
        });
    });
});

app.get('/edit_breakdown/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, device_id FROM breakdowns WHERE id = ?', [req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: user });
        });
    });
});

app.post('/edit_breakdown/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('UPDATE breakdowns set ? where id = ?', [req.body, req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: 'Falla Actualizada' });
        });
    });
});
// End BREAKDOWNS
// CLIENTS
app.get('/clients', function (req, res, next) {
    let  sql = 'SELECT states.STATEID statecode, states.FULLNAME statename, clients.id, clients.name, clients.lastname, clients.phone, clients.company, clients.address, clients.city, clients.zipcode, clients.email, clients.apt_unit, clients.created_at, clients.comments FROM clients ' 
    sql += 'INNER JOIN states ON states.STATEID = clients.state_id;';
    req.getConnection((err, conn) => {
        conn.query(sql, (err, clients) => {
            if (err)
                res.json(err);

            res.status(200).render('clients', { data: clients });
        });
    });
});

app.post('/add_client', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT * FROM clients WHERE name = ? AND lastname = ?', [req.body.name, req.body.lastname], (err, clients) => {
            if (err)
                res.json(err);

            if (clients.length > 0) {
                // This client exist in database
                res.status(200).json({
                    stateexist: true,
                    message: 'Ya existe un cliente con este nombre'
                });
            } else {
                conn.query('INSERT INTO clients set ?', [req.body], (err, clients) => {
                    if (err)
                        res.json(err);

                    res.status(200).json({
                        stateexist: false,
                        message: 'Se ha creado un nuevo cliente'
                    });
                });
            }
        });

    });
});

app.post('/delete_client/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('DELETE FROM clients WHERE id = ?', [req.params.id], (err, users) => {
            if (err)
                res.json(err);

            res.status(200).json({ message: 'Cliente eliminado' });
        });
    });
});

app.get('/states', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT * from states', (err, states) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: states });
        });
    });
});

app.get('/edit_client/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('SELECT id, name, lastname, phone, company, city, address, apt_unit, state_id, comments FROM clients WHERE id = ?', [req.params.id], (err, client) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: client });
        });
    });
});

app.post('/edit_client/:id', function (req, res, next) {
    req.getConnection((err, conn) => {
        conn.query('UPDATE clients set ? where id = ?', [req.body, req.params.id], (err, user) => {
            if (err)
                res.json(err);
    
            res.status(200).json({ data: 'Cliente Actualizado' });
        });
    });
});
// End CLIENTS

// Static Files
app.use('/public', express.static(__dirname + '/public'));
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

    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}
