const express = require('express');
const healthRoutes = require('./healthRoutes');
const webhookRoutes = require('./webhookRoutes');
const messageRoutes = require('./messageRoutes');
const { webhookLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/webhook', webhookLimiter, webhookRoutes);
router.use('/api/messages', messageRoutes);

module.exports = router;
