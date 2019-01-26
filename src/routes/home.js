const express = require('express');
const router = express.Router();
const utils = require('../utils/utils');
const homeController = require('../controllers/homeController');

router.get('/', homeController.homeGet);

module.exports = router;