// ZOOM
var Surface = function(object) {
    this.object = object;
};
_.extend(Surface.prototype, {
    limits: function(min, max) {
        var min_exists = !_.isUndefined(min);
        var max_exists = !_.isUndefined(max);
        if (!max_exists && !min_exists) {
            return {
                min: this.min,
                max: this.max
            };
        }
        this.min = min_exists ? min : this.min;
        this.max = max_exists ? max : this.max;
        return this;
    },
    apply: function(px, py, s) {
        this.object.translation.set(px, py);
        this.object.scale = s;
        return this;
    }
});

var ZUI = function(two) {
    this.limits = {
        scale: ZUI.Limit.clone(),
        x: ZUI.Limit.clone(),
        y: ZUI.Limit.clone()
    };
    this.viewport = two.renderer.domElement;
    this.viewportOffset = {
        matrix: new Two.Matrix()
    };
    this.surfaceMatrix = new Two.Matrix();
    this.surfaces = [];
    this.reset();
    this.updateSurface();
    this.add(new Surface(two.scene));
};

_.extend(ZUI, {
    Surface: Surface,
    Clamp: function(v, min, max) {
        return Math.min(Math.max(v, min), max);
    },

    Limit: {
        min: -Infinity,
        max: Infinity,
        clone: function() {
            return _.clone(this);
        }
    },

    TranslateMatrix: function(m, x, y) {
        m.elements[2] += x;
        m.elements[5] += y;
        return m;
    },

    PositionToScale: function(pos) {
        return Math.exp(pos);
    },

    ScaleToPosition: function(scale) {
        return Math.log(scale);
    }
});

_.extend(ZUI.prototype, {
    add: function(surface) {
        this.surfaces.push(surface);
        var limits = surface.limits();
        this.addLimits(limits.min, limits.max);
        return this;
    },

    addLimits: function(min, max, type) {
        var type = type || 'scale';
        if (!_.isUndefined(min)) {
            if (this.limits[type].min) {
                this.limits[type].min = Math.max(min, this.limits[type].min);
            } else {
                this.limits[type].min = min;
            }
        }
        if (_.isUndefined(max)) {
            return this;
        }
        if (this.limits[type].max) {
            this.limits[type].max = Math.min(max, this.limits[type].max);
        } else {
            this.limits[type].max = max;
        }
        return this;
    },

    /**
     * Conversion Functions
     */

    clientToSurface: function(x, y) {
        this.updateOffset();
        var m = this.surfaceMatrix.inverse();
        var n = this.viewportOffset.matrix.inverse().multiply(x, y, 1);
        return m.multiply.apply(m, _.toArray(n));
    },

    surfaceToClient: function(v) {
        this.updateOffset();
        var vo = this.viewportOffset.matrix.clone();
        var sm = this.surfaceMatrix.multiply.apply(this.surfaceMatrix, _.toArray(v));
        return vo.multiply.apply(vo, _.toArray(sm));
    },

    /**
     *
     */

    zoomBy: function(byF, clientX, clientY) {
        var s = ZUI.PositionToScale(this.zoom + byF);
        this.zoomSet(s, clientX, clientY);
        return this;
    },

    zoomSet: function(zoom, clientX, clientY) {
        var newScale = this.fitToLimits(zoom);
        this.zoom = ZUI.ScaleToPosition(newScale);
        if (newScale === this.scale) {
            return this;
        }
        var sf = this.clcientToSurface(clientX, clientY);
        var scaleBy = newScale / this.scale;
        this.surfaceMatrix.scale(scaleBy);
        this.scale = newScale;
        var c = this.surfaceToClient(sf);
        var dx = clientX - c.x;
        var dy = clientY - c.y;
        this.translateSurface(dx, dy);
        this.updateSurface();
        return this;
    },

    translateSurface: function(x, y) {
        ZUI.TranslateMatrix(this.surfaceMatrix, x, y)
        return this;
    },

    updateOffset: function() {
        var rect = this.viewport.getBoundingClientRect();
        _.extend(this.viewportOffset, rect);
        this.viewportOffset.left -= document.body.scrollLeft;
        this.viewportOffset.top -= document.body.scrollTop;
        this.viewportOffset.matrix
            .identity()
            .translate(this.viewportOffset.left, this.viewportOffset.top);
        return this;
    },

    updateSurface: function() {
        var e = this.surfaceMatrix.elements;
        _.each(this.surfaces, function(s) {
            s.apply(e[2], e[5], e[0]);
        });
        return this;
    },

    reset: function() {
        this.zoom = 0;
        this.scale = 1.0;
        this.surfaceMatrix.identity();
        return this;
    },

    fitToLimits: function(s) {
        return ZUI.Clamp(s, this.limits.scale.min, this.limits.scale.max);
    }
});

$(function() {

    //DRAW SETUP
    var two = new Two({
        type: Two.Types.svg,
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
    function Settings() {
        this.strokeWidth = 0.0;
        this.stationsSpeed = 0.5;
        this.stationsFrame = 5;
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

    //FUNCTIONS

    //map projection
    var dest = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
    var center = proj4(dest, [-73.9770, 40.7214]);

    function getScreenPos(lat, lng) {

        var point = proj4(dest, [lng, lat]);

        var posX = two.width / 2 + (point[0] - center[0]) / 10;
        var posY = two.height / 2 - (point[1] - center[1]) / 10;

        return new Two.Vector(posX, posY);
    }

    function downloadStations() {
        $.getJSON("http://bike.parseapp.com/getstations", function(data) {
            $.each(data, function(i, d) {
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
            .bind('mousedown', function(e) {
                e.stopPropagation();
            })
            .bind('mouseup', function(e) {
                e.preventDefault();
                // console.log(station.name);
                downloadRoutes(station.id);
            })
    }

    function downloadRoutes(sid) {
        //clear routes
        routes = [];
        $.each(routeLayer.children, function(i, r) {
            routeLayer.remove(r);
        });

        $.getJSON("http://bike.parseapp.com/getroutes?start=" + sid.toString(), function(data) {
            $.each(data, function(i, d) {
                var points = [];
                $.each(d['points'], function(j, p) {
                    var pos = getScreenPos(p[1], p[0]);
                    points.push(pos);
                });
                routes[i] = new RouteLine(points);
            });
            two.bind('update', drawRoutes);
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

    function RouteLine(points) {
        this.points = points;
    }

    //GLOBAL
    var bikesNumMin = 12;
    var bikesNumMax = 67;
    var routeLayer = new Two.Group();
    var stationLayer = new Two.Group();
    two.add(routeLayer);
    two.add(stationLayer);
    var stations = [];
    var routes = [];

    //DRAW UPDATE
    function reDrawStations() {
        $.each(stationLayer.children, function(i, s) {
            stationLayer.remove(s);
        });
        two.bind('update', drawStations);
    }

    function drawStations(frameCount) {
        var drawEnd = true;
        if (isNaN(this.stationDrawFrame)) {
            // console.log('start draw stations');
            this.stationDrawFrame = frameCount;
            drawEnd = false;
        }
        if (Object.keys(stationLayer.children).length < stations.length) {
            //create new station
            var startIndex = (frameCount - this.stationDrawFrame) * settings.stationsFrame;
            for (var i = startIndex; i < stations.length && i < startIndex + settings.stationsFrame; i++) {
                var s = stations[i];
                var ratio = (s['bikes'] - bikesNumMin) / (bikesNumMax - bikesNumMin);
                // var dot = two.makeCircle(s.pos.x, s.pos.y, 2 + 4 * (s['bikes'] - bikesNumMin) / (bikesNumMax - bikesNumMin) );
                var dot = two.makeCircle(two.width / 2 - 150, two.height / 2, 2 + 4 * ratio);
                var gray = parseInt(ratio * 0.5 * 256).toString();
                var color = 'rgb(' + gray + ',' + gray + ',' + gray + ')';
                dot.fill = color;
                dot.stroke = 'black';
                dot.linewidth = 0.0;
                s.dot = dot;
                stationLayer.add(dot);
                drawEnd = false;
                // console.log('add one station');
            };
        }
        $.each(stations, function(i, s) {
            if (s.dot) {
                var diff = new Two.Vector();
                diff.sub(s.pos, s.dot.translation);
                if (diff.length() < 1) {
                    s.dot.translation = s.pos;
                } else {
                    s.dot.translation.x += diff.x * settings.stationsSpeed;
                    s.dot.translation.y += diff.y * settings.stationsSpeed;
                    drawEnd = false;
                }
            }
        });

        if (drawEnd) {
            $.each(stations, function(i, s) {
                addInteractivity(s);
            });
            this.stationDrawFrame = NaN;
            two.unbind('update', drawStations);
            // console.log('end of stations drawing');
        };
    }

    function drawRoutes(frameCount) {
        var drawEnd = true;
        if (isNaN(this.routeDrawFrame)) {
            // console.log('start draw routes');
            this.routeDrawFrame = frameCount;
            drawEnd = false;
        }
        if (Object.keys(routeLayer.children).length < routes.length) {
            //create new route
            var i = frameCount - this.routeDrawFrame;
            // var points = routes[i];
            var line = two.makePolygon([], true);
            line.noFill();
            line.stroke = 'rgba(58, 207, 118, 0.3)';
            routes[i].line = line;
            routeLayer.add(line);
            drawEnd = false;
            // console.log('add one route');
        }
        $.each(routes, function(i, r) {
            if (r.line) {
                var pointIndex = r.line.vertices.length;
                var points = routes[i].points;
                if (pointIndex < points.length) {
                    r.line.vertices.push(points[pointIndex]);
                    drawEnd = false;
                };
            }
        });

        if (drawEnd) {
            this.routeDrawFrame = NaN;
            two.unbind('update', drawRoutes);
            // console.log('end of routes drawing');
        };
    }

    //RUN 
    downloadStations();
    two.play();

    // for(var i = 0; i < stations.length; i ++){
    // 	stations[i].dot.linewidth = settings.strokeWidth;
    // }
});