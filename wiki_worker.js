/***
Monitors Wikipedia's change stream, posting a change object for any edit that has a geocode.
To be use as a worker instance.
*/

var eventStream = "https://stream.wikimedia.org/v2/stream/recentchange";
var coordinatesLookup = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=coordinates&meta=&continue=&titles=";
var events;

function start() {
	events = new EventSource(eventStream);
	events.onmessage = onNewMessage;
}

function stop() {
	events.close();
	events = null;
}

self.onmessage = function(m) {
	if (m.data == 'start') {
		start();
	} else if (m.data == 'stop') {
		stop();
	}
}

function onNewMessage(e) {
	var change_data = JSON.parse(e.data);
	var page = change_data.meta.uri;
	var page_title = page.split('/').pop();

	fetch(coordinatesLookup + page_title)
	  .then(function(response) {
	    return response.json();
	  })
	  .then(function(data) {
	  	//check for existence of coordinates, if found, post response
	  	var pages = data.query.pages;
	  	if (pages) {
		  	var pagesList =  Object.keys(pages).map(key => pages[key])
		  	if (pagesList && pagesList[0].coordinates) {
		  		var page = pagesList[0];
		  		var lat = page.coordinates[0].lat;
		  		var lon = page.coordinates[0].lon;

				if (lat && lon) {
					var change = {title: page.title, is_bot: change_data.bot, comment: change_data.comment, link: change_data.meta.uri, lat: lat, lon: lon}
		  			postMessage(change);
		  		}
		  	}
	  	}
	  });
}