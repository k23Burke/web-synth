var app = require('express')();

app.get('/', function (req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/css/main.css', function (req, res, next) {
	res.sendFile(__dirname + '/css/main.css');
});
app.get('/js/midiscratch.js', function (req, res, next) {
	res.sendFile(__dirname + '/js/midiscratch.js');
});

app.get('favicon.ico', function (req, res, next) {
	res.sendFile(__dirname + '/img/main.css');
});
var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
});
