var express = require('express');
var app = express();

app.get('/getstation', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	var query = new Parse.Query("station");
	query.limit(1);
	var id = parseInt(req.query.id);
	if (id) {
		query.equalTo("sid", id);
		query.find({
			success: function(results) {
				res.send(results);
			},
			error: function() {
				res.send('Whoops, API is not available right now.');
			}
		});
	}
	else{
		res.send([]);
	}
});

app.get('/getstations', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	var query = new Parse.Query("station");
	query.limit(400);
	var zipcode = req.query.zipcode;
	var neighborhood = req.query.neighborhood;
	if (zipcode) {
		query.equalTo("postal", parseInt(zipcode));
	}
	if(neighborhood)
	{
		query.equalTo("neighborhood", neighborhood.toLowerCase());
	}
	query.find({
		success: function(results) {
			res.send(results);
		},
		error: function() {
			res.send('Whoops, API is not available right now.');
		}
	});
});

app.get('/getroute', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	var query = new Parse.Query("route");
	query.limit(1);
	var start = req.query.start;
	var end = req.query.end;
	if (start) {
		query.equalTo("start", parseInt(start));
	}
	if(end)
	{
		query.equalTo("end", parseInt(end));
	}
	query.find({
		success: function(results) {
			res.send(results);
		},
		error: function() {
			res.send('Whoops, API is not available right now.');
		}
	});
});

app.get('/getroutes', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	var query = new Parse.Query("route");
	query.limit(500);
	var minDuration = req.query.minduration;
	var maxDuration = req.query.maxduration;
	var minDistance = req.query.mindistance;
	var maxDistance = req.query.maxDistance;
	if (minDuration) {
		query.greaterThanOrEqualTo("duration", parseInt(minDuration));
	};
	if (maxDuration) {
		query.lessThanOrEqualTo("duration", parseInt(maxDuration));
	};
	if (minDistance) {
		query.greaterThanOrEqualTo("distance", parseInt(minDistance));
	};
	if (maxDistance) {
		query.lessThanOrEqualTo("distance", parseInt(maxDistance));
	};
	var start = req.query.start;
	var end = req.query.end;
	if (start) {
		query.equalTo("start", parseInt(start));
		query.find({
			success: function(results) {
				res.send(results);
			},
			error: function() {
				res.send('Whoops, API is not available right now.');
			}
		});
	}
	else if(end)
	{
		query.equalTo("end", parseInt(end));
		query.find({
			success: function(results) {
				res.send(results);
			},
			error: function() {
				res.send('Whoops, API is not available right now.');
			}
		});
	}
	else{
		res.send([]);
	}
});

// Attach the Express app to Cloud Code.
app.listen();
