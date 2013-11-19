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
var http = require('http').createServer(function(request, response){
	//var httpMethod = (request || {}).method || '';
	var connection = {
		request : request //JSON.parse(JSON.stringify(request))
		, response : response
		, url : url.parse(request.url).pathname.slice(1)
		, datasource : ''
		, cache : false
		, status : 0
		, results : {}
	};
	// Suppress the favicon
	if((request || {}).url === CONSTANT.favicon){
		// Return a 404 for favicon
		connection.status = 404;
		eventEmitter.emit('httpResponse', connection);
	}
	else{
		connection.key = connection.url.split('/')[0];
		connection.value = connection.url.split('/')[1].replace(' ', '+').replace('%20', '+');
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
}).listen(8080, 'localhost');

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
var getSessionUID = function(request){
	var _cuid = parseCookie((((request || {}).headers || {}).cookie || ''), CONSTANT.cuid);
	_cuid = _cuid ? _cuid : cuid(); //cuid.slug();
	return _cuid;
}
var serviceRequest = function(options, callback, connection){
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
			eventEmitter.emit(callback, connection, error, data);
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
		connection.cache = true;
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
	connection.cache = false;
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
		var results = [];
		for(var i in data.results){
			var lat = ((((data || {}).results[i] || {}).geometry || {}).location || {}).lat;
			var lng = ((((data || {}).results[i] || {}).geometry || {}).location || {}).lng;
			var result = {
				geocode : data.results[i]
				, lat : lat
				, lng : lng
				, weather : {}
				, timezone : {}
				, events : {}
				, movies : {}
			};
			// TODO: Loop over Results and Gather secondary data for each Location (lat, lng)
			/*
			async.parallel([
				function(){ ... },
				function(){ ... }
			], callback);
			*/
			results.push(result);
		}
		// TODO: Move to the callback
		connection.status = 200;
		connection.results = results;
		eventEmitter.emit('httpResponse', connection);
	}
	else{
		connection.status = 200;
		connection.results = data;
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
eventEmitter.on('httpResponse', httpResponse);