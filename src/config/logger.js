const winston = require('winston');
const morgan = require('morgan');

// Log seviyelerini ve renklerini tanımlayalım
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Ortama göre log formatını belirle
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Production ortamındaysak JSON formatında, değilse renkli ve basit formatta logla
  process.env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(winston.format.colorize(), winston.format.simple())
);

// Logların nereye yazılacağını belirleyen transport'lar
const transports = [
  // Her zaman konsola yaz. Cloud Run, konsol loglarını otomatik olarak yakalar.
  new winston.transports.Console(),
];

// Winston logger'ımızı oluşturalım
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'http' : 'debug', // Production'da sadece http ve üstü, dev'de her şeyi logla
  levels,
  format,
  transports,
});

// Morgan'ı Winston'a yönlendirmek için bir stream objesi oluşturalım
// Bu, gelen tüm HTTP isteklerinin 'http' seviyesinde loglanmasını sağlar.
const morganStream = {
  write: (message) => logger.http(message.trim()),
};

// Morgan için bir format belirleyelim
// :remote-addr - :method :url :status :res[content-length] - :response-time ms
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

// Morgan middleware'ini Winston stream'i ile birlikte export edelim
const morganMiddleware = morgan(morganFormat, { stream: morganStream });

module.exports = {
  logger,
  morganMiddleware,
};