$(function(){

	//DRAW SETUP
	var two = new Two({
        autostart: false,
		fullscreen: true
	}).appendTo(document.body);

	//ZOOM & DRAG SETUP
	var zui = new ZUI(two);
	zui.addLimits(0.5, 5);

	var $stage = $(two.renderer.domElement);
	var dragStart = {};
    var drag = function(e) {
		e.preventDefault();
		zui.translateSurface(e.clientX - dragStart.x, e.clientY - dragStart.y);
		zui.updateSurface();
		dragStart.x = e.clientX;
		dragStart.y = e.clientY;
    };
    var dragEnd = function(e) {
      	e.preventDefault();
      	$stage
        	.unbind('mousemove', drag)
        	.unbind('mouseup', dragEnd);
    };
	$stage.bind('mousewheel', function(event) {
		var e = event.originalEvent;
		e.stopPropagation();
		e.preventDefault();
		var dy = e.wheelDeltaY / 1000;
		zui.zoomBy(dy, e.clientX, e.clientY);
	}).bind('mousedown', function(event) {
		var e = event.originalEvent;
		e.preventDefault();
		dragStart.x = e.clientX;
		dragStart.y = e.clientY;
		$stage
			.bind('mousemove', drag)
			.bind('mouseup', dragEnd);
	});

	//GUI SETUP
	function Settings(){
		this.strokeWidth = 0.0;
	}
	var settings = new Settings();
	var gui = new dat.GUI();
	var f1 = gui.addFolder('style');
	f1.add(settings, 'strokeWidth', 0, 1);
	f1.closed = true;

	//FUNCTIONS

	//map projection
	var dest = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
	var center = proj4(dest, [-73.9770,40.7214]);
	function getScreenPos(lat, lng){

		var point = proj4(dest,[lng,lat]);

		var posX = two.width / 2 + (point[0] - center[0])/10;
		var posY = two.height / 2 - (point[1] - center[1])/10;

		return new Two.Vector(posX, posY);
	}

	function downloadStations(){
		$.getJSON("http://bike.parseapp.com/getstations", function(data) {
			$.each( data, function( i, d ) {
				var pos = getScreenPos(d['lat'], d['lng']);
				stations[i] = new StationDot(d['sid'], pos, d['name'], d['bikes'], d['postal'], d['neighborhood']);
			});
			two.bind('update', drawStations);
		});
	}

	function addInteractivity(station) {
		$(station.dot._renderer.elem)
			.css({
				cursor: 'pointer'
			})
			.bind('mousedown', function(e){
				e.stopPropagation();
			})
			.bind('mouseup', function(e) {
				e.preventDefault();
				console.log(station.name);
				downloadRoutes(station.id);
			})
	}

	function downloadRoutes(sid) {
		$.getJSON("http://bike.parseapp.com/getroute?start="+sid.toString(), function(data) {
			$.each( data, function( i, d ) {
				var points = [];
				$.each ( d['points'], function (j, p) {
					var pos = getScreenPos(p[1], p[0]);
					points.push(new Two.Anchor(pos.x,pos.y));
				});
				drawRoute(points);
			});
		});
	}

	//OBJECTS
	function StationDot(id, pos, name, bikes, postal, neighborhood){
		this.id = id;
		this.pos = pos;
		this.name = name;
		this.bikes = bikes;
		this.postal = postal;
		this.neighborhood = neighborhood;
	}
	
	//GLOBAL
	var bikesNumMin = 12;
	var bikesNumMax = 67;
	var routeLayer = new Two.Group();
	var stationLayer = new Two.Group();
	two.add(routeLayer);
	two.add(stationLayer);
	var stations = new Array();

	//DRAW UPDATE
	function drawStations(frameCount) {
		var drawEnd = true;
		if (isNaN(this.startFrame)) {
			console.log('start draw stations');
			this.startFrame = frameCount;
			drawEnd = false;
		}
		if(Object.keys(stationLayer.children).length < stations.length){
			//create new dot
			var i = frameCount - this.startFrame;
			var s = stations[i];
			var dot = two.makeCircle(two.width/2 - 150, two.height/2, 2 + 4 * (s['bikes'] - bikesNumMin) / (bikesNumMax - bikesNumMin) );
			dot.fill = '#000';
			dot.stroke = 'black';
			dot.linewidth = 0.0;
			s.dot = dot;
			stationLayer.add(dot);
			drawEnd = false;
			console.log('add one station');
		}
		$.each( stations, function(i, s) {
			if (s.dot) {
				var diff = new Two.Vector();
				diff.sub(s.pos, s.dot.translation);
				if (diff.length() < 1) {
					s.dot.translation = s.pos;
				}
				else{
					s.dot.translation.x += diff.x * 0.2;
					s.dot.translation.y += diff.y * 0.2;
					drawEnd = false;
				}
			}
		});

		if (drawEnd) {
			$.each( stations, function( i, s ) {
				addInteractivity(s);
			});
			two.unbind('update', drawStations);
		};
	}

	function drawRoute(points) {
		var polygon = two.makePolygon(points, true);
		polygon.noFill();
		routeLayer.add(polygon);
	}

	//RUN 
	downloadStations();
	two.play();

	// for(var i = 0; i < stations.length; i ++){
	// 	stations[i].dot.linewidth = settings.strokeWidth;
	// }
});