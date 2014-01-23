paper.install(window);
$(function() {

    //FUNCTIONS

    //zoom
    $('body').bind('mousewheel', function(event) {
        var e = event.originalEvent;
        e.stopPropagation();
        e.preventDefault();
        var dy = e.wheelDeltaY / 1000;
        view.zoom = Math.max(Math.min(view.zoom + dy, 5), 0.5);
    })

    //pan
    function traslladar(a, b) {
        var center = paper.project.view.center;
        var desX = (a.x - b.x);
        var desY = (a.y - b.y);
        var newCenter = [center.x + desX, center.y + desY];
        return newCenter;
    }

    //map projection
    var dest = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
    var center = proj4(dest, [-73.9770, 40.7214]);

    function getScreenPos(lat, lng) {
        var point = proj4(dest, [lng, lat]);
        var posX = view.center.x + (point[0] - center[0]) / 10;
        var posY = view.center.y - (point[1] - center[1]) / 10;
        return new Point(posX, posY);
    }

    function downloadStations() {
        $.getJSON("http://bike.parseapp.com/getstations", function(data) {
            $.each(data, function(i, d) {
                var pos = getScreenPos(d['lat'], d['lng']);
                stations[i] = new StationDot(d['sid'], pos, d['name'], d['bikes'], d['postal'], d['neighborhood']);
            });
            console.log('station downloaded');
            drawStationStart = true;
        });
    }

    //OBJECTS
    function StationDot(id, pos, name, bikes, postal, neighborhood) {
        this.id = id;
        this.pos = pos;
        this.name = name;
        this.bikes = bikes;
        this.postal = postal;
        this.neighborhood = neighborhood;
    }

    //GUI SETUP
    function Settings() {
        this.strokeWidth = 0.0;
        this.stationsSpeed = 0.2;
        this.stationsFrame = 15;
        this.redraw = function() {
            reDrawStations();
        };
    }
    var settings = new Settings();
    var gui = new dat.GUI();
    var f0 = gui.addFolder('draw');
    f0.add(settings, 'stationsSpeed', 0.02, 0.8).step(0.02);
    f0.add(settings, 'stationsFrame', 1, 100).step(1);
    f0.closed = false;
    var f1 = gui.addFolder('style');
    f1.add(settings, 'strokeWidth', 0, 1).step(0.1);
    f1.closed = false;
    gui.add(settings, 'redraw');

    function reDrawStations() {
        stationGroup.removeChildren();
        drawStationStart = true;
    }


    //PAPER SETUP
    paper.setup('paperCanvas');
    var tool = new Tool();

    //GLOBAL
    var bikesNumMin = 12;
    var bikesNumMax = 67;
    var stations = [];
    var routes = [];
    var drawStationStart = false;
    var stationGroup = new Group({
        position: view.center
    });

    view.draw();
    downloadStations();

    view.onFrame = function(event) {
        //draw stations
        if (drawStationStart) {
            drawStationStart = false;
            if (isNaN(this.stationDrawFrame)) {
                this.stationDrawFrame = event.count;
            }
            var totalStations = stations.length;
            if(stationGroup.children.length < totalStations){
                var startIndex = (event.count - this.stationDrawFrame) * settings.stationsFrame;
                for (var i = startIndex; i < totalStations && i < startIndex + settings.stationsFrame; i++) {
                    var s = stations[i];
                    var ratio = (s.bikes - bikesNumMin) / (bikesNumMax - bikesNumMin);
                    var dot = new Path.Circle({
                        center: view.center,
                        radius: 2 + 4 * ratio,
                        fillColor: 'black'
                    });
                    s.dot = dot;
                    stationGroup.addChild(dot);
                };
                drawStationStart = true;
            }
            $.each(stations, function(i, s) {
                if (s.dot) {
                    var diff = new Point(s.pos.x - s.dot.position.x, s.pos.y - s.dot.position.y);
                    if (diff.length < 0.5) {
                        s.dot.position = s.pos;
                    } else {
                        var offset = diff.multiply([settings.stationsSpeed, settings.stationsSpeed]);
                        s.dot.position = new Point(s.dot.position.x + offset.x, s.dot.position.y + offset.y);
                        drawStationStart = true;
                    }
                };
            });
        };
        if(!drawStationStart){
            this.stationDrawFrame = NaN;
        }
    }

    view.onResize = function(event) {}

    tool.onMouseDown = function(event) {}

    tool.onMouseDrag = function(event) {
        var des = traslladar(event.downPoint, event.point);
        paper.project.view.center = des;
    }
});