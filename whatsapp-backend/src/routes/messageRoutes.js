const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { sendMessageController } = require('../controllers/messageController');
const validateSendMessageRequest = require('../middlewares/validateSendMessageRequest');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

const router = express.Router();

router.post('/', apiKeyAuth, validateSendMessageRequest, asyncHandler(sendMessageController));

module.exports = router;
