const controller = {};

const utils = require('../utils/utils');

controller.homeGet = (req, res, next) => {
    //var rte = utils.isAuthenticated(req, res);
    res.render('home');
};

module.exports = controller;