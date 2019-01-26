const controller = {};

const utils = require('../utils/utils');

controller.trepairsGet = (req, res, next) => {
    //utils.isAuthenticated(req, res, next, 'trepairs');
    res.status(200).render('trepairs');
};

module.exports = controller;