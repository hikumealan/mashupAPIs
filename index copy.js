var enumeration = {
	cuid : 'CUID'
	, status : {
		ok : 'OK'
	}
}

function parseCookie(content, key){
	try{
		var items = (content || '').split(';');
		for(var i in items){
			if((items[i].split('=', 1)[0] || '').toUpperCase() == key.toUpperCase()){
				return items[i].replace(key + '=', '');
			}
		}
	} catch(error){
		console.log(error);
	}
	return '';
}
function cleanArray(_array){
	var result = [];
	try{
		for(var i in _array){
			if(_array[i]){
				result.push(_array[i]);
			}
			else if(!_array[i] && typeof _array[i] == 'boolean'){
				result.push(_array[i]);
			}
		}
	} catch(error){
		console.log(error);
	}
	return result;
}
function removeIndex(_array, _value){
	var result = [];
	try{
		result = _array;
		for(var i = result.length - 1; i >= 0 ; i--){
			if(result[i] == _value){
				result.splice(i, 1);
			}
		}
	} catch(error){
		console.log(error);
	}
	return result;
}

var results = [];
var cuid = require('cuid');

var handleRequest = function(request, response){
	var _cuid = parseCookie((((request || {}).headers || {}).cookie || ''), enumeration.cuid);
	var _location = (cleanArray((request.url.split('?')[0] || '').split('/'))[0] || '').replace(' ', '+').replace('%20', '+');
	// TODO: Send request to Google
	// TODO: Populate the Array
	// TODO: Loop over the Array and gather other data
	// TODO: return the Results
	response.writeHead(200, {
		'Content-Type': 'text-plain'
		, 'Set-Cookie': enumeration.cuid + '=' + request._cuid
	});
	response.end();
};

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


var mashups = require('./mashups');


var http = require('http');
http.createServer(handleRequest).listen(3000, 'localhost');