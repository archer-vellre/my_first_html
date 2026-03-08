/* 赛博城市 3D 场景 — 依赖全局 THREE */
var CyberScene = (function () {
    var COLORS = {
        cyan: 0x00fff5,
        magenta: 0xff00ff,
        purple: 0xb300ff,
    };
    var COLOR_LIST = [COLORS.cyan, COLORS.magenta, COLORS.purple];

    function initScene(canvas) {
        var scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.012);

        var camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 18, 35);
        camera.lookAt(0, 5, 0);

        var renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // 检测性能
        var isMobile = window.innerWidth < 768;
        var isLowPerf =
            isMobile ||
            (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

        // 灯光
        scene.add(new THREE.AmbientLight(0x111122, 0.5));

        var pointLight1 = new THREE.PointLight(COLORS.cyan, 2, 80);
        pointLight1.position.set(-15, 20, 10);
        scene.add(pointLight1);

        var pointLight2 = new THREE.PointLight(COLORS.magenta, 1.5, 80);
        pointLight2.position.set(15, 15, -10);
        scene.add(pointLight2);

        var pointLight3 = new THREE.PointLight(COLORS.purple, 1, 60);
        pointLight3.position.set(0, 25, 0);
        scene.add(pointLight3);

        // 生成城市
        var buildingCount = isMobile ? 25 : (isLowPerf ? 40 : 100);
        createCity(scene, buildingCount);

        // 反射地面
        createGround(scene);

        // 粒子
        var particles = null;
        if (!isLowPerf) {
            particles = createParticles(scene);
        }

        // Resize
        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        return {
            scene: scene,
            camera: camera,
            renderer: renderer,
            particles: particles,
            pointLight1: pointLight1,
            pointLight2: pointLight2,
            isRunning: true,
        };
    }

    function createCity(scene, count) {
        var gridSize = 60;
        for (var i = 0; i < count; i++) {
            var w = 1.5 + Math.random() * 2.5;
            var d = 1.5 + Math.random() * 2.5;
            var h = 3 + Math.random() * 22;

            var geo = new THREE.BoxGeometry(w, h, d);
            var mat = new THREE.MeshStandardMaterial({
                color: 0x080818,
                metalness: 0.7,
                roughness: 0.3,
                transparent: true,
                opacity: 0.85,
            });
            var mesh = new THREE.Mesh(geo, mat);

            var x, z;
            do {
                x = (Math.random() - 0.5) * gridSize;
                z = (Math.random() - 0.5) * gridSize;
            } while (Math.abs(x) < 10 && Math.abs(z) < 10);
            mesh.position.set(x, h / 2, z);
            scene.add(mesh);

            // 霓虹边缘线
            if (Math.random() > 0.4) {
                var edgeColor = COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)];
                var edges = new THREE.EdgesGeometry(geo);
                var lineMat = new THREE.LineBasicMaterial({
                    color: edgeColor,
                    transparent: true,
                    opacity: 0.4 + Math.random() * 0.4,
                });
                var line = new THREE.LineSegments(edges, lineMat);
                line.position.copy(mesh.position);
                scene.add(line);
            }

            // 楼顶小光源
            if (Math.random() > 0.7) {
                var wc = COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)];
                var wl = new THREE.PointLight(wc, 0.3, 8);
                wl.position.set(x, h + 0.5, z);
                scene.add(wl);
            }
        }
    }

    function createGround(scene) {
        var geo = new THREE.PlaneGeometry(200, 200);
        var mat = new THREE.MeshStandardMaterial({
            color: 0x050510,
            metalness: 0.95,
            roughness: 0.05,
            transparent: true,
            opacity: 0.8,
        });
        var ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);
    }

    function createParticles(scene) {
        var count = 800;
        var positions = new Float32Array(count * 3);
        var velocities = new Float32Array(count);

        for (var i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            velocities[i] = 0.02 + Math.random() * 0.06;
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        var mat = new THREE.PointsMaterial({
            color: COLORS.cyan,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        var points = new THREE.Points(geo, mat);
        scene.add(points);

        return { points: points, positions: positions, velocities: velocities, count: count };
    }

    function animate(sceneData, scrollProgress, time) {
        if (!sceneData.isRunning) return;

        var camera = sceneData.camera;
        var renderer = sceneData.renderer;
        var scene = sceneData.scene;
        var particles = sceneData.particles;

        // 摄像机跟随滚动
        var angle = scrollProgress * Math.PI * 0.6;
        var radius = 35;
        camera.position.x = radius * Math.sin(angle);
        camera.position.z = radius * Math.cos(angle);
        camera.position.y = 18 - scrollProgress * 12;
        camera.lookAt(0, 5, 0);

        // 灯光运动
        var t = time * 0.001;
        sceneData.pointLight1.position.x = -15 + Math.sin(t * 0.5) * 5;
        sceneData.pointLight2.position.z = -10 + Math.cos(t * 0.3) * 5;

        // 粒子下落
        if (particles) {
            var arr = particles.points.geometry.attributes.position.array;
            for (var i = 0; i < particles.count; i++) {
                arr[i * 3 + 1] -= particles.velocities[i];
                if (arr[i * 3 + 1] < 0) {
                    arr[i * 3 + 1] = 50 + Math.random() * 10;
                    arr[i * 3] = (Math.random() - 0.5) * 100;
                    arr[i * 3 + 2] = (Math.random() - 0.5) * 100;
                }
            }
            particles.points.geometry.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }

    return {
        initScene: initScene,
        animate: animate,
    };
})();
