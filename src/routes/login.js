const express = require('express');
const router = express.Router();

const loginController = require('../controllers/loginController');

router.get('/login', loginController.loginGet);

router.post('/login', loginController.loginPost);

router.get('/logout', loginController.logoutGet);

module.exports = router;