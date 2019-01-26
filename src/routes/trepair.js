const express = require('express');
const router = express.Router();

const trepairsController = require('../controllers/trepairController');

router.get('/trepairs', trepairsController.trepairsGet);

module.exports = router;