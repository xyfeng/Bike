$(function() {
  {
    //map projection
    var dest = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
    var geo_center = proj4(dest, [-73.9888, 40.7302]);

    function getScreenPos(lat, lng) {
      var point = proj4(dest, [lng, lat]);
      var posX = (point[0] - geo_center[0]) / 5;
      var posY = (point[1] - geo_center[1]) / 5;
      return [posX, posY];
    }

    function getShapePoints(data) {
      var points = [];
      $.each(data, function(i, d) {
        points.push(getScreenPos(d[1], d[0]));
      });
      return points;
    }

    function getShapeFromPoints(points) {
      var shape = new THREE.Shape();
      shape.autoClose = true;
      $.each(points, function(i, p) {
        if (i == 0) {
          shape.moveTo(p[0], p[1]);
        } else {
          shape.lineTo(p[0], p[1]);
        }
      });
      return shape;
    }

    function addShape(group, shape, color, opacity, x, y, z, rx, ry, rz, s) {
      var geometry = new THREE.ShapeGeometry(shape);
      var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: (opacity == 1) ? false : true,
        opacity: opacity
      }));
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.set(s, s, s);
      group.add(mesh);
      return mesh;
    }

    function addCircle(group, color, opacity, x, y, z, radius, s) {
      var geometry = new THREE.CircleGeometry(radius, 32);
      var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: (opacity == 1) ? false : true,
        opacity: opacity
      }));
      mesh.position.set(x, y, z);
      mesh.scale.set(s, s, s);
      group.add(mesh);
      return mesh;
    }

    var miterLimit = 2;
    var arcTolerance = 0.25;
    var c = new ClipperLib.Clipper();
    var co = new ClipperLib.ClipperOffset(miterLimit, arcTolerance);

    function offsetPath(points, offset, join, end) {
      var path = [];
      $.each(points, function(i, p) {
        path.push({
          X: p[0] * 1000,
          Y: p[1] * 1000
        });
      });
      co.Clear();
      co.AddPath(path, join, end);
      var offsetted_paths = new ClipperLib.Paths();
      co.Execute(offsetted_paths, offset * 1000);
      ClipperLib.JS.ScaleDownPaths(offsetted_paths, 1000);
      var result = [];
      $.each(offsetted_paths[0], function(i, p) {
        result.push([p.X, p.Y]);
      });
      return result;
    }

    //GUI SETUP
    function Settings() {
      this.mapColor = '#08202a';
      this.stationColor = '#fa2537';
      this.stationScale = 2;
      this.stationOpacity = 0.45;
      this.glowC = 0.2;
      this.glowP = 4;
      this.glowColor = '#ffff00';
      this.glowSide = false;
      this.glowVisible = true;
    }
    var settings = new Settings();
    var gui = new dat.GUI();
    var f0 = gui.addFolder('draw');
    f0.closed = false;
    var gui_map_color = f0.addColor(settings, 'mapColor');
    var gui_station_color = f0.addColor(settings, 'stationColor');
    var gui_station_scale = f0.add(settings, 'stationScale', 1, 5).step(0.1);
    var gui_station_opacity = f0.add(settings, 'stationOpacity', 0.01, 1.0).step(0.01);

    //SCENE
    var scene = new THREE.Scene();

    //LIGHT
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 1);
    scene.add(light);

    //CAMERA
    var camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 1000);
    //RENDERER
    var renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //STATS
    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.bottom = '0px';
    document.body.appendChild(stats.domElement);

    //CONTROLS
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    // controls.noRotate = true;
    // controls.noZoom = true;

    //INTERACTION
    var mouse, projector, clicked_station;
    mouse = new THREE.Vector2();
    projector = new THREE.Projector();
    $('body').on('click', 'canvas', onDocumentMouseDown);
    window.addEventListener('resize', onWindowResize, false);

    function downloadNeighborhood() {
      $.getJSON("data/neighborhood.json", function(data) {
        console.log('neighborhood map downloaded');
        drawNeighborhood(data);
      });
    }

    function downloadStations() {
      $.getJSON("data/station.json", function(data) {
        console.log('station data downloaded');
        drawStations(data);
      });
    }

    //DRAW MAP USING NEIGHBORHOOD DATA
    var map = new THREE.Object3D();
    scene.add(map);

    function drawNeighborhood(data) {
      $.each(data, function(i, n) {
        var coordinates = n.coordinates;
        var points = offsetPath(getShapePoints(coordinates), -1, ClipperLib.JoinType.jtSquare, ClipperLib.EndType.etClosedPolygon);
        var shape = getShapeFromPoints(points);
        var neighborMesh = addShape(map, shape, 0x08202a, 1, 0, 0, 0, 0, 0, 0, 1);
      });
    }

    //DRAW STATIONS
    var stations = new THREE.Object3D();
    var bikesNumMin = 12;
    var bikesNumMax = 67;
    scene.add(stations);

    function drawStations(data) {
      $.each(data, function(i, s) {
        var ratio = (s.bikes - bikesNumMin) / (bikesNumMax - bikesNumMin);
        var point = getScreenPos(s.lat, s.lng);
        var circleMesh = addCircle(stations, 0xfa2537, settings.stationOpacity, point[0], point[1], 1, 2 + ratio * 8, settings.stationScale);
      });
    }

    //OBJECTS
    // var geometry = new THREE.BoxGeometry(100, 100, 100, 2, 2, 2);
    // var material = new THREE.MeshPhongMaterial({
    //   color: 0x00ff00
    // });
    // var cube = new THREE.Mesh(geometry, material);
    // cube.position.set(0, 0, 100);
    // scene.add(cube);

    //RUN
    downloadNeighborhood();
    downloadStations();
    animate();

    function animate() {
      requestAnimationFrame(animate);
      render();
      update();

      controls.update();
      stats.update();
      TWEEN.update();
    }

    function render() {
      renderer.render(scene, camera);
    }

    function update() {
      // cube.rotation.x += 0.1;
      // cube.rotation.y += 0.1;
    }

    gui_map_color.onChange(function(value) {
      $.each(map.children, function(i, n) {
        n.material.color.set(value);
      });
    });

    gui_station_color.onChange(function(value) {
      if (clicked_station) {
        dehighlightStation(clicked_station);
        clicked_station = null;
      }
      $.each(stations.children, function(i, s) {
        s.material.color.set(settings.value);
      });
    });

    gui_station_scale.onChange(function(value) {
      if (clicked_station) {
        dehighlightStation(clicked_station);
        clicked_station = null;
      }
      $.each(stations.children, function(i, s) {
        s.scale.set(value, value, 1);
      });
    });

    gui_station_opacity.onChange(function(value) {
      if (clicked_station) {
        dehighlightStation(clicked_station);
        clicked_station = null;
      }
      $.each(stations.children, function(i, s) {
        s.material.opacity = value;
      });
    });

    function highlightStation(s) {
      s.material.opacity = 1;
    }

    function dehighlightStation(s) {
      s.material.opacity = settings.stationOpacity;
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onDocumentMouseDown(event) {
      event.preventDefault();
      mouse.x = (event.pageX / $(window).width()) * 2 - 1;
      mouse.y = -(event.pageY / $(window).height()) * 2 + 1;
      var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
      var ray = projector.pickingRay(vector, camera);

      var intersects = ray.intersectObjects(stations.children);
      if (intersects.length > 0) {
        console.log('find one');
        var clickedObject = intersects[0].object;
        if (clickedObject != clicked_station) {
          if (clicked_station) {
            dehighlightStation(clicked_station);
          }
          clicked_station = clickedObject;
          highlightStation(clicked_station);
        }
      } else {
        console.log('find nothing');
        dehighlightStation(clicked_station);
        clicked_station = null;
      }
    }

  }
})
