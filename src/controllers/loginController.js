const sha256 = require('sha256');
const controller = {};

controller.loginGet = (req, res) => {
    try {
        //res.render('login');
        // If it is, we will redirect to the admin page.
        if(req.session.email) {
            res.redirect('/');
            return;
        }
        
    res.render('login');
    } catch (error) {
        console.log(error);
    }
};

controller.loginPost = (req, res, next) => {
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
};

controller.logoutGet = (req, res) => {
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
}

module.exports = controller;