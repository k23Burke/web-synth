var app = require('express')();
var fs = require('fs');


app.get('/', function (req, res, next) {
	res.sendFile(__dirname + '/index.html');
});
app.get('/', function (req, res, next) {
	resSendFile(__dirname + '/img/woodGrainTexture.jpg');
});

app.get('/css/main.css', function (req, res, next) {
	res.sendFile(__dirname + '/css/main.css');
});
app.get('/js/midiscratch.js', function (req, res, next) {
	res.sendFile(__dirname + '/js/midiscratch.js');
});

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
});
