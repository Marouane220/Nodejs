const server = require('./server');

const io = require ("socket.io-client");

let socket = io.connect("http://localhost:8888");
