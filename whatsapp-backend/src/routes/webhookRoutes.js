const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verifyWebhook, receiveWebhook } = require('../controllers/webhookController');
const validateWebhookPayload = require('../middlewares/validateWebhookPayload');
const verifyWebhookSignature = require('../middlewares/verifyWebhookSignature');

const router = express.Router();

router.get('/', asyncHandler(verifyWebhook));
router.post('/', verifyWebhookSignature, validateWebhookPayload, asyncHandler(receiveWebhook));

module.exports = router;
