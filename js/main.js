$(function(){
	//DRAW SETUP
	var two = new Two({
        autostart: true,
		fullscreen: true
	}).appendTo(document.body);

	//ZOOM & DRAG SETUP
	var zui = new ZUI(two);
	zui.addLimits(0.06, 8);

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

	function StationDot(dot, id, name, bikes, postal, neighborhood){
		this.dot = dot;
		this.id = id;
		this.name = name;
		this.bikes = bikes;
		this.postal = postal;
		this.neighborhood = neighborhood;
	}
	var stations = new Array();

	//Interaction
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
				showRoutes(station.id);
			})
	}

	//GUI SETUP
	function Settings(){
		this.strokeWidth = 0.0;
	}
	var settings = new Settings();
	var gui = new dat.GUI();
	var f1 = gui.addFolder('style');
	f1.add(settings, 'strokeWidth', 0, 1);
	f1.closed = false;

	//MAP PROJECTION
	var dest = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
	var center = proj4(dest, [-73.9770,40.7214]);
	function getScreenPos(lat, lng){
		var pos = {};

		var point = proj4(dest,[lng,lat]);

		pos.x = two.width / 2 + (point[0] - center[0])/10;
		pos.y = two.height / 2 - (point[1] - center[1])/10;

		return pos;
	}

	$.getJSON("http://bike.parseapp.com/getstations", function(data) {
		$.each( data, function( i, d ) {
			var pos = getScreenPos(d['lat'], d['lng']);
			var dot = two.makeCircle(pos.x, pos.y, 2);
			dot.fill = '#999';
			dot.stroke = 'black';
			dot.linewidth = 0.0;
			
			stations[i] = new StationDot(dot, d['sid'], d['name'], d['bikes'], d['postal'], d['neighborhood']);
			two.update();

			addInteractivity(stations[i]);
		});
		two.bind('update', updateTwo).play();
	});

	//DRAW UPDATE
	function showRoutes(sid) {
		$.getJSON("http://bike.parseapp.com/getroutes?start="+sid.toString(), function(data) {
			$.each( data, function( i, d ) {
				var points = [];
				$.each ( d['points'], function (j, p) {
					var pos = getScreenPos(p[1], p[0]);
					points.push(new Two.Anchor(pos.x,pos.y));
				});
				var polygon = two.makePolygon(points, true);
				polygon.noFill();
				two.update();
			});
		});
	}
	function updateTwo(frameCount) {
		for(var i = 0; i < stations.length; i ++){
			stations[i].dot.linewidth = settings.strokeWidth;
		}
	}
});