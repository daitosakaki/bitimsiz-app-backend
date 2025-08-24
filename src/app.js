const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config');
const { jwtStrategy } = require('./config/passport');
const { morganMiddleware } = require('./config/logger');
const v1Routes = require('./api/v1');
const { errorConverter, errorHandler } = require('./middlewares/error.handler');
const ApiError = require('./utils/ApiError');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const app = express();

if (config.env !== 'test') {
  app.use(morganMiddleware);
}

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.options('*', cors());

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

app.use('/api/v1', v1Routes);

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;