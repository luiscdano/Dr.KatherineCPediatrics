const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');
const { defaultLimiter } = require('./middlewares/rateLimiter');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked by policy.'));
    },
  })
);
app.use(
  express.json({
    limit: '1mb',
    verify(req, _res, buffer) {
      req.rawBody = Buffer.from(buffer);
    },
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);
app.use(defaultLimiter);

app.use('/', routes);

app.use(notFoundHandler);
app.use(errorHandler);

logger.info('app_initialized', {
  environment: config.env,
  port: config.port,
});

module.exports = app;
