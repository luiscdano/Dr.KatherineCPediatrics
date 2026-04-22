const { sendWhatsAppMessage } = require('../services/whatsappService');

async function sendMessageController(req, res, next) {
  try {
    const { to, message } = req.body;
    const response = await sendWhatsAppMessage(to, message);

    return res.status(200).json({
      ok: true,
      data: response,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendMessageController,
};
