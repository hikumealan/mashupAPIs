var CONSTANT = {
	favicon : '/favicon.ico'
	, cuid : 'CUID'
	, googleapis : {
		geocode : {
			status : {
				ok : 'OK'
			}
			, default : 'address'
		}
	}
	//, component : {
	//	city : 'locality'
	//	, state : 'administrative_area_level_1'
	//}
	//, collections : {
	//	data : 'DATA'
	//	, date : 'DATE'
	//	, weather : 'WEATHER'
	//	, stock : 'STOCK'
	//	, translate : 'TRANSLATE'
	//	, movies : 'MOVIES'
	//	, news : 'NEWS'
	//}
};
var secrets = require('./secrets');

//var geocode = require('./geocode');

var underscore = require('underscore');
//var async = require('async');
//var request = require('request');

// TODO: Use optimist to take arguments for the caching options
// caching options - Redis || MongoDB
//var optimist = require('optimist');

//var express = require('express');
//var commander = require('commander');
//var colors = require('colors');
//var lodash = require('lodash');
//var mkdirp = require('mkdirp');

var cuid = require('cuid');

//var redis = require('redis');
//var client = redis.createClient();
var redis = require('redis').createClient();
	redis.status = -1;
	redis.print = function(error, reply){
		if(error){
			redis.emit('error', error);
			//console.log("Error: " + error);
		}
		else{
			//redis.emit('error', reply);
			//console.log("Reply: " + reply);
		}
	};
redis.on('connect', function(){
	//eventEmitter.emit('redisStatus', 1);
	redis.status = 1;
});
redis.on('ready', function(){
	//eventEmitter.emit('redisStatus', 1);
	redis.status = 1;
});
redis.on('close', function(){
	//eventEmitter.emit('redisStatus', 0);
	redis.status = 0;
});
redis.on('end', function(){
	//eventEmitter.emit('redisStatus', 0);
	redis.status = 0;
});
redis.on('error', function(error){
	if(redis.status !== 0){
		//eventEmitter.emit('redisStatus', -1);
		redis.status = -1;
	}
});

var url = require('url');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var http = require('http').createServer(function(_request, _response){
	//var httpMethod = (request || {}).method || '';
	var connection = {
		request : _request //JSON.parse(JSON.stringify(request))
		, response : _response
		, url : url.parse(_request.url).pathname.slice(1)
		, datasource : ''
		, cache : -1
		, status : 0
		, results : []
		, dependancy : {
			weather : -1
			, timezone : -1
		} 
	};
	connection.key = connection.url.split('/')[0] || '';
	connection.value = (connection.url.split('/')[1] || '').replace(' ', '+').replace('%20', '+');
	// Suppress the favicon
	if(connection.url.split('/').length >= 2 && connection.value && _request.url !== CONSTANT.favicon){
		// If Redis is running - Check if the geocode results are already in the Redis cache
		if(redis.status === 1){
			redis.get(connection.value, function(error, data){
				eventEmitter.emit('redisResponse', connection, error, data);
			});
		}
		else{
			eventEmitter.emit('geocodeRequest', connection);
		}
	}
	else{
		// Return a 404 for favicon
		connection.status = 404;
		eventEmitter.emit('httpResponse', connection, {}, {});
	}
}).listen(8888, 'localhost');
console.log('HTTP Server Start at locahost:8888');

