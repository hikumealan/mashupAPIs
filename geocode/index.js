var geocode = {
	type : 'json'
	, address : ''
	, latlng : ''
	, sensor : false
	, callback : function(){}
};

exports.setGeocode = function(data){
	location.geocode = data;
};
exports.setWeather = function(data){
	location.weather = data;
};
exports.setTimezone = function(data){
	location.timezone = data;
};
exports.setEvents = function(data){
	location.events = data;
};
exports.setMovies = function(data){
	location.movies = data;
};

exports.getDetails = function(){
	return location;
}