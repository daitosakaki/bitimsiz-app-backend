const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const postRoutes = require('./posts.routes');
const chatRoutes = require('./chats.routes');
const messageRoutes = require('./messages.routes');

const router = express.Router();

const defaultRoutes = [
  { path: '/auth', route: authRoutes },
  { path: '/users', route: userRoutes },
  { path: '/posts', route: postRoutes },
  { path: '/chats', route: chatRoutes },
  { path: '/messages', route: messageRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;