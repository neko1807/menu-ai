const express = require('express');
const { recommend } = require('../controllers/recommendController');

const router = express.Router();

router.post('/recommend', recommend);

module.exports = router;
