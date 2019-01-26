const controller = {};
const utils = require('../utils/utils');
controller.list = (req, res, next) => {

    req.getConnection((err, conn) => {
      conn.query('SELECT * FROM users', (err, users) => {
       if (err)
        res.json(err);
        
       res.status(200).render('users', {data: users});
      });
    });

  };

module.exports = controller;