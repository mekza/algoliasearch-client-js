module.exports = blackhole;

var express = require('express');

function blackhole() {
  var router = express.Router();

  router.get('/', function() {

  });

  return router;
}