var parseCookie = function(content, key){
	try{
		if(typeof key === 'string' && key != ''){
			var items = (content || '').split(';');
			for(var i in items){
				var item = [];
				item.push(items[i].split('=', 1)[0] || ''); // key
				item.push(items[i].replace(key + '=', '') || ''); // value
				if(item.length === 2 && item[0].toString().toUpperCase() === key.toString().toUpperCase()){
					return item[1];
				}
			}
		}
	} catch(error){
		console.log(error);
	}
	return '';
}
var getSessionUID = function(_request){
	var _cuid = parseCookie((((_request || {}).headers || {}).cookie || ''), CONSTANT.cuid);
	_cuid = _cuid ? _cuid : cuid(); //cuid.slug();
	return _cuid;
}
var serviceRequest = function(options, callback, connection, index){
	var _http = require('http');
	var _request = _http.request(options, function(_response){
		var data = '';
		var error;
		_response.setEncoding('utf8');
		_response.on('data', function(chunk){
			data += chunk;
		});
		_response.on('error', function(_error){
			error = _error;
		});
		_response.on('end', function(){
			eventEmitter.emit(callback, connection, error, data, index);
		});
	}).end();
	//});
	//_request.end();
}
var redisResponse = function(connection, error, data){
	if(error !== null){
		redis.emit('error', error);
	}
	if(data === null){
		eventEmitter.emit('geocodeRequest', connection);
	}
	else{
		connection.cache = 1;
		connection.datasource = 'Redis Cache';
		eventEmitter.emit('geocodeResponse', connection, error, data);
	}
}
var geocodeRequest = function(connection){
	var type = connection.key.toLowerCase();
	switch(type){
		case 'address':
		case 'latlng':
			// GOOD VALUES
		break;
		default:
			type = CONSTANT.googleapis.geocode.default;
		break;
	}
	// http://maps.googleapis.com/maps/api/geocode/json?address=Orlando,+FL&sensor=false
	// http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=false
	var options = {
		host: 'maps.googleapis.com'
		, port: 80
		, path: '/maps/api/geocode/json?' + type + '=' + connection.value + '&sensor=false'
		, method: 'GET'
	};
	connection.cache = 0;
	connection.datasource = 'Google API';
	serviceRequest(options, 'geocodeResponse', connection);
}
var geocodeResponse = function(connection, error, data){
	if(error){
		// TODO: Handle Error
	}
	try{
		data = JSON.parse(data);
	} catch(error){
		console.log(error);
	}
	if(data.status === CONSTANT.googleapis.geocode.status.ok && underscore.isArray(data.results)){
		// If Redis is running cache the geocode results if its not already from the cache
		if(redis.status === 1 && !connection.cache){
			// TODO: Add Expiration to the data stored in Redis
			redis.set(connection.value, JSON.stringify(data), redis.print);
		}
		for(var i in data.results){
			var lat = ((((data || {}).results[i] || {}).geometry || {}).location || {}).lat;
			var lng = ((((data || {}).results[i] || {}).geometry || {}).location || {}).lng;
			var result = {
				geocode : data.results[i]
				, lat : lat
				, lng : lng
				, weather : {}
				, timezone : {}
				//, events : {}
				//, movies : {}
			};
			connection.results.push(result);
			// TODO: Loop over Results and Gather secondary data for each Location (lat, lng)
			eventEmitter.emit('weatherRequest', connection, i);
			eventEmitter.emit('timezoneRequest', connection, i);
			/*
			async.parallel([
				function(){ ... },
				function(){ ... }
			], callback);
			*/
			// TODO: Add in an event Timeout that call the httpResponse
		}
	}
	else{
		connection.status = 200;
		connection.results = data;
		eventEmitter.emit('httpResponse', connection);
	}
}
var weatherRequest = function(connection, index){
	//console.log('weatherRequest')
	//console.log(arguments);
	var host = 'api.geonames.org';
	var options = {
		host: host
		, port: 80
		, path: '/findNearByWeatherJSON?lat=' + connection.results[index].lat.toString() + '&lng=' + connection.results[index].lng.toString() + '&username=' + secrets.getUsername(host)
		, method: 'GET'
	};
	serviceRequest(options, 'weatherResponse', connection, index);
}
var weatherResponse = function(connection, error, data, index){
	//console.log('weatherResponse')
	//console.log(arguments);
	if(error){
		// TODO: Handle Error
	}
	try{
		connection.dependancy.weather += 1;
		data = JSON.parse(data);
		connection.results[index].weather = data;
	} catch(error){
		console.log(error);
	}
	eventEmitter.emit('progress', connection);
}
var timezoneRequest = function(connection, index){
	//console.log('timezoneRequest')
	//console.log(arguments);
	var host = 'api.geonames.org';
	var options = {
		host: host
		, port: 80
		, path: '/timezoneJSON?lat=' + connection.results[index].lat.toString() + '&lng=' + connection.results[index].lng.toString() + '&username=' + secrets.getUsername(host)
		, method: 'GET'
	};
	serviceRequest(options, 'timezoneResponse', connection, index);
}
var timezoneResponse = function(connection, error, data, index){
	//console.log('timezoneResponse')
	//console.log(arguments);
	if(error){
		// TODO: Handle Error
	}
	try{
		connection.dependancy.timezone += 1;
		data = JSON.parse(data);
		connection.results[index].timezone = data;
	} catch(error){
		console.log(error);
	}
	eventEmitter.emit('progress', connection);
}
var progress = function(connection){
	if(connection.dependancy.weather === connection.results.length - 1 && connection.dependancy.timezone === connection.results.length - 1){
		connection.status = 200;
		eventEmitter.emit('httpResponse', connection);
	}
}
var httpResponse = function(connection){
	//redis.end();
	//var httpHeaders = (request || {}).headers || {};
	connection.response.writeHead(connection.status, {
		'Content-Type': 'text-plain'
		, 'Set-Cookie': CONSTANT.cuid + '=' + getSessionUID(connection.request)
	});
	connection.response.write(JSON.stringify(connection.results));
	connection.response.end();
}

eventEmitter.on('redisResponse', redisResponse);
eventEmitter.on('geocodeRequest', geocodeRequest);
eventEmitter.on('geocodeResponse', geocodeResponse);
eventEmitter.on('weatherRequest', weatherRequest);
eventEmitter.on('weatherResponse', weatherResponse);
eventEmitter.on('timezoneRequest', timezoneRequest);
eventEmitter.on('timezoneResponse', timezoneResponse);
eventEmitter.on('progress', progress);
eventEmitter.on('httpResponse', httpResponse);