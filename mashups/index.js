var http = require('http');

/*
var handleRequest = function(req, res){
	res.writeHead(200, {'Content-Type': 'text-plain'});
	res.end();
};
var server = http.createServer(handleRequest);
server.listen(3000, 'localhost');
*/

/*
var express = require('express');
var app = express();
app.get('/', function(req, res){
	res.end();
});
http.createServer(app).listen(3000);
*/
//http://www.geonames.org/export/ws-overview.html
module.exports = function(){
	var sendRequest = function(request, callback){
		var connection = http.request(request, function(response){
			var data = '';
			response.setEncoding('utf8');
			response.on('data', function(chunk){
				data += chunk;
			});
			response.on('error', function(error){
				handleResults(error);
			});
			response.on('end', function(){
				callback(data);
			});
		});
		connection.end();
	};
};


/*
var whisper = function(message){
	console.log(message.toLowerCase());
};
// individually call the properties
exports.softly = whisper;
experts.loudly = function(message){
	console.log(message.toUpperCase());
};
*/