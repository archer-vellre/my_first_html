/* 赛博朋克 3D 场景 v2 — 悬浮金字塔 + 透视桥 + 城市剪影 */
/* 依赖全局 THREE (v0.160 CDN) */
var CyberScene = (function () {

    // ========== 颜色常量 ==========
    var COLORS = {
        cyan: 0x00fff5,
        magenta: 0xff00ff,
        purple: 0xb300ff,
    };
    var COLOR_LIST = [COLORS.cyan, COLORS.magenta, COLORS.purple];

    // ========== 性能检测 ==========
    var isMobile = false;
    var isLowPerf = false;

    // ========== 主入口 ==========
    function initScene(canvas) {
        isMobile = window.innerWidth < 768;
        isLowPerf = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

        // --- Scene ---
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0520);
        scene.fog = new THREE.FogExp2(0x1a0030, 0.008);

        // --- Camera ---
        var camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 12, 25);
        camera.lookAt(0, 25, -35);

        // --- Renderer ---
        var renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // ========== 灯光系统 ==========
        scene.add(new THREE.AmbientLight(0x332244, 0.8));

        var pointLight1 = new THREE.PointLight(COLORS.cyan, 3, 120);
        pointLight1.position.set(0, 40, -20);
        scene.add(pointLight1);

        var pointLight2 = new THREE.PointLight(COLORS.magenta, 2.5, 100);
        pointLight2.position.set(-20, 15, 10);
        scene.add(pointLight2);

        var pointLight3 = new THREE.PointLight(COLORS.purple, 2, 100);
        pointLight3.position.set(20, 20, -5);
        scene.add(pointLight3);

        // 两个 SpotLight 从桥两侧向上打
        var spotLeft = new THREE.SpotLight(COLORS.magenta, 2, 80, Math.PI / 6, 0.5);
        spotLeft.position.set(-4, 0, -30);
        spotLeft.target.position.set(-4, 50, -30);
        scene.add(spotLeft);
        scene.add(spotLeft.target);

        var spotRight = new THREE.SpotLight(COLORS.magenta, 2, 80, Math.PI / 6, 0.5);
        spotRight.position.set(4, 0, -30);
        spotRight.target.position.set(4, 50, -30);
        scene.add(spotRight);
        scene.add(spotRight.target);

        // ========== 场景元素 ==========
        var pyramid = createPyramid(scene);
        var bridge = createBridge(scene);
        createGround(scene);
        createCitySilhouette(scene);

        var particles = createParticles(scene);

        var cables = null;
        if (!isMobile && !isLowPerf) {
            cables = createCables(scene);
        }

        var drones = null;
        if (!isMobile) {
            drones = createDrones(scene);
        }

        var holograms = null;
        if (!isMobile) {
            holograms = createHolograms(scene);
        }

        var laserBeams = null;
        if (!isMobile) {
            laserBeams = createLaserBeams(scene);
        }

        // --- Resize ---
        window.addEventListener('resize', function () {
            isMobile = window.innerWidth < 768;
            isLowPerf = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        return {
            scene: scene,
            camera: camera,
            renderer: renderer,
            pyramid: pyramid,
            bridge: bridge,
            particles: particles,
            cables: cables,
            drones: drones,
            holograms: holograms,
            laserBeams: laserBeams,
            pointLight1: pointLight1,
            pointLight2: pointLight2,
            isRunning: true,
        };
    }

    // ================================================================
    //  3. 巨型悬浮金字塔
    // ================================================================
    function createPyramid(scene) {
        var group = new THREE.Group();

        var layers = [
            { w: 40, h: 4,   d: 40, y: 35   },
            { w: 32, h: 3.5, d: 32, y: 39.5  },
            { w: 24, h: 3,   d: 24, y: 43    },
            { w: 16, h: 2.5, d: 16, y: 46    },
            { w: 10, h: 2,   d: 10, y: 48.5  },
        ];

        var bodyMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            metalness: 0.8,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9,
        });

        for (var i = 0; i < layers.length; i++) {
            var L = layers[i];
            var geo = new THREE.BoxGeometry(L.w, L.h, L.d);
            var mesh = new THREE.Mesh(geo, bodyMat);
            mesh.position.y = L.y;
            group.add(mesh);

            // 边缘 cyan 轮廓线
            var edges = new THREE.EdgesGeometry(geo);
            var lineMat = new THREE.LineBasicMaterial({
                color: COLORS.cyan,
                transparent: true,
                opacity: 0.9,
            });
            var line = new THREE.LineSegments(edges, lineMat);
            line.position.y = L.y;
            group.add(line);

            // 层间 magenta 灯条（除了最底层下方不需要，在层的四边添加）
            if (i > 0) {
                var stripW = L.w * 0.9;
                var stripD = L.d * 0.9;
                var stripY = L.y - L.h / 2 - 0.1;
                var stripMat = new THREE.MeshBasicMaterial({
                    color: COLORS.magenta,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });

                // 前后两条
                var sFB = new THREE.BoxGeometry(stripW, 0.15, 0.15);
                var sf = new THREE.Mesh(sFB, stripMat);
                sf.position.set(0, stripY, stripD / 2);
                group.add(sf);
                var sb = new THREE.Mesh(sFB, stripMat);
                sb.position.set(0, stripY, -stripD / 2);
                group.add(sb);

                // 左右两条
                var sLR = new THREE.BoxGeometry(0.15, 0.15, stripD);
                var sl = new THREE.Mesh(sLR, stripMat);
                sl.position.set(-stripW / 2, stripY, 0);
                group.add(sl);
                var sr = new THREE.Mesh(sLR, stripMat);
                sr.position.set(stripW / 2, stripY, 0);
                group.add(sr);
            }
        }

        // 底面 magenta 发光点（层0底部）
        var dotCount = 100;
        var dotPositions = new Float32Array(dotCount * 3);
        for (var di = 0; di < dotCount; di++) {
            dotPositions[di * 3]     = (Math.random() - 0.5) * 38;
            dotPositions[di * 3 + 1] = 33 - Math.random() * 0.5;
            dotPositions[di * 3 + 2] = (Math.random() - 0.5) * 38;
        }
        var dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
        var dotMat = new THREE.PointsMaterial({
            color: COLORS.magenta,
            size: 0.3,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var dots = new THREE.Points(dotGeo, dotMat);
        group.add(dots);

        scene.add(group);
        return { group: group };
    }

    // ================================================================
    //  4. 透视桥面
    // ================================================================
    function createBridge(scene) {
        var group = new THREE.Group();

        // 桥面
        var deckGeo = new THREE.BoxGeometry(6, 0.2, 80);
        var deckMat = new THREE.MeshStandardMaterial({
            color: 0x111122,
            metalness: 0.9,
            roughness: 0.1,
        });
        var deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(0, 0.1, -35); // z center = (5 + -75)/2 = -35, span 80
        group.add(deck);

        // 护栏柱子 + magenta 灯排
        var pillarMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.7,
            roughness: 0.3,
        });
        var bulbMat = new THREE.MeshBasicMaterial({
            color: COLORS.magenta,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
        var pillarGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);

        for (var side = -1; side <= 1; side += 2) {
            var px = side * 3;
            for (var pi = 0; pi < 20; pi++) {
                var pz = 5 - pi * 4; // from z=5 to z=-71

                var pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(px, 0.8, pz);
                group.add(pillar);

                // 灯泡
                var bulb = new THREE.Mesh(bulbGeo, bulbMat);
                bulb.position.set(px, 1.4, pz);
                group.add(bulb);

                // PointLight
                var pLight = new THREE.PointLight(COLORS.magenta, 0.6, 8);
                pLight.position.set(px, 1.4, pz);
                group.add(pLight);
            }
        }

        // 桥面中线 cyan 发光线
        var lineGeo = new THREE.BoxGeometry(0.05, 0.05, 80);
        var lineMat = new THREE.MeshBasicMaterial({
            color: COLORS.cyan,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var centerLine = new THREE.Mesh(lineGeo, lineMat);
        centerLine.position.set(0, 0.22, -35);
        group.add(centerLine);

        scene.add(group);
        return { group: group };
    }

    // ================================================================
    //  5. 两侧城市剪影
    // ================================================================
    function createCitySilhouette(scene) {
        var columns = [
            { xBase: 9,  zStep: 8,  hMin: 25, hMax: 50, wMin: 5, wMax: 8,  maxDesktop: 13, maxLow: 8,  maxMobile: 5,  type: 'near' },
            { xBase: 22, zStep: 10, hMin: 35, hMax: 70, wMin: 6, wMax: 10, maxDesktop: 10, maxLow: 6,  maxMobile: 3,  type: 'mid' },
            { xBase: 38, zStep: 12, hMin: 20, hMax: 45, wMin: 4, wMax: 7,  maxDesktop: 8,  maxLow: 4,  maxMobile: 0,  type: 'far' },
        ];

        // ---- 辅助：随机窗格颜色（80% cyan, 10% magenta, 10% purple） ----
        function pickWindowColor() {
            var r = Math.random();
            if (r < 0.8) return COLORS.cyan;
            if (r < 0.9) return COLORS.magenta;
            return COLORS.purple;
        }

        // ---- 辅助：创建单栋摩天大楼 ----
        function createSkyscraper(h, w, d, colType) {
            var group = new THREE.Group();

            // 1. 主体方盒
            var mainGeo = new THREE.BoxGeometry(w, h, d);
            var mainMat = new THREE.MeshStandardMaterial({
                color: 0x0a0a18,
                metalness: 0.8,
                roughness: 0.25,
                transparent: true,
                opacity: 0.9,
            });
            var mainMesh = new THREE.Mesh(mainGeo, mainMat);
            group.add(mainMesh);

            // 2. 顶部结构（70% 几率）
            if (Math.random() < 0.7) {
                var topW = w * (0.3 + Math.random() * 0.3);
                var topH = 3 + Math.random() * 8;
                var topGeo = new THREE.BoxGeometry(topW, topH, topW);
                var topMat = new THREE.MeshStandardMaterial({
                    color: 0x0a0a18,
                    metalness: 0.8,
                    roughness: 0.25,
                    transparent: true,
                    opacity: 0.9,
                });
                var topMesh = new THREE.Mesh(topGeo, topMat);
                topMesh.position.y = h / 2 + topH / 2;
                group.add(topMesh);
            }

            // 3. 发光窗格网格（Points）
            var floorHeight = 2.5;
            var windowsPerFloor = Math.floor(w / 1.2);
            var floors = Math.floor(h / floorHeight);
            var windowPositions = [];

            // 移动端窗户数减半
            var winSkip = isMobile ? 2 : 1;

            // 正面窗户（面向桥，z 正方向）
            for (var fi = 0; fi < floors; fi += winSkip) {
                for (var wi = 0; wi < windowsPerFloor; wi++) {
                    if (Math.random() > 0.3) {
                        var wx = -w / 2 + 0.6 + wi * 1.2 + Math.random() * 0.2;
                        var wy = -h / 2 + 1.5 + fi * floorHeight + Math.random() * 0.3;
                        var wz = d / 2 + 0.05;
                        windowPositions.push(wx, wy, wz);
                    }
                }
            }

            // 侧面窗户（x 正方向面）
            var sideWindowsPerFloor = Math.floor(d / 1.2);
            for (var fi2 = 0; fi2 < floors; fi2 += winSkip) {
                for (var swi = 0; swi < sideWindowsPerFloor; swi++) {
                    if (Math.random() > 0.3) {
                        var swx = w / 2 + 0.05;
                        var swy = -h / 2 + 1.5 + fi2 * floorHeight + Math.random() * 0.3;
                        var swz = -d / 2 + 0.6 + swi * 1.2 + Math.random() * 0.2;
                        windowPositions.push(swx, swy, swz);
                    }
                }
            }

            if (windowPositions.length > 0) {
                var winGeo = new THREE.BufferGeometry();
                winGeo.setAttribute('position', new THREE.Float32BufferAttribute(windowPositions, 3));
                var winMat = new THREE.PointsMaterial({
                    color: pickWindowColor(),
                    size: 0.4,
                    transparent: true,
                    opacity: 0.7,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                var winPoints = new THREE.Points(winGeo, winMat);
                group.add(winPoints);
            }

            // 以下装饰在移动端全部跳过
            if (!isMobile) {

                // 4. 霓虹广告屏（40% 几率，远列跳过）
                if (colType !== 'far' && Math.random() < 0.4) {
                    var screenCount = 1 + Math.floor(Math.random() * 2);
                    for (var si = 0; si < screenCount; si++) {
                        var screenW = 2 + Math.random() * 3;
                        var screenH = 3 + Math.random() * 5;
                        var screenGeo = new THREE.PlaneGeometry(screenW, screenH);
                        var screenColor = COLOR_LIST[Math.floor(Math.random() * 3)];
                        var screenMat = new THREE.MeshBasicMaterial({
                            color: screenColor,
                            transparent: true,
                            opacity: 0.25 + Math.random() * 0.2,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                            side: THREE.DoubleSide,
                        });
                        var screenMesh = new THREE.Mesh(screenGeo, screenMat);
                        screenMesh.position.set(
                            (Math.random() - 0.5) * (w - screenW) * 0.6,
                            -h / 2 + h * (0.3 + Math.random() * 0.4),
                            d / 2 + 0.1
                        );
                        group.add(screenMesh);

                        // 屏幕边框
                        var screenEdge = new THREE.EdgesGeometry(screenGeo);
                        var screenEdgeMat = new THREE.LineBasicMaterial({
                            color: screenColor,
                            transparent: true,
                            opacity: 0.8,
                        });
                        var screenLine = new THREE.LineSegments(screenEdge, screenEdgeMat);
                        screenLine.position.copy(screenMesh.position);
                        group.add(screenLine);
                    }
                }

                // 5. 垂直霓虹灯条（60% 几率）
                if (Math.random() < 0.6) {
                    var stripCount = 1 + Math.floor(Math.random() * 3);
                    for (var sti = 0; sti < stripCount; sti++) {
                        var stripColor = COLOR_LIST[Math.floor(Math.random() * 3)];
                        var stripGeo = new THREE.BoxGeometry(0.08, h * 0.8, 0.08);
                        var stripMat = new THREE.MeshBasicMaterial({
                            color: stripColor,
                            transparent: true,
                            opacity: 0.7,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                        });
                        var strip = new THREE.Mesh(stripGeo, stripMat);
                        strip.position.set(
                            -w / 2 + Math.random() * w,
                            0,
                            d / 2 + 0.05
                        );
                        group.add(strip);
                    }
                }

                // 6. 水平结构带/管道（50% 几率，远列和低性能跳过）
                if (colType !== 'far' && !isLowPerf && Math.random() < 0.5) {
                    var pipeCount = 2 + Math.floor(Math.random() * 3);
                    for (var pi = 0; pi < pipeCount; pi++) {
                        var pipeY = -h / 2 + h * (0.2 + Math.random() * 0.6);
                        var pipeGeo = new THREE.BoxGeometry(w + 0.5, 0.15, 0.15);
                        var pipeMat = new THREE.MeshStandardMaterial({
                            color: 0x222235,
                            metalness: 0.9,
                            roughness: 0.2,
                        });
                        var pipe = new THREE.Mesh(pipeGeo, pipeMat);
                        pipe.position.set(0, pipeY, d / 2 + 0.1);
                        group.add(pipe);
                    }
                }

            } // end !isMobile

            // 7. 建筑边缘线（50%）
            if (Math.random() < 0.5) {
                var edges = new THREE.EdgesGeometry(mainGeo);
                var edgeMat = new THREE.LineBasicMaterial({
                    color: COLOR_LIST[Math.floor(Math.random() * 3)],
                    transparent: true,
                    opacity: 0.2 + Math.random() * 0.3,
                });
                var edgeLine = new THREE.LineSegments(edges, edgeMat);
                group.add(edgeLine);
            }

            return group;
        }

        // ---- 主循环：按列对称生成 ----
        for (var ci = 0; ci < columns.length; ci++) {
            var col = columns[ci];
            var maxCount = isMobile ? col.maxMobile : (isLowPerf ? col.maxLow : col.maxDesktop);
            if (maxCount === 0) continue;

            var z = -65;
            var placed = 0;
            while (z <= 35 && placed < maxCount) {
                var h = col.hMin + Math.random() * (col.hMax - col.hMin);
                var w = col.wMin + Math.random() * (col.wMax - col.wMin);
                var d = 3 + Math.random() * 3;
                var xOffset = (Math.random() - 0.5) * 3;
                var zOffset = (Math.random() - 0.5) * 3;
                var xPos = col.xBase + xOffset;
                var zPos = z + zOffset;

                for (var side = -1; side <= 1; side += 2) {
                    var finalX = side * xPos;
                    var building = createSkyscraper(h, w, d, col.type);
                    building.position.set(finalX, h / 2, zPos);
                    scene.add(building);
                }

                z += col.zStep;
                placed++;
            }
        }
    }

    // ================================================================
    //  6. 悬垂线缆（仅桌面端）
    // ================================================================
    function createCables(scene) {
        var cableCount = 8;
        var cables = [];
        var glowDots = [];

        for (var ci = 0; ci < cableCount; ci++) {
            // 起点在金字塔底部附近
            var startX = (Math.random() - 0.5) * 30;
            var startZ = -35 + (Math.random() - 0.5) * 20;
            var startY = 33;
            var endY = 5 + Math.random() * 10;
            var endX = startX + (Math.random() - 0.5) * 15;
            var endZ = startZ + (Math.random() - 0.5) * 15;

            // 中点下垂
            var midY = Math.min(startY, endY) * 0.3;
            var midX = (startX + endX) / 2 + (Math.random() - 0.5) * 5;
            var midZ = (startZ + endZ) / 2 + (Math.random() - 0.5) * 5;

            var curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(startX, startY, startZ),
                new THREE.Vector3(midX, midY, midZ),
                new THREE.Vector3(endX, endY, endZ),
            ]);

            var tubeGeo = new THREE.TubeGeometry(curve, 30, 0.05, 4, false);
            var tubeMat = new THREE.MeshBasicMaterial({
                color: 0x222233,
                transparent: true,
                opacity: 0.6,
            });
            var tube = new THREE.Mesh(tubeGeo, tubeMat);
            scene.add(tube);

            var curvePoints = curve.getPoints(50);
            cables.push({ curve: curve, points: curvePoints });

            // 前3条线缆有沿线移动的发光点
            if (ci < 3) {
                var dotGeo = new THREE.SphereGeometry(0.15, 6, 6);
                var dotMat = new THREE.MeshBasicMaterial({
                    color: COLORS.cyan,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                var dot = new THREE.Mesh(dotGeo, dotMat);
                scene.add(dot);
                glowDots.push({
                    mesh: dot,
                    curve: curve,
                    progress: Math.random(),
                    speed: 0.002 + Math.random() * 0.003,
                });
            }
        }

        return { cables: cables, glowDots: glowDots };
    }

    // ================================================================
    //  7. 粒子雨
    // ================================================================
    function createParticles(scene) {
        var cyanCount = isMobile ? 300 : (isLowPerf ? 500 : 1200);
        var magentaCount = isMobile ? 0 : (isLowPerf ? 50 : 120);

        // --- Cyan 主粒子 ---
        var positions = new Float32Array(cyanCount * 3);
        var velocities = new Float32Array(cyanCount);
        for (var i = 0; i < cyanCount; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 160;
            positions[i * 3 + 1] = Math.random() * 70;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
            velocities[i] = 0.03 + Math.random() * 0.08;
        }
        var cGeo = new THREE.BufferGeometry();
        cGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var cMat = new THREE.PointsMaterial({
            color: COLORS.cyan,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var cyanPoints = new THREE.Points(cGeo, cMat);
        scene.add(cyanPoints);

        // --- Magenta 副粒子（10%）---
        var magentaPoints = null;
        var mPositions = null;
        var mVelocities = null;
        if (magentaCount > 0) {
            mPositions = new Float32Array(magentaCount * 3);
            mVelocities = new Float32Array(magentaCount);
            for (var mi = 0; mi < magentaCount; mi++) {
                mPositions[mi * 3]     = (Math.random() - 0.5) * 160;
                mPositions[mi * 3 + 1] = Math.random() * 70;
                mPositions[mi * 3 + 2] = (Math.random() - 0.5) * 160;
                mVelocities[mi] = 0.03 + Math.random() * 0.08;
            }
            var mGeo = new THREE.BufferGeometry();
            mGeo.setAttribute('position', new THREE.BufferAttribute(mPositions, 3));
            var mMat = new THREE.PointsMaterial({
                color: COLORS.magenta,
                size: 0.25,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            magentaPoints = new THREE.Points(mGeo, mMat);
            scene.add(magentaPoints);
        }

        return {
            cyan: { points: cyanPoints, positions: positions, velocities: velocities, count: cyanCount },
            magenta: magentaPoints ? { points: magentaPoints, positions: mPositions, velocities: mVelocities, count: magentaCount } : null,
        };
    }

    // ================================================================
    //  8. 飞行器
    // ================================================================
    function createDrones(scene) {
        var droneCount = isLowPerf ? 3 : 6;
        var trailMaxLength = isLowPerf ? 20 : 50;
        var drones = [];

        var bodyMat = new THREE.MeshStandardMaterial({
            color: 0x222233,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x111122,
            emissiveIntensity: 0.3,
        });

        for (var di = 0; di < droneCount; di++) {
            var group = new THREE.Group();

            // 机身
            var bodyGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
            var body = new THREE.Mesh(bodyGeo, bodyMat);
            group.add(body);

            // 两侧翼
            var wingGeo = new THREE.BoxGeometry(0.8, 0.05, 0.15);
            var wingL = new THREE.Mesh(wingGeo, bodyMat);
            wingL.position.set(-0.5, 0, 0);
            group.add(wingL);
            var wingR = new THREE.Mesh(wingGeo, bodyMat);
            wingR.position.set(0.5, 0, 0);
            group.add(wingR);

            // 前灯
            var frontLight = new THREE.PointLight(COLORS.cyan, 1.5, 10);
            frontLight.position.set(0, 0, -0.25);
            group.add(frontLight);
            var fBulbGeo = new THREE.SphereGeometry(0.1, 6, 6);
            var fBulbMat = new THREE.MeshBasicMaterial({ color: COLORS.cyan, blending: THREE.AdditiveBlending, depthWrite: false });
            var fBulb = new THREE.Mesh(fBulbGeo, fBulbMat);
            fBulb.position.set(0, 0, -0.25);
            group.add(fBulb);

            // 后灯
            var rearLight = new THREE.PointLight(COLORS.magenta, 1.0, 8);
            rearLight.position.set(0, 0, 0.25);
            group.add(rearLight);
            var rBulb = new THREE.Mesh(fBulbGeo, new THREE.MeshBasicMaterial({ color: COLORS.magenta, blending: THREE.AdditiveBlending, depthWrite: false }));
            rBulb.position.set(0, 0, 0.25);
            group.add(rBulb);

            // 尾迹
            var trailPositions = new Float32Array(trailMaxLength * 3);
            var trailGeo = new THREE.BufferGeometry();
            trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            trailGeo.setDrawRange(0, 0);
            var trailMat = new THREE.LineBasicMaterial({
                color: COLORS.magenta,
                transparent: true,
                opacity: 0.6,
                linewidth: 1,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            var trailLine = new THREE.Line(trailGeo, trailMat);
            scene.add(trailLine);

            // 轨道：围绕金字塔
            var orbit = {
                centerX: 0,
                centerZ: -35,
                radiusX: 15 + Math.random() * 15,
                radiusZ: 10 + Math.random() * 10,
                height: 20 + Math.random() * 20,
                speed: 0.2 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
            };

            group.position.set(
                orbit.centerX + orbit.radiusX,
                orbit.height,
                orbit.centerZ
            );
            scene.add(group);

            drones.push({
                group: group,
                frontLight: frontLight,
                rearLight: rearLight,
                trail: {
                    line: trailLine,
                    positions: trailPositions,
                    maxLength: trailMaxLength,
                    history: [],
                },
                orbit: orbit,
                prevX: group.position.x,
                prevZ: group.position.z,
            });
        }

        return { drones: drones };
    }

    // ================================================================
    //  9. 全息投影
    // ================================================================
    function createHolograms(scene) {
        // --- 旋转线框二十面体（金字塔正下方）---
        var icoGroup = new THREE.Group();

        var outerGeo = new THREE.IcosahedronGeometry(5, 1);
        var outerEdges = new THREE.EdgesGeometry(outerGeo);
        var outerMat = new THREE.LineBasicMaterial({
            color: COLORS.cyan,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var outerMesh = new THREE.LineSegments(outerEdges, outerMat);
        icoGroup.add(outerMesh);

        var innerGeo = new THREE.IcosahedronGeometry(3, 0);
        var innerEdges = new THREE.EdgesGeometry(innerGeo);
        var innerMat = new THREE.LineBasicMaterial({
            color: COLORS.magenta,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var innerMesh = new THREE.LineSegments(innerEdges, innerMat);
        icoGroup.add(innerMesh);

        icoGroup.position.set(0, 25, -35);
        scene.add(icoGroup);

        // --- 数据球 ---
        var dataSphereGroup = null;
        var dataSpherePoints = null;

        if (!isLowPerf || !isMobile) {
            dataSphereGroup = new THREE.Group();

            var sphereGeo = new THREE.SphereGeometry(3, 16, 16);
            var sphereEdges = new THREE.EdgesGeometry(sphereGeo);
            var sphereMat = new THREE.LineBasicMaterial({
                color: COLORS.cyan,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            var sphereLines = new THREE.LineSegments(sphereEdges, sphereMat);
            dataSphereGroup.add(sphereLines);

            var pointCount = 250;
            var pointPositions = new Float32Array(pointCount * 3);
            for (var pi = 0; pi < pointCount; pi++) {
                var theta = Math.random() * Math.PI * 2;
                var phi = Math.acos(2 * Math.random() - 1);
                var r = 3;
                pointPositions[pi * 3]     = r * Math.sin(phi) * Math.cos(theta);
                pointPositions[pi * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                pointPositions[pi * 3 + 2] = r * Math.cos(phi);
            }
            var ptGeo = new THREE.BufferGeometry();
            ptGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
            var ptMat = new THREE.PointsMaterial({
                color: COLORS.cyan,
                size: 0.1,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            dataSpherePoints = new THREE.Points(ptGeo, ptMat);
            dataSphereGroup.add(dataSpherePoints);

            dataSphereGroup.position.set(15, 22, -25);
            scene.add(dataSphereGroup);
        }

        return {
            icosahedron: { group: icoGroup, outerMesh: outerMesh, innerMesh: innerMesh },
            dataSphere: dataSphereGroup ? { group: dataSphereGroup, pointsMesh: dataSpherePoints } : null,
        };
    }

    // ================================================================
    //  10. 激光光柱
    // ================================================================
    function createLaserBeams(scene) {
        var beams = [];

        var beamMat = function (color) {
            return new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
        };

        // 金字塔底面四角向下的光柱（y 从 33 到 0）
        var pyramidCorners = [
            { x: -18, z: -53 },
            { x:  18, z: -53 },
            { x: -18, z: -17 },
            { x:  18, z: -17 },
        ];
        var vertFromPyramid = isLowPerf ? 2 : 4;
        for (var vi = 0; vi < vertFromPyramid; vi++) {
            var corner = pyramidCorners[vi];
            var vHeight = 33;
            var vGeo = new THREE.CylinderGeometry(0.1, 0.1, vHeight, 6);
            var vMesh = new THREE.Mesh(vGeo, beamMat(COLORS.cyan));
            vMesh.position.set(corner.x, vHeight / 2, corner.z);
            scene.add(vMesh);
            beams.push({
                mesh: vMesh,
                baseOpacity: 0.7,
                breathSpeed: 0.8 + Math.random() * 0.6,
                breathPhase: Math.random() * Math.PI * 2,
            });
        }

        // 桥末端两侧向上的光柱（y 从 0 到 50）
        if (!isLowPerf) {
            var bridgeEnds = [
                { x: -3, z: -70 },
                { x:  3, z: -70 },
            ];
            for (var bi = 0; bi < 2; bi++) {
                var bEnd = bridgeEnds[bi];
                var bHeight = 50;
                var bGeo = new THREE.CylinderGeometry(0.1, 0.1, bHeight, 6);
                var bMesh = new THREE.Mesh(bGeo, beamMat(COLORS.magenta));
                bMesh.position.set(bEnd.x, bHeight / 2, bEnd.z);
                scene.add(bMesh);
                beams.push({
                    mesh: bMesh,
                    baseOpacity: 0.7,
                    breathSpeed: 0.6 + Math.random() * 0.5,
                    breathPhase: Math.random() * Math.PI * 2,
                });
            }

            // 交叉光柱：从桥中段斜向金字塔
            var crossConfigs = [
                { x: -3, y: 1, z: -40, tiltX: -0.4, tiltZ: 0.15 },
                { x:  3, y: 1, z: -40, tiltX: -0.4, tiltZ: -0.15 },
            ];
            for (var ci = 0; ci < 2; ci++) {
                var cc = crossConfigs[ci];
                var cHeight = 40;
                var cGeo = new THREE.CylinderGeometry(0.1, 0.1, cHeight, 6);
                var cMesh = new THREE.Mesh(cGeo, beamMat(COLORS.purple));
                cMesh.position.set(cc.x, cc.y + cHeight / 2, cc.z);
                cMesh.rotation.x = cc.tiltX;
                cMesh.rotation.z = cc.tiltZ;
                scene.add(cMesh);
                beams.push({
                    mesh: cMesh,
                    baseOpacity: 0.7,
                    breathSpeed: 0.7 + Math.random() * 0.5,
                    breathPhase: Math.random() * Math.PI * 2,
                });
            }
        }

        return { beams: beams };
    }

    // ================================================================
    //  12. 地面
    // ================================================================
    function createGround(scene) {
        var geo = new THREE.PlaneGeometry(200, 200);
        var mat = new THREE.MeshStandardMaterial({
            color: 0x080015,
            metalness: 0.95,
            roughness: 0.05,
            transparent: true,
            opacity: 0.8,
        });
        var ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);
    }

    // ================================================================
    //  动画主循环
    // ================================================================
    function animate(sceneData, scrollProgress, time) {
        if (!sceneData.isRunning) return;

        var camera = sceneData.camera;
        var renderer = sceneData.renderer;
        var scene = sceneData.scene;
        var t = time * 0.001;

        // ---- 11. 摄像机环绕 ----
        var angle = scrollProgress * Math.PI * 0.6;
        var radius = 35;
        camera.position.x = radius * Math.sin(angle);
        camera.position.z = -35 + radius * Math.cos(angle);
        camera.position.y = 12 + scrollProgress * 8;
        camera.lookAt(0, 30, -35);

        // ---- 灯光微动 ----
        sceneData.pointLight1.position.x = Math.sin(t * 0.5) * 5;
        sceneData.pointLight2.position.z = 10 + Math.cos(t * 0.3) * 5;

        // ---- 金字塔浮动 ----
        if (sceneData.pyramid) {
            sceneData.pyramid.group.position.y = Math.sin(t * 0.3) * 1.0;
        }

        // ---- 粒子下落 ----
        if (sceneData.particles) {
            // Cyan
            var cp = sceneData.particles.cyan;
            var cArr = cp.points.geometry.attributes.position.array;
            for (var i = 0; i < cp.count; i++) {
                cArr[i * 3 + 1] -= cp.velocities[i];
                if (cArr[i * 3 + 1] < 0) {
                    cArr[i * 3 + 1] = 60 + Math.random() * 10;
                    cArr[i * 3]     = (Math.random() - 0.5) * 160;
                    cArr[i * 3 + 2] = (Math.random() - 0.5) * 160;
                }
            }
            cp.points.geometry.attributes.position.needsUpdate = true;

            // Magenta
            if (sceneData.particles.magenta) {
                var mp = sceneData.particles.magenta;
                var mArr = mp.points.geometry.attributes.position.array;
                for (var mi = 0; mi < mp.count; mi++) {
                    mArr[mi * 3 + 1] -= mp.velocities[mi];
                    if (mArr[mi * 3 + 1] < 0) {
                        mArr[mi * 3 + 1] = 60 + Math.random() * 10;
                        mArr[mi * 3]     = (Math.random() - 0.5) * 160;
                        mArr[mi * 3 + 2] = (Math.random() - 0.5) * 160;
                    }
                }
                mp.points.geometry.attributes.position.needsUpdate = true;
            }
        }

        // ---- 线缆发光点移动 ----
        if (sceneData.cables) {
            var dots = sceneData.cables.glowDots;
            for (var gi = 0; gi < dots.length; gi++) {
                var gd = dots[gi];
                gd.progress += gd.speed;
                if (gd.progress > 1) gd.progress = 0;
                var pt = gd.curve.getPoint(gd.progress);
                gd.mesh.position.copy(pt);
            }
        }

        // ---- 飞行器动画 ----
        if (sceneData.drones) {
            var droneList = sceneData.drones.drones;
            for (var di = 0; di < droneList.length; di++) {
                var drone = droneList[di];
                var orb = drone.orbit;

                var newX = orb.centerX + orb.radiusX * Math.cos(t * orb.speed + orb.phase);
                var newZ = orb.centerZ + orb.radiusZ * Math.sin(t * orb.speed + orb.phase);
                var newY = orb.height + Math.sin(t * orb.speed * 2) * 2;

                drone.group.position.set(newX, newY, newZ);

                // 朝向运动方向 + bank angle
                var dx = newX - drone.prevX;
                var dz = newZ - drone.prevZ;
                if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
                    drone.group.rotation.y = Math.atan2(dx, dz);
                    drone.group.rotation.z = -dx * 0.3; // bank
                }
                drone.prevX = newX;
                drone.prevZ = newZ;

                // 尾迹
                var trail = drone.trail;
                trail.history.unshift(newX, newY, newZ);
                if (trail.history.length > trail.maxLength * 3) {
                    trail.history.length = trail.maxLength * 3;
                }
                var drawCount = trail.history.length / 3;
                for (var ti = 0; ti < trail.history.length; ti++) {
                    trail.positions[ti] = trail.history[ti];
                }
                trail.line.geometry.attributes.position.needsUpdate = true;
                trail.line.geometry.setDrawRange(0, drawCount);
            }
        }

        // ---- 全息投影动画 ----
        if (sceneData.holograms) {
            var holo = sceneData.holograms;

            // 二十面体
            holo.icosahedron.outerMesh.rotation.y += 0.003;
            holo.icosahedron.outerMesh.rotation.x += 0.001;
            holo.icosahedron.innerMesh.rotation.y -= 0.005;
            holo.icosahedron.group.position.y = 25 + Math.sin(t * 0.4) * 1.5;
            holo.icosahedron.outerMesh.material.opacity = 0.5 + 0.3 * Math.sin(t * 0.8);

            // 数据球
            if (holo.dataSphere) {
                holo.dataSphere.group.rotation.y += 0.004;
                holo.dataSphere.group.rotation.x = Math.sin(t * 0.2) * 0.2;
                holo.dataSphere.pointsMesh.material.opacity = 0.6 + 0.4 * Math.sin(t * 1.5);
            }
        }

        // ---- 激光光柱呼吸动画 ----
        if (sceneData.laserBeams) {
            var lbBeams = sceneData.laserBeams.beams;
            for (var bi = 0; bi < lbBeams.length; bi++) {
                var beam = lbBeams[bi];
                var breathVal = 0.6 + 0.4 * Math.sin(t * beam.breathSpeed + beam.breathPhase);
                beam.mesh.material.opacity = beam.baseOpacity * breathVal;

                // 随机闪烁
                if (Math.random() < 0.002) {
                    beam.mesh.material.opacity = 1.0;
                }
            }
        }

        renderer.render(scene, camera);
    }

    // ========== 公开接口 ==========
    return {
        initScene: initScene,
        animate: animate,
    };
})();
