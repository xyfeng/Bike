$(function() {
  {
    //map projection
    var dest = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
    var geo_center = proj4(dest, [-73.9888, 40.7222]);

    function getScreenPos(lat, lng) {
      var point = proj4(dest, [lng, lat]);
      var posX = (point[0] - geo_center[0]) / 10;
      var posY = (point[1] - geo_center[1]) / 10;
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
      $.each(offsetted_paths[0], function(i,p){
        result.push([p.X, p.Y]);
      });
      return result;
    }

    //GUI SETUP
    function Settings() {
      this.strokeWidth = 0.0;
      this.stationsSpeed = 0.2;
      this.stationsFrame = 15;
      this.drawMap = true;
      this.redraw = function() {
        reDrawStations();
      };
    }
    var settings = new Settings();
    var gui = new dat.GUI();
    var f0 = gui.addFolder('draw');
    f0.add(settings, 'drawMap');
    f0.add(settings, 'stationsSpeed', 0.02, 0.8).step(0.02);
    f0.add(settings, 'stationsFrame', 1, 100).step(1);
    f0.closed = false;
    var f1 = gui.addFolder('style');
    f1.add(settings, 'strokeWidth', 0, 1).step(0.1);
    f1.closed = false;
    gui.add(settings, 'redraw');

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

    function downloadNeighborhood() {
      $.getJSON("data/neighborhood.json", function(data) {
        console.log('neighborhood map downloaded');
        drawNeighborhood(data);
      });
    }

    function drawNeighborhood(data) {
      $.each(data, function(i, n) {
        var coordinates = n.coordinates;
        var points = offsetPath(getShapePoints(coordinates), -1, ClipperLib.JoinType.jtSquare, ClipperLib.EndType.etClosedPolygon);
        var shape = getShapeFromPoints(points);
        var neighborMesh = addShape(scene, shape, 0x690306, 1, 0, 0, 0, 0, 0, 0, 1);
      });
      console.log(scene);
    }

    //OBJECTS
    var geometry = new THREE.BoxGeometry(100, 100, 100);
    var material = new THREE.MeshPhongMaterial({
      color: 0x00ff00
    });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);


    //RUN
    downloadNeighborhood();
    animate();

    function animate() {
      requestAnimationFrame(animate);
      render();

      controls.update();
      stats.update();
      TWEEN.update();
    }

    function render() {
      renderer.render(scene, camera);
      cube.rotation.x += 0.1;
      cube.rotation.y += 0.1;
    }
  }
})
