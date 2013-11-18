var async = require('async');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var cuid = require('cuid');

var enumeration = {
	cuid : 'CUID'
	, status : {
		ok : 'OK'
	}
	, component : {
		city : 'locality'
		, state : 'administrative_area_level_1'
	}
	, collections : {
		data : 'DATA'
		, date : 'DATE'
		, weather : 'WEATHER'
		, stock : 'STOCK'
		, translate : 'TRANSLATE'
		, movies : 'MOVIES'
		, news : 'NEWS'
	}
};

function cleanArray(_array){
	var result = [];
	try{
		if(typeof _array == 'object'){
			for(var i in _array) {
				if(_array[i]){
					result.push(_array[i]);
				}
				else if(!_array[i] && typeof _array[i] == 'boolean'){
					result.push(_array[i]);
				}
			}
		}
	} catch(error){
		console.log(error);
	}
	return result;
}
function parseCookie(content, key){
	try{
		if(typeof key == 'string' && key != ''){
			var items = (content || '').split(';');
			for(var i in items){
				var item = [];
				item.push(items[i].split('=', 1)[0] || ''); // key
				item.push(items[i].replace(key + '=', '') || ''); // value
				if(item.length == 2 && item[0].toUpperCase() == key.toUpperCase()){
					return item[1];
				}
			}
		}
	} catch(error){
		console.log(error);
	}
	return '';
}
function encodeString(string){
	return string.toString().replace(' ', '+').replace('%20', '+');
}
function sendRequest(options, callback){
	var request = http.request(options, function(response){
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
	request.end();
}
function geocodeAPI(location, callback){
	var options = {
		host: 'maps.googleapis.com'
		, port: 80
		, path: '/maps/api/geocode/json?address=' + location.toLowerCase().replace(' ', '+') + '&sensor=false'
		, method: 'GET'
	};
	sendRequest(options, callback);
}
/*
function weatherAPI(location, callback){
	var options = {
		host: 'api.openweathermap.org'
		, port: 80
		, path: '/data/2.5/weather' + location
		, method: 'GET'
	};
	sendRequest(options, callback);
}
*/
function weatherAPI(location, callback){
	var options = {
		host: 'api.geonames.org'
		, path: '/findNearByWeatherJSON?lat=' + location.lat + '&lng=' + location.lng + '&username=' + location.usr
		, method: 'GET'
	};
	sendRequest(options, callback);
}
function timezoneAPI(location, callback){
	var options = {
		host: 'api.geonames.org'
		, path: '/timezoneJSON?lat=' + location.lat + '&lng=' + location.lng + '&username=' + location.usr
		, method: 'GET'
	};
	sendRequest(options, callback);
}
function eventsAPI(location, callback){
	//Eventful
	//Facebook
	//Eventbrite
	//Evently
	var options = {
		host: 'www.google.com'
		, port: 80
		, path: '/#q=' + location
		, method: 'GET'
	};
	console.log('*************************************');
	console.log(options.path);
	console.log('*************************************');
	sendRequest(options, callback);
}

//eventEmitter.on('incomingMessage', handleRequest);

// ********************************************************************
var http = require('http');
var webserver = http.createServer(function(request, response){
	that.results = {};
	var _cuid = parseCookie((((request || {}).headers || {}).cookie || ''), enumeration.cuid);
	request._cuid = _cuid ? _cuid : cuid(); //cuid.slug();
	
	request._url = (request || {}).url || '';
	var _location = encodeString(cleanArray((request._url.split('?')[0] || '').split('/'))[0]);
	
	console.log(_location);
	
	console.log('here 1');
	geocodeAPI(_location, function(data){
		console.log('here 3');
		console.log(data);
		try{
			that.results.detail = JSON.parse(data);
		} catch(error){
			that.results.detail = {};
		}
		if(typeof that.results.detail.results != 'undefined' && Array.isArray(that.results.detail.results) && that.results.detail.results.length > 0 && that.results.detail.status == enumeration.status.ok){
			for(var i in that.results.detail.results){
				var result = that.results.detail.results[i];
				var latitude = result.geometry.location.lat.toString();
				var longitude = result.geometry.location.lng.toString();
				
				console.log(latitude + ',' + longitude);
				
				if(latitude && longitude){
					weatherAPI({lat : latitude, lng : longitude, usr : 'hikumealan'}, function(_data){
						console.log('here 4');
						console.log(_data);
						try{
							result.weather = JSON.parse(_data);
						} catch(error){
							result.weather = {};
						}
					});
					timezoneAPI({lat : latitude, lng : longitude, usr : 'hikumealan'}, function(_data){
						console.log('here 5');
						console.log(_data);
						try{
							result.timezone = JSON.parse(_data);
						} catch(error){
							result.timezone = {};
						}
					});
				}
			}
		}
		else{
			// TODO: Handle error
		}
	});
	console.log('here 2');
	response.writeHead(200, {
		'Content-Type': 'text/plain'
		, 'Set-Cookie': enumeration.cuid + '=' + request._cuid,
	});
	response.write(JSON.stringify(that.results));
});
webserver.listen(8080);
console.log('HTTP Server running at http://localhost:8080/');
console.log('pid = ' + process.pid.toString());
/*
// ********************************************************************
// HTTPS WEB SERVER
// ********************************************************************
var https = require('https');

// ********************************************************************
// WEB SOCKET SERVER
// ********************************************************************
var net = require('net');
var socketserver = net.createServer(function (socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
});
socketserver.listen(8888, '127.0.0.1');
console.log('Web Socket Server running at http://127.0.0.1:8888/');

// ********************************************************************
// REDIS SERVER
// ********************************************************************
var redis = require('redis');
var redisClient = redis.createClient();
redisClient.on('connect', function(){
	console.log('Redis has connected');
});
redisClient.on('ready', function(){
	console.log('Redis is ready');
});
redisClient.on('error', function(error){
	console.log('Redis has an error');
});
redisClient.on('end', function(){
	console.log('Redis has disconnected');
});

// ********************************************************************
var usage = require('usage');
var cuid = require('cuid');

// ********************************************************************
var enumeration = {
	cuid : 'CUID'
};

//console.log(process);
//console.log(process.env);
var pid = process.pid;

// ********************************************************************
function cleanArray(_array){
	var result = [];
	if(typeof _array == 'object'){
		for(var i in _array) {
			if(_array[i]){
				result.push(_array[i]);
			}
			else if(!_array[i] && typeof _array[i] == 'boolean'){
				result.push(_array[i]);
			}
		}
	}
	return result;
}

// ********************************************************************
setInterval(function(){
	var heartbeat = new Date().getTime();
	//console.log('Timestamp ' + heartbeat.toString());
	//console.log(pid);
	var info = usage.lookup(pid, function(error, data) {
		//console.log(data);
	 });
}, 1000);

function parseCookie(content, key){
	try{
		if(typeof key == 'string' && key != ''){
			var items = (content || '').split(';');
			for(var i in items){
				var item = [];
				item.push(items[i].split('=', 1)[0] || ''); // key
				item.push(items[i].replace(key + '=', '') || ''); // value
				if(item.length == 2 && item[0].toUpperCase() == key.toUpperCase()){
					return item[1];
				}
			}
		}
	} catch(error){
		console.log(error);
	}
	return '';
}

function manageRequest(protocol, request, response){
	switch(protocol.toString().toUpperCase()){
		case 'HTTP':
			//http://maps.googleapis.com/maps/api/geocode/json?address=orlando,+fl&sensor=false
			
			
			var _cuid = parseCookie((((request || {}).headers || {}).cookie || ''), enumeration.cuid);
			request._cuid = _cuid ? _cuid : cuid(); //cuid.slug();
			request._url = (request || {}).url || '';
			result = manageHTTP(request);
			if(result.status == 200){
				response.writeHead(200, {
					'Content-Type': 'text/plain'
					, 'Set-Cookie': enumeration.cuid + '=' + result.cuid,
				});
				response.write(JSON.stringify(result));
			}
			else{
				response.writeHead(404, {
					'Content-Type': 'text/plain'
				});
			}
		break;
		case 'HTTPS':
			result = manageHTTPS(request);
		break;
		case 'WS':
			result = manageWS(request);
		break;
		case 'WSS':
			result = manageWSS(request);
		break;
		default:
			
		break;
	}
	manageResponse(protocol, request, response, result);
}

function manageResponse(protocol, request, response, result){
	switch(protocol.toString().toUpperCase()){
		case 'HTTP':
			response.end();
		break;
		case 'HTTPS':
			
		break;
		case 'WS':
			
		break;
		case 'WSS':
			
		break;
		default:
			
		break;
	}
}


function manageHTTP(request){
	var result = {};
	var parameterArray = cleanArray((request._url.split('?')[0] || '').split('/')).concat(cleanArray((request._url.split('?')[1] || '').split('&')));
	var collection = cleanArray((request._url.split('?')[0] || '').split('/'))[0];
	var input = cleanArray((request._url.split('?')[0] || '').split('/'))[1];
	// http://stackoverflow.com/questions/9577611/http-get-request-in-node-js-express
	switch(collection.toUpperCase()){
		// https://groups.google.com/forum/#!topic/google-help-dataapi/_LbVB5dCXiQ
		case 'DATE':
			http.request(options, function(response){
				var output = '';
				response.setEncoding('utf8');
				response.on('data', function(chunk){
					output += chunk;
				});

				response.on('end', function(){
					var obj = JSON.parse(output);
					onResult(response.statusCode, obj);
				});
			});
			req.on('error', function(err) {
				//res.send('error: ' + err.message);
			});
		break;
		case 'WEATHER':
			
		break;
		case 'STOCK':
			
		break;
		case 'MOVIES':
			
		break;
		case 'NEWS':
			
		break;
		case 'TRANSLATE':
			
		break;
		default:
			// TODO: try to serve the requested file
		break;
	}
	// TODO: Handle Response
	result.cuid = request._cuid;
	result.url = request._url;
	result.method = (request || {}).method || '';
	result.headers = (request || {}).headers || {};
	result.param = cleanArray((request._url.split('?')[0] || '').split('/'));
	result.query = cleanArray((request._url.split('?')[1] || '').split('&'));
	//result.connection = (request || {}).connection || {}; // Causes circular reference
	//ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
	switch(result.method.toString().toUpperCase()){
		// http://microformats.org/wiki/rest/urls
		case 'GET':
			// TODO: Select Record from Redis
			redisClient.get(result.cuid + '_' + collection, function (error, record){
				console.log(record);
			});
		break;
		case 'PUT':
			// TODO: Update Record from Redis
			//redisClient.set(result.cuid + '_' + collection, '', redis.print);
		//break;
		case 'POST':
			// TODO: Insert Record from Redis
			redisClient.set(result.cuid + '_' + collection, '', redis.print);
			redisClient.expire(result.cuid + '_' + collection, (60 * 15) ); // Redis Expiration in Seconds
		break;
		case 'DELETE':
			// TODO: Delete Record from Redis
			redisClient.set(result.cuid + '_' + collection, '', redis.print);
		break;
		default:
			// TODO: Handle the unhandled case
		break;
	}
	result.status = 200;
	//result.status = 404;
	return result;
}

// ********************************************************************
function start(){
	// TODO: create services for both HTTP and WebSocket Servers
}

// ********************************************************************


exports.start = start;
*/


/*



				var city = '';
				var state = '';
				if(data.results[i].address_components){
					var _address_components = data.results[i].address_components;
					for(var j in _address_components){
						if(_address_components[j].types){
							var _types = _address_components[j].types;
							var city_flag = false;
							var state_flag = false;
							for(var k in _types){
								if(!city_flag && _types[k] == enumeration.component.city){
									city = _address_components[j].long_name;
									city_flag = true;
								}
								if(!state_flag && _types[k] == enumeration.component.state){
									state = _address_components[j].short_name;
									state_flag = true;
								}
							}
						}
					}
					
					console.log('city = ' + city);
					console.log('state = ' + state);
					
					if(city && state){
						var location = encodeString(city + '+' + state + '+events');
						
						console.log(location);
						
						eventsAPI(location, function(_data){
							console.log(_data);
							
							try{
								_data = JSON.parse(_data);
							} catch(error){
								_data = {};
							}
							data.results[i].events = _data;
							
						});
					}
				}
				else{
					data.results[i].events = {};
				}
				
				
				
				
				
	// http://stackoverflow.com/questions/9577611/http-get-request-in-node-js-express
	switch(request._collection.toUpperCase()){
		case enumeration.collections.weather:
			
		break;
		case enumeration.collections.data:
			
		break;
		// https://groups.google.com/forum/#!topic/google-help-dataapi/_LbVB5dCXiQ
		case enumeration.collections.date:
			
		break;
		case enumeration.collections.stock:
			
		break;
		case enumeration.collections.translate:
			
		break;
		case enumeration.collections.movies:
			
		break;
		case enumeration.collections.news:
			
		break;
		default:
			// TODO: try to serve the requested file
		break;
	}
	// TODO: Handle Response
	result.cuid = request._cuid;
	result.url = request._url;
	result.method = (request || {}).method || '';
	result.headers = (request || {}).headers || {};
	result.param = cleanArray((request._url.split('?')[0] || '').split('/'));
	result.query = cleanArray((request._url.split('?')[1] || '').split('&'));
	//result.connection = (request || {}).connection || {}; // Causes circular reference
	//ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
	
	
	result = manageHTTP(request);
	
	
	
	if(result.status == 200){
		response.writeHead(200, {
			'Content-Type': 'text/plain'
			, 'Set-Cookie': enumeration.cuid + '=' + result.cuid,
		});
		response.write(JSON.stringify(result));
	}
	else{
		response.writeHead(404, {
			'Content-Type': 'text/plain'
		});
	}
	
	//manageRequest('HTTP', request, response);
	
	//http://www.google.com/ig/api?movies=orlando
	//http://www.google.com/ig/api?stock=YHOO
	//http://www.google.com/ig/api?news
	//http://www.google.com/ig/api?movies=92078
	//http://www.google.com/ig/api?weather=92078
	//http://www.google.com/ig/api?stock=GOOG
	//http://www.google.com/ig/api?news 
	
	var location = 'Orlando, FL';
	var options = {
		host: 'maps.googleapis.com'
		, port: 80
		, path: '/maps/api/geocode/json?address=' + location.toLowerCase().replace(' ', '+') + '&sensor=false'
		, method: 'GET'
	};
	
	//https://www.google.com/#q=orlando+events
	//ul class="klcar"
	//560e89890dfa1e25301e53c4ef3b1c45
	
	
	function handleResults(data){
		
	}
*/
