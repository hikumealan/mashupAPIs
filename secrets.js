var secrets = {
	usr : 'hikumealan'
	, address : ''
};

exports.getUsername = function(service){
	var usr = '';
	try{
		switch(service.toLowerCase()){
			case 'api.geonames.org':
				usr = 'hikumealan';
			break;
			default:
				usr = '';
			break;
		}
	} catch(error){
		usr = '';
	}
	return usr;
};