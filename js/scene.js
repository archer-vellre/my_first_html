/* 宇宙太空 3D 场景 — 星空 + 星云 + 流星 + 星尘 */
/* 依赖全局 THREE (v0.160 CDN) */
var CyberScene = (function () {

    // ========== 颜色常量 ==========
    var COLORS = {
        cyan: 0x00fff5,
        magenta: 0xff00ff,
        purple: 0xb300ff,
        starWhite: 0xffffff,
        starBlue: 0xaaddff,
        nebulaPink: 0xff4488,
        nebulaBlue: 0x2244ff,
        nebulaPurple: 0x8822cc,
    };

    // ========== 纹理生成 ==========
    // 圆形渐变纹理，消除方形马赛克
    function createGlowTexture(size, coreRatio) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        var half = size / 2;
        var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(coreRatio || 0.15, 'rgba(255,255,255,0.8)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        var tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    // 恒星表面纹理（带热斑）
    function createStarSurfaceTexture(size) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        // 基础渐变：中心亮白→边缘橙红
        var grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, '#ffffee');
        grad.addColorStop(0.3, '#ffeecc');
        grad.addColorStop(0.6, '#ffaa44');
        grad.addColorStop(0.85, '#ff6622');
        grad.addColorStop(1, '#cc3300');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        // 随机热斑
        for (var i = 0; i < 40; i++) {
            var sx = Math.random() * size;
            var sy = Math.random() * size;
            var sr = 2 + Math.random() * 8;
            var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            sg.addColorStop(0, 'rgba(255,255,200,0.3)');
            sg.addColorStop(1, 'rgba(255,200,100,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
        var tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    // 云团纹理（多层叠加的不规则柔和团状）
    function createCloudTexture(size, r, g, b) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        var half = size / 2;

        // 多个偏移圆叠加出不规则云形
        var blobs = [
            { x: half,            y: half,            r: half * 0.7,  a: 0.4 },
            { x: half - half*0.3, y: half - half*0.2, r: half * 0.5,  a: 0.3 },
            { x: half + half*0.25,y: half + half*0.15,r: half * 0.55, a: 0.3 },
            { x: half - half*0.1, y: half + half*0.3, r: half * 0.45, a: 0.25 },
            { x: half + half*0.35,y: half - half*0.25,r: half * 0.4,  a: 0.2 },
            { x: half - half*0.35,y: half + half*0.1, r: half * 0.35, a: 0.2 },
        ];

        for (var i = 0; i < blobs.length; i++) {
            var bl = blobs[i];
            var grad = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, bl.r);
            grad.addColorStop(0,   'rgba(' + r + ',' + g + ',' + b + ',' + bl.a + ')');
            grad.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + (bl.a * 0.5) + ')');
            grad.addColorStop(1,   'rgba(' + r + ',' + g + ',' + b + ',0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);
        }

        var tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    // ========== 性能检测 ==========
    var isMobile = false;
    var isLowPerf = false;

    // 共享纹理（initScene 中初始化）
    var glowTex = null;
    var starGlowTex = null;

    // ========== 主入口 ==========
    function initScene(canvas) {
        isMobile = window.innerWidth < 768;
        isLowPerf = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

        // --- Scene ---
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020010);
        scene.fog = new THREE.FogExp2(0x020010, 0.0008);

        // --- Camera ---
        var camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        camera.position.set(0, 0, 50);
        camera.lookAt(0, 0, 0);

        // --- Renderer ---
        var renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        // ========== 灯光系统 ==========
        scene.add(new THREE.AmbientLight(0x111133, 0.5));

        var pointLight1 = new THREE.PointLight(COLORS.cyan, 1.5, 200);
        pointLight1.position.set(30, 20, 40);
        scene.add(pointLight1);

        var pointLight2 = new THREE.PointLight(COLORS.magenta, 1.2, 200);
        pointLight2.position.set(-30, -15, 30);
        scene.add(pointLight2);

        // ========== 共享纹理 ==========
        glowTex = createGlowTexture(128, 0.1);
        starGlowTex = createGlowTexture(64, 0.25);

        // ========== 场景元素 ==========
        var starField = createStarField(scene);
        var nebulae = createNebulae(scene);
        var cosmicDust = createCosmicDust(scene);
        var shootingStars = createShootingStars(scene);
        var star = createStar(scene);

        var galaxySpiral = null;
        if (!isMobile) {
            galaxySpiral = createGalaxySpiral(scene);
        }

        var spacecrafts = createSpacecrafts(scene);
        var nebulaClouds = createNebulaClouds(scene);

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
            starField: starField,
            nebulae: nebulae,
            cosmicDust: cosmicDust,
            shootingStars: shootingStars,
            star: star,
            galaxySpiral: galaxySpiral,
            spacecrafts: spacecrafts,
            nebulaClouds: nebulaClouds,
            pointLight1: pointLight1,
            pointLight2: pointLight2,
            isRunning: true,
        };
    }

    // ================================================================
    //  1. 星空背景 — 多层星星，不同大小和亮度
    // ================================================================
    function createStarField(scene) {
        var layers = [];

        // 远景小星星
        var farCount = isMobile ? 3000 : (isLowPerf ? 6000 : 15000);
        var farPositions = new Float32Array(farCount * 3);
        var farColors = new Float32Array(farCount * 3);
        for (var i = 0; i < farCount; i++) {
            // 在球面上均匀分布
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            var r = 300 + Math.random() * 700;
            farPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            farPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            farPositions[i * 3 + 2] = r * Math.cos(phi);

            // 随机偏色：白、淡蓝、淡黄
            var colorRoll = Math.random();
            if (colorRoll < 0.6) {
                // 白色
                farColors[i * 3] = 0.9 + Math.random() * 0.1;
                farColors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                farColors[i * 3 + 2] = 0.95 + Math.random() * 0.05;
            } else if (colorRoll < 0.8) {
                // 淡蓝
                farColors[i * 3] = 0.7 + Math.random() * 0.1;
                farColors[i * 3 + 1] = 0.8 + Math.random() * 0.1;
                farColors[i * 3 + 2] = 1.0;
            } else {
                // 淡黄/橙
                farColors[i * 3] = 1.0;
                farColors[i * 3 + 1] = 0.85 + Math.random() * 0.1;
                farColors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
            }
        }
        var farGeo = new THREE.BufferGeometry();
        farGeo.setAttribute('position', new THREE.BufferAttribute(farPositions, 3));
        farGeo.setAttribute('color', new THREE.BufferAttribute(farColors, 3));
        var farMat = new THREE.PointsMaterial({
            size: 0.8,
            map: starGlowTex,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        var farStars = new THREE.Points(farGeo, farMat);
        scene.add(farStars);
        layers.push(farStars);

        // 近景亮星
        var nearCount = isMobile ? 500 : (isLowPerf ? 1000 : 2000);
        var nearPositions = new Float32Array(nearCount * 3);
        var nearColors = new Float32Array(nearCount * 3);
        var nearTwinklePhases = new Float32Array(nearCount);
        for (var ni = 0; ni < nearCount; ni++) {
            var nt = Math.random() * Math.PI * 2;
            var np = Math.acos(2 * Math.random() - 1);
            var nr = 80 + Math.random() * 250;
            nearPositions[ni * 3]     = nr * Math.sin(np) * Math.cos(nt);
            nearPositions[ni * 3 + 1] = nr * Math.sin(np) * Math.sin(nt);
            nearPositions[ni * 3 + 2] = nr * Math.cos(np);
            nearTwinklePhases[ni] = Math.random() * Math.PI * 2;

            var ncRoll = Math.random();
            if (ncRoll < 0.4) {
                nearColors[ni * 3] = 0.6; nearColors[ni * 3 + 1] = 0.9; nearColors[ni * 3 + 2] = 1.0;
            } else if (ncRoll < 0.7) {
                nearColors[ni * 3] = 1.0; nearColors[ni * 3 + 1] = 1.0; nearColors[ni * 3 + 2] = 1.0;
            } else {
                nearColors[ni * 3] = 1.0; nearColors[ni * 3 + 1] = 0.6; nearColors[ni * 3 + 2] = 1.0;
            }
        }
        var nearGeo = new THREE.BufferGeometry();
        nearGeo.setAttribute('position', new THREE.BufferAttribute(nearPositions, 3));
        nearGeo.setAttribute('color', new THREE.BufferAttribute(nearColors, 3));
        var nearMat = new THREE.PointsMaterial({
            size: 1.8,
            map: starGlowTex,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var nearStars = new THREE.Points(nearGeo, nearMat);
        scene.add(nearStars);
        layers.push(nearStars);

        return {
            layers: layers,
            nearStars: nearStars,
            nearTwinklePhases: nearTwinklePhases,
            nearCount: nearCount,
        };
    }

    // ================================================================
    //  2. 星云 — 大型半透明粒子群，赛博色调
    // ================================================================
    function createNebulae(scene) {
        var nebulae = [];

        var configs = [
            // 大型主星云
            { cx: -80,  cy: 30,   cz: -200, spread: 120, count: isMobile ? 150 : 600,  color: 0xff00ff, opacity: 0.07, size: 30 },
            { cx: 120,  cy: -40,  cz: -300, spread: 140, count: isMobile ? 120 : 500,  color: 0x6600ff, opacity: 0.06, size: 35 },
            { cx: -40,  cy: -60,  cz: -150, spread: 100, count: isMobile ? 100 : 450,  color: 0x00ccff, opacity: 0.05, size: 25 },
            { cx: 60,   cy: 80,   cz: -400, spread: 160, count: isMobile ? 80 : 400,   color: 0xff4488, opacity: 0.04, size: 40 },
            // 中型补充星云
            { cx: -150, cy: -20,  cz: -350, spread: 90,  count: isMobile ? 60 : 350,   color: 0x4400cc, opacity: 0.05, size: 28 },
            { cx: 80,   cy: 50,   cz: -120, spread: 70,  count: isMobile ? 70 : 300,   color: 0x00ffaa, opacity: 0.04, size: 22 },
            { cx: 0,    cy: -80,  cz: -500, spread: 180, count: isMobile ? 50 : 350,   color: 0xff2266, opacity: 0.03, size: 45 },
            // 远景淡星云
            { cx: -200, cy: 60,   cz: -600, spread: 200, count: isMobile ? 40 : 250,   color: 0x2244ff, opacity: 0.025, size: 50 },
            { cx: 180,  cy: -50,  cz: -550, spread: 170, count: isMobile ? 40 : 250,   color: 0xcc44ff, opacity: 0.025, size: 45 },
        ];

        for (var ci = 0; ci < configs.length; ci++) {
            var cfg = configs[ci];
            var positions = new Float32Array(cfg.count * 3);

            for (var pi = 0; pi < cfg.count; pi++) {
                // 高斯分布模拟云状聚集
                var gx = gaussRandom() * cfg.spread;
                var gy = gaussRandom() * cfg.spread * 0.6;
                var gz = gaussRandom() * cfg.spread;
                positions[pi * 3]     = cfg.cx + gx;
                positions[pi * 3 + 1] = cfg.cy + gy;
                positions[pi * 3 + 2] = cfg.cz + gz;
            }

            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            var mat = new THREE.PointsMaterial({
                color: cfg.color,
                size: cfg.size,
                map: glowTex,
                transparent: true,
                opacity: cfg.opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            var points = new THREE.Points(geo, mat);
            scene.add(points);
            nebulae.push({ points: points, config: cfg });
        }

        return nebulae;
    }

    // ================================================================
    //  2b. 星云云团 — 大型 Sprite 叠加出真实云雾感
    // ================================================================
    function createNebulaClouds(scene) {
        var clouds = [];

        var configs = [
            // { 位置, 颜色 RGB, Sprite 数量, 范围, 单个尺寸范围, 透明度 }
            { cx: -60,  cy: 20,   cz: -180, r: 180, g: 40,  b: 255, count: isMobile ? 4 : 10, spread: 60,  sizeMin: 50,  sizeMax: 120, opacity: 0.08 },
            { cx: 100,  cy: -30,  cz: -280, r: 60,  g: 100, b: 255, count: isMobile ? 3 : 8,  spread: 70,  sizeMin: 60,  sizeMax: 140, opacity: 0.06 },
            { cx: -30,  cy: -50,  cz: -130, r: 0,   g: 200, b: 220, count: isMobile ? 3 : 8,  spread: 50,  sizeMin: 40,  sizeMax: 100, opacity: 0.07 },
            { cx: 50,   cy: 60,   cz: -380, r: 255, g: 50,  b: 120, count: isMobile ? 3 : 7,  spread: 80,  sizeMin: 70,  sizeMax: 160, opacity: 0.05 },
            { cx: -140, cy: -10,  cz: -320, r: 100, g: 0,   b: 200, count: isMobile ? 2 : 6,  spread: 55,  sizeMin: 50,  sizeMax: 110, opacity: 0.06 },
            { cx: 30,   cy: 40,   cz: -100, r: 0,   g: 180, b: 160, count: isMobile ? 2 : 5,  spread: 40,  sizeMin: 35,  sizeMax: 80,  opacity: 0.07 },
            { cx: -100, cy: 70,   cz: -480, r: 220, g: 80,  b: 255, count: isMobile ? 2 : 6,  spread: 90,  sizeMin: 80,  sizeMax: 180, opacity: 0.04 },
        ];

        for (var ci = 0; ci < configs.length; ci++) {
            var cfg = configs[ci];
            var tex = createCloudTexture(256, cfg.r, cfg.g, cfg.b);
            var groupSprites = [];

            for (var si = 0; si < cfg.count; si++) {
                var spriteMat = new THREE.SpriteMaterial({
                    map: tex,
                    transparent: true,
                    opacity: cfg.opacity * (0.6 + Math.random() * 0.4),
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                var sprite = new THREE.Sprite(spriteMat);

                var sx = cfg.cx + gaussRandom() * cfg.spread;
                var sy = cfg.cy + gaussRandom() * cfg.spread * 0.5;
                var sz = cfg.cz + gaussRandom() * cfg.spread;
                sprite.position.set(sx, sy, sz);

                var s = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
                sprite.scale.set(s, s, 1);

                scene.add(sprite);
                groupSprites.push({
                    sprite: sprite,
                    baseOpacity: spriteMat.opacity,
                    driftX: (Math.random() - 0.5) * 0.005,
                    driftY: (Math.random() - 0.5) * 0.003,
                    breathSpeed: 0.2 + Math.random() * 0.3,
                    breathPhase: Math.random() * Math.PI * 2,
                });
            }

            clouds.push(groupSprites);
        }

        return clouds;
    }

    // ================================================================
    //  3. 宇宙尘埃 — 缓慢漂浮的微小粒子
    // ================================================================
    function createCosmicDust(scene) {
        var count = isMobile ? 400 : (isLowPerf ? 800 : 1500);
        var positions = new Float32Array(count * 3);
        var velocities = new Float32Array(count * 3); // 各方向速度

        for (var i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300;

            velocities[i * 3]     = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var mat = new THREE.PointsMaterial({
            color: COLORS.cyan,
            size: 0.5,
            map: starGlowTex,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var dustPoints = new THREE.Points(geo, mat);
        scene.add(dustPoints);

        return {
            points: dustPoints,
            positions: positions,
            velocities: velocities,
            count: count,
        };
    }

    // ================================================================
    //  4. 流星
    // ================================================================
    function createShootingStars(scene) {
        var maxActive = isMobile ? 2 : 5;
        var meteors = [];

        for (var i = 0; i < maxActive; i++) {
            var trailLen = 30;
            var trailPositions = new Float32Array(trailLen * 3);
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            geo.setDrawRange(0, 0);

            var mat = new THREE.LineBasicMaterial({
                color: COLORS.starWhite,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            var line = new THREE.Line(geo, mat);
            scene.add(line);

            meteors.push({
                line: line,
                positions: trailPositions,
                trailLen: trailLen,
                active: false,
                x: 0, y: 0, z: 0,
                vx: 0, vy: 0, vz: 0,
                life: 0,
                maxLife: 0,
                history: [],
            });
        }

        return { meteors: meteors };
    }

    // ================================================================
    //  5. 恒星 — 随滚动逐渐靠近变大的发光球体
    // ================================================================
    function createStar(scene) {
        var group = new THREE.Group();
        // 恒星位于摄像机前方远处，滚动时逐渐靠近
        group.position.set(15, 25, -250);

        // 恒星球体（带表面纹理）
        var surfaceTex = createStarSurfaceTexture(256);
        var starGeo = new THREE.SphereGeometry(8, 32, 32);
        var starMat = new THREE.MeshBasicMaterial({
            map: surfaceTex,
            transparent: false,
        });
        var starMesh = new THREE.Mesh(starGeo, starMat);
        group.add(starMesh);

        // 内层光晕
        var innerGlowGeo = new THREE.SphereGeometry(9.5, 32, 32);
        var innerGlowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa33,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide,
        });
        var innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
        group.add(innerGlow);

        // 外层光晕（更大、更淡）
        var outerGlowGeo = new THREE.SphereGeometry(14, 32, 32);
        var outerGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide,
        });
        var outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
        group.add(outerGlow);

        // 恒星自带的点光源，照亮周围粒子
        var starLight = new THREE.PointLight(0xffaa44, 3, 300);
        group.add(starLight);

        // 日冕粒子环
        var coronaCount = isMobile ? 100 : 300;
        var coronaPositions = new Float32Array(coronaCount * 3);
        var coronaSpeeds = new Float32Array(coronaCount);
        for (var ci = 0; ci < coronaCount; ci++) {
            var cTheta = Math.random() * Math.PI * 2;
            var cPhi = Math.acos(2 * Math.random() - 1);
            var cR = 10 + Math.random() * 8;
            coronaPositions[ci * 3]     = cR * Math.sin(cPhi) * Math.cos(cTheta);
            coronaPositions[ci * 3 + 1] = cR * Math.sin(cPhi) * Math.sin(cTheta);
            coronaPositions[ci * 3 + 2] = cR * Math.cos(cPhi);
            coronaSpeeds[ci] = 0.5 + Math.random() * 1.5;
        }
        var coronaGeo = new THREE.BufferGeometry();
        coronaGeo.setAttribute('position', new THREE.BufferAttribute(coronaPositions, 3));
        var coronaMat = new THREE.PointsMaterial({
            color: 0xffcc66,
            size: 1.5,
            map: glowTex,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var coronaPoints = new THREE.Points(coronaGeo, coronaMat);
        group.add(coronaPoints);

        scene.add(group);

        return {
            group: group,
            mesh: starMesh,
            innerGlow: innerGlow,
            outerGlow: outerGlow,
            light: starLight,
            innerGlowMat: innerGlowMat,
            outerGlowMat: outerGlowMat,
            corona: { points: coronaPoints, positions: coronaPositions, speeds: coronaSpeeds, count: coronaCount },
            // 初始和目标位置
            startZ: -250,
            endZ: -40,
            startScale: 0.3,
            endScale: 1.8,
        };
    }

    // ================================================================
    //  6. 螺旋星系（仅桌面端）
    // ================================================================
    function createGalaxySpiral(scene) {
        var armCount = 3;
        var pointsPerArm = isLowPerf ? 300 : 800;
        var totalPoints = armCount * pointsPerArm;
        var positions = new Float32Array(totalPoints * 3);
        var colors = new Float32Array(totalPoints * 3);

        var galaxyCenterX = -60;
        var galaxyCenterY = 50;
        var galaxyCenterZ = -350;

        for (var arm = 0; arm < armCount; arm++) {
            var armAngle = (arm / armCount) * Math.PI * 2;
            for (var pi = 0; pi < pointsPerArm; pi++) {
                var idx = (arm * pointsPerArm + pi) * 3;
                var dist = Math.random() * 60;
                var angle = armAngle + dist * 0.06 + (Math.random() - 0.5) * 0.3;
                var spread = dist * 0.08;

                positions[idx]     = galaxyCenterX + dist * Math.cos(angle) + gaussRandom() * spread;
                positions[idx + 1] = galaxyCenterY + gaussRandom() * 3;
                positions[idx + 2] = galaxyCenterZ + dist * Math.sin(angle) + gaussRandom() * spread;

                // 中心偏亮偏白，外围偏蓝紫
                var ratio = dist / 60;
                colors[idx]     = 1.0 - ratio * 0.5;
                colors[idx + 1] = 0.7 - ratio * 0.3;
                colors[idx + 2] = 0.8 + ratio * 0.2;
            }
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        var mat = new THREE.PointsMaterial({
            size: 1.2,
            map: starGlowTex,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        var galaxyPoints = new THREE.Points(geo, mat);
        scene.add(galaxyPoints);

        return { points: galaxyPoints, centerX: galaxyCenterX, centerY: galaxyCenterY, centerZ: galaxyCenterZ };
    }

    // ================================================================
    //  7. 宇宙飞行器 — 多种类型，带引擎尾焰
    // ================================================================
    function createSpacecrafts(scene) {
        var ships = [];
        var shipCount = isMobile ? 1 : (isLowPerf ? 2 : 3);

        var bodyMat = new THREE.MeshStandardMaterial({
            color: 0x8899aa,
            metalness: 0.7,
            roughness: 0.2,
            emissive: 0x334466,
            emissiveIntensity: 0.5,
        });

        var darkMat = new THREE.MeshStandardMaterial({
            color: 0x667788,
            metalness: 0.6,
            roughness: 0.3,
            emissive: 0x223344,
            emissiveIntensity: 0.4,
        });

        for (var si = 0; si < shipCount; si++) {
            var group = new THREE.Group();
            var engineColor = si % 3 === 0 ? COLORS.magenta : (si % 3 === 1 ? COLORS.cyan : COLORS.purple);

            // 随机选择飞船类型
            var shipType = si % 4;

            if (shipType === 0) {
                // === 战斗机型：尖头三角翼 ===
                // 机身（拉长的楔形）
                var fuselageGeo = new THREE.ConeGeometry(0.3, 2.5, 4);
                fuselageGeo.rotateX(Math.PI / 2);
                var fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
                group.add(fuselage);

                // 双翼
                var wingShape = new THREE.Shape();
                wingShape.moveTo(0, 0);
                wingShape.lineTo(-1.8, -0.8);
                wingShape.lineTo(-0.3, -0.2);
                wingShape.lineTo(0, 0);
                var wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false });
                var wingL = new THREE.Mesh(wingGeo, bodyMat);
                wingL.position.set(0, 0, 0.3);
                group.add(wingL);
                var wingR = new THREE.Mesh(wingGeo, bodyMat);
                wingR.scale.x = -1;
                wingR.position.set(0, 0, 0.3);
                group.add(wingR);

            } else if (shipType === 1) {
                // === 穿梭机型：圆润机身 + 短翼 ===
                var shuttleBody = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.35, 1.5, 8, 12),
                    bodyMat
                );
                shuttleBody.rotation.x = Math.PI / 2;
                group.add(shuttleBody);

                var sWingGeo = new THREE.BoxGeometry(2.0, 0.06, 0.6);
                var sWing = new THREE.Mesh(sWingGeo, darkMat);
                sWing.position.set(0, 0, 0.3);
                group.add(sWing);

                // 尾翼
                var tailGeo = new THREE.BoxGeometry(0.06, 0.6, 0.4);
                var tail = new THREE.Mesh(tailGeo, darkMat);
                tail.position.set(0, 0.3, 0.8);
                group.add(tail);

            } else if (shipType === 2) {
                // === 货运型：大型方块 ===
                var cargoBody = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 0.5, 2.0),
                    bodyMat
                );
                group.add(cargoBody);

                // 货舱模块
                var cargoModule = new THREE.Mesh(
                    new THREE.BoxGeometry(1.2, 0.3, 1.0),
                    darkMat
                );
                cargoModule.position.set(0, -0.1, -0.2);
                group.add(cargoModule);

                // 引擎舱
                var engPodGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 6);
                engPodGeo.rotateX(Math.PI / 2);
                for (var ep = -1; ep <= 1; ep += 2) {
                    var engPod = new THREE.Mesh(engPodGeo, darkMat);
                    engPod.position.set(ep * 0.5, 0, 1.1);
                    group.add(engPod);
                }

            } else {
                // === 侦察型：小巧灵活 ===
                var scoutBody = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3, 8, 6),
                    bodyMat
                );
                scoutBody.scale.set(1, 0.6, 1.5);
                group.add(scoutBody);

                // 前伸传感器
                var sensorGeo = new THREE.ConeGeometry(0.08, 0.6, 4);
                sensorGeo.rotateX(-Math.PI / 2);
                var sensor = new THREE.Mesh(sensorGeo, darkMat);
                sensor.position.set(0, 0, -0.6);
                group.add(sensor);

                // 小翼
                for (var sw = -1; sw <= 1; sw += 2) {
                    var miniWing = new THREE.Mesh(
                        new THREE.BoxGeometry(0.8, 0.03, 0.3),
                        bodyMat
                    );
                    miniWing.position.set(sw * 0.5, 0, 0.1);
                    miniWing.rotation.z = sw * 0.2;
                    group.add(miniWing);
                }
            }

            // === 霓虹描边（遍历所有子 mesh 加边缘线） ===
            var edgeColor = engineColor;
            group.traverse(function (child) {
                if (child.isMesh && child.geometry) {
                    var edgeGeo = new THREE.EdgesGeometry(child.geometry, 30);
                    var edgeMat = new THREE.LineBasicMaterial({
                        color: edgeColor,
                        transparent: true,
                        opacity: 0.7,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                    });
                    var edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
                    edgeLine.position.copy(child.position);
                    edgeLine.rotation.copy(child.rotation);
                    edgeLine.scale.copy(child.scale);
                    group.add(edgeLine);
                }
            });

            // === 舱内灯光（照亮机身） ===
            var cabinLight = new THREE.PointLight(edgeColor, 2, 8);
            cabinLight.position.set(0, 0.3, 0);
            group.add(cabinLight);

            // === 引擎发光（所有类型通用） ===
            var engineGlow = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: engineColor,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            engineGlow.position.set(0, 0, shipType === 2 ? 1.3 : 1.0);
            group.add(engineGlow);

            // 引擎点光源
            var engineLight = new THREE.PointLight(engineColor, 1.5, 15);
            engineLight.position.copy(engineGlow.position);
            group.add(engineLight);

            // === 尾焰拖尾（粒子渐隐） ===
            var trailMaxLen = isMobile ? 30 : 60;
            var trailPositions = new Float32Array(trailMaxLen * 3);
            var trailSizes = new Float32Array(trailMaxLen);
            var trailOpacities = new Float32Array(trailMaxLen);
            var trailGeo = new THREE.BufferGeometry();
            trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
            trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailOpacities, 1));
            trailGeo.setDrawRange(0, 0);
            var trailMat = new THREE.PointsMaterial({
                color: engineColor,
                size: 1.2,
                map: glowTex,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true,
            });
            var trailPoints = new THREE.Points(trailGeo, trailMat);
            scene.add(trailPoints);

            // === 航线参数 ===
            // 每艘飞船有自己的 3D 椭圆轨道 + 倾斜
            var orbitRadiusX = 30 + Math.random() * 80;
            var orbitRadiusY = 15 + Math.random() * 40;
            var orbitRadiusZ = 40 + Math.random() * 100;
            var orbitCenterX = (Math.random() - 0.5) * 40;
            var orbitCenterY = (Math.random() - 0.5) * 30;
            var orbitCenterZ = -100 - Math.random() * 150;
            var orbitSpeed = 0.08 + Math.random() * 0.15;
            var orbitPhase = Math.random() * Math.PI * 2;
            var orbitTiltX = (Math.random() - 0.5) * 0.6;
            var orbitTiltZ = (Math.random() - 0.5) * 0.4;

            // 初始位置
            group.position.set(
                orbitCenterX + orbitRadiusX * Math.cos(orbitPhase),
                orbitCenterY + orbitRadiusY * Math.sin(orbitPhase * 0.7),
                orbitCenterZ + orbitRadiusZ * Math.sin(orbitPhase)
            );
            scene.add(group);

            ships.push({
                group: group,
                engineGlow: engineGlow,
                engineLight: engineLight,
                trail: {
                    points: trailPoints,
                    positions: trailPositions,
                    sizes: trailSizes,
                    opacities: trailOpacities,
                    maxLength: trailMaxLen,
                    history: [],
                },
                orbit: {
                    cx: orbitCenterX, cy: orbitCenterY, cz: orbitCenterZ,
                    rx: orbitRadiusX, ry: orbitRadiusY, rz: orbitRadiusZ,
                    speed: orbitSpeed,
                    phase: orbitPhase,
                    tiltX: orbitTiltX,
                    tiltZ: orbitTiltZ,
                },
                prevPos: { x: group.position.x, y: group.position.y, z: group.position.z },
                shipType: shipType,
            });
        }

        // === 太阳轨道飞船：绕恒星旋转 ===
        var solarShip = createSolarOrbiter(scene, bodyMat, darkMat);

        return { ships: ships, solarShip: solarShip };
    }

    function createSolarOrbiter(scene, bodyMat, darkMat) {
        var group = new THREE.Group();
        var engineColor = 0x00ffaa;

        // 穿梭机造型（稍大一些，更显眼）
        var body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5, 2.0, 8, 12),
            bodyMat
        );
        body.rotation.x = Math.PI / 2;
        group.add(body);

        var wingGeo = new THREE.BoxGeometry(3.0, 0.06, 0.8);
        var wing = new THREE.Mesh(wingGeo, darkMat);
        wing.position.set(0, 0, 0.4);
        group.add(wing);

        var tailGeo = new THREE.BoxGeometry(0.06, 0.8, 0.5);
        var tail = new THREE.Mesh(tailGeo, darkMat);
        tail.position.set(0, 0.4, 1.0);
        group.add(tail);

        // 霓虹描边
        group.traverse(function (child) {
            if (child.isMesh && child.geometry) {
                var edgeGeo = new THREE.EdgesGeometry(child.geometry, 30);
                var edgeMat = new THREE.LineBasicMaterial({
                    color: engineColor,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                var edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
                edgeLine.position.copy(child.position);
                edgeLine.rotation.copy(child.rotation);
                edgeLine.scale.copy(child.scale);
                group.add(edgeLine);
            }
        });

        // 舱内灯
        var cabinLight = new THREE.PointLight(engineColor, 3, 12);
        cabinLight.position.set(0, 0.3, 0);
        group.add(cabinLight);

        // 双引擎发光
        for (var ei = -1; ei <= 1; ei += 2) {
            var glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: engineColor,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            glow.position.set(ei * 0.6, 0, 1.2);
            group.add(glow);

            var eLight = new THREE.PointLight(engineColor, 2, 15);
            eLight.position.set(ei * 0.6, 0, 1.2);
            group.add(eLight);
        }

        // 尾焰拖尾（粒子渐隐）
        var trailMaxLen = isMobile ? 35 : 70;
        var trailPositions = new Float32Array(trailMaxLen * 3);
        var trailSizes = new Float32Array(trailMaxLen);
        var trailOpacities = new Float32Array(trailMaxLen);
        var trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
        trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailOpacities, 1));
        trailGeo.setDrawRange(0, 0);
        var trailMat = new THREE.PointsMaterial({
            color: engineColor,
            size: 1.5,
            map: glowTex,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });
        var trailPoints = new THREE.Points(trailGeo, trailMat);
        scene.add(trailPoints);

        // 初始位置（恒星附近）
        group.position.set(15 + 25, 25, -250);
        scene.add(group);

        return {
            group: group,
            trail: {
                points: trailPoints,
                positions: trailPositions,
                sizes: trailSizes,
                opacities: trailOpacities,
                maxLength: trailMaxLen,
                history: [],
            },
            // 轨道参数：围绕恒星
            orbitRadius: 25,
            orbitSpeed: 0.15,
            orbitTilt: 0.3,
            prevPos: { x: group.position.x, y: group.position.y, z: group.position.z },
        };
    }

    // ================================================================
    //  工具函数
    // ================================================================
    function gaussRandom() {
        // Box-Muller 变换
        var u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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

        // ---- 摄像机：随滚动缓慢穿越星空 ----
        var baseZ = 50 - scrollProgress * 80;
        var baseY = scrollProgress * 20;
        var sway = Math.sin(t * 0.15) * 3;
        camera.position.set(sway, baseY + Math.sin(t * 0.1) * 2, baseZ);
        camera.lookAt(sway * 0.5, baseY, baseZ - 100);

        // ---- 灯光微动 ----
        sceneData.pointLight1.position.x = 30 + Math.sin(t * 0.3) * 15;
        sceneData.pointLight1.position.y = 20 + Math.cos(t * 0.2) * 10;
        sceneData.pointLight2.position.x = -30 + Math.cos(t * 0.25) * 15;

        // ---- 星星闪烁 ----
        if (sceneData.starField) {
            var sf = sceneData.starField;
            var nearMat = sf.nearStars.material;
            // 整体微弱闪烁
            nearMat.opacity = 0.8 + 0.2 * Math.sin(t * 2.0);

            // 星空整体缓慢旋转
            for (var li = 0; li < sf.layers.length; li++) {
                sf.layers[li].rotation.y = t * 0.01;
                sf.layers[li].rotation.x = t * 0.003;
            }
        }

        // ---- 星云缓慢飘动 ----
        if (sceneData.nebulae) {
            for (var ni = 0; ni < sceneData.nebulae.length; ni++) {
                var neb = sceneData.nebulae[ni];
                neb.points.rotation.y = t * 0.005 * (ni % 2 === 0 ? 1 : -1);
                neb.points.rotation.x = Math.sin(t * 0.02 + ni) * 0.02;
                // 呼吸效果
                neb.points.material.opacity = neb.config.opacity * (0.7 + 0.3 * Math.sin(t * 0.3 + ni * 1.5));
            }
        }

        // ---- 星云云团漂浮 + 呼吸 ----
        if (sceneData.nebulaClouds) {
            for (var nci = 0; nci < sceneData.nebulaClouds.length; nci++) {
                var cloudGroup = sceneData.nebulaClouds[nci];
                for (var nsi = 0; nsi < cloudGroup.length; nsi++) {
                    var cl = cloudGroup[nsi];
                    // 缓慢漂移
                    cl.sprite.position.x += cl.driftX;
                    cl.sprite.position.y += cl.driftY;
                    // 呼吸明暗
                    cl.sprite.material.opacity = cl.baseOpacity * (0.6 + 0.4 * Math.sin(t * cl.breathSpeed + cl.breathPhase));
                }
            }
        }

        // ---- 宇宙尘埃漂浮 ----
        if (sceneData.cosmicDust) {
            var dust = sceneData.cosmicDust;
            var dArr = dust.points.geometry.attributes.position.array;
            for (var di = 0; di < dust.count; di++) {
                dArr[di * 3]     += dust.velocities[di * 3];
                dArr[di * 3 + 1] += dust.velocities[di * 3 + 1];
                dArr[di * 3 + 2] += dust.velocities[di * 3 + 2];

                // 超出范围则重置
                if (Math.abs(dArr[di * 3]) > 150) dArr[di * 3] *= -0.9;
                if (Math.abs(dArr[di * 3 + 1]) > 100) dArr[di * 3 + 1] *= -0.9;
                if (Math.abs(dArr[di * 3 + 2]) > 150) dArr[di * 3 + 2] *= -0.9;
            }
            dust.points.geometry.attributes.position.needsUpdate = true;
            dust.points.rotation.y = t * 0.008;
        }

        // ---- 流星动画 ----
        if (sceneData.shootingStars) {
            var meteors = sceneData.shootingStars.meteors;
            for (var mi = 0; mi < meteors.length; mi++) {
                var m = meteors[mi];

                if (!m.active) {
                    // 随机触发新流星
                    if (Math.random() < 0.003) {
                        m.active = true;
                        m.life = 0;
                        m.maxLife = 40 + Math.random() * 60;
                        m.history = [];

                        // 从视野范围内随机位置出发
                        m.x = (Math.random() - 0.5) * 200 + camera.position.x;
                        m.y = 50 + Math.random() * 80;
                        m.z = camera.position.z - 50 - Math.random() * 200;

                        var speed = 1.5 + Math.random() * 2;
                        var angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
                        m.vx = Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1);
                        m.vy = -Math.sin(Math.abs(angle)) * speed;
                        m.vz = (Math.random() - 0.5) * speed * 0.3;
                    }
                    continue;
                }

                m.x += m.vx;
                m.y += m.vy;
                m.z += m.vz;
                m.life++;

                m.history.unshift(m.x, m.y, m.z);
                if (m.history.length > m.trailLen * 3) {
                    m.history.length = m.trailLen * 3;
                }

                var drawCount = m.history.length / 3;
                for (var ti = 0; ti < m.history.length; ti++) {
                    m.positions[ti] = m.history[ti];
                }
                m.line.geometry.attributes.position.needsUpdate = true;
                m.line.geometry.setDrawRange(0, drawCount);

                // 渐隐
                m.line.material.opacity = Math.max(0, 0.8 * (1 - m.life / m.maxLife));

                if (m.life >= m.maxLife) {
                    m.active = false;
                    m.line.geometry.setDrawRange(0, 0);
                }
            }
        }

        // ---- 恒星：随滚动靠近变大 ----
        if (sceneData.star) {
            var s = sceneData.star;
            var progress = scrollProgress; // 0 → 1

            // 位置插值：从远处逐渐靠近
            var z = s.startZ + (s.endZ - s.startZ) * progress;
            s.group.position.z = z;
            s.group.position.y = 25 - progress * 10; // 略微下移

            // 缩放：逐渐变大
            var scale = s.startScale + (s.endScale - s.startScale) * progress;
            s.group.scale.set(scale, scale, scale);

            // 光照强度随距离增大
            s.light.intensity = 2 + progress * 6;

            // 光晕呼吸
            s.innerGlowMat.opacity = 0.25 + 0.15 * Math.sin(t * 1.5);
            s.outerGlowMat.opacity = 0.08 + 0.06 * Math.sin(t * 0.8 + 1.0);

            // 恒星自转
            s.mesh.rotation.y = t * 0.05;

            // 日冕粒子缓慢旋转 + 径向脉动
            s.corona.points.rotation.y = t * 0.1;
            s.corona.points.rotation.x = t * 0.03;
            var cArr = s.corona.points.geometry.attributes.position.array;
            for (var ci = 0; ci < s.corona.count; ci++) {
                var cx = cArr[ci * 3];
                var cy = cArr[ci * 3 + 1];
                var cz = cArr[ci * 3 + 2];
                var cDist = Math.sqrt(cx * cx + cy * cy + cz * cz);
                if (cDist > 0.01) {
                    var pulse = 1 + 0.02 * Math.sin(t * s.corona.speeds[ci] + ci);
                    var normFactor = pulse / 1; // 不改变基础距离，只脉动
                    cArr[ci * 3]     = cx * normFactor;
                    cArr[ci * 3 + 1] = cy * normFactor;
                    cArr[ci * 3 + 2] = cz * normFactor;
                }
            }
            s.corona.points.geometry.attributes.position.needsUpdate = true;
        }

        // ---- 太阳轨道飞船 ----
        if (sceneData.spacecrafts && sceneData.spacecrafts.solarShip && sceneData.star) {
            var ss = sceneData.spacecrafts.solarShip;
            var starGroup = sceneData.star.group;

            // 恒星当前世界坐标
            var starX = starGroup.position.x;
            var starY = starGroup.position.y;
            var starZ = starGroup.position.z;
            var starScale = starGroup.scale.x;

            // 轨道半径随恒星缩放
            var r = ss.orbitRadius * starScale;
            var angle = t * ss.orbitSpeed;

            // 倾斜椭圆轨道
            var ox = r * Math.cos(angle);
            var oy = r * 0.4 * Math.sin(angle) * Math.cos(ss.orbitTilt);
            var oz = r * Math.sin(angle);

            var newX = starX + ox;
            var newY = starY + oy;
            var newZ = starZ + oz;

            ss.group.position.set(newX, newY, newZ);

            // 朝向运动方向
            var sdx = newX - ss.prevPos.x;
            var sdy = newY - ss.prevPos.y;
            var sdz = newZ - ss.prevPos.z;
            var sLen = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);
            if (sLen > 0.001) {
                ss.group.rotation.y = Math.atan2(sdx, sdz);
                ss.group.rotation.x = -Math.asin(sdy / sLen) * 0.5;
                ss.group.rotation.z = -sdx * 0.06;
            }
            ss.prevPos.x = newX;
            ss.prevPos.y = newY;
            ss.prevPos.z = newZ;

            // 尾焰粒子拖尾
            var sTrail = ss.trail;
            sTrail.history.unshift(newX, newY, newZ);
            if (sTrail.history.length > sTrail.maxLength * 3) {
                sTrail.history.length = sTrail.maxLength * 3;
            }
            var sDrawCount = sTrail.history.length / 3;
            for (var sti = 0; sti < sTrail.history.length; sti++) {
                sTrail.positions[sti] = sTrail.history[sti];
            }
            for (var spi = 0; spi < sDrawCount; spi++) {
                var sFade = 1 - spi / sDrawCount;
                sTrail.sizes[spi] = 1.5 * sFade * sFade;
                sTrail.opacities[spi] = sFade * sFade;
            }
            sTrail.points.geometry.attributes.position.needsUpdate = true;
            sTrail.points.geometry.attributes.size.needsUpdate = true;
            sTrail.points.geometry.attributes.alpha.needsUpdate = true;
            sTrail.points.geometry.setDrawRange(0, sDrawCount);
            sTrail.points.material.opacity = 0.5 + 0.2 * Math.sin(t * 4);
        }

        // ---- 螺旋星系旋转 ----
        if (sceneData.galaxySpiral) {
            sceneData.galaxySpiral.points.rotation.y = t * 0.02;
        }

        // ---- 飞行器动画 ----
        if (sceneData.spacecrafts) {
            var shipList = sceneData.spacecrafts.ships;
            for (var si = 0; si < shipList.length; si++) {
                var ship = shipList[si];
                var orb = ship.orbit;

                // 3D 椭圆轨道
                var angle = t * orb.speed + orb.phase;
                var rawX = orb.rx * Math.cos(angle);
                var rawY = orb.ry * Math.sin(angle * 0.7 + orb.phase);
                var rawZ = orb.rz * Math.sin(angle);

                // 轨道倾斜
                var cosT = Math.cos(orb.tiltX);
                var sinT = Math.sin(orb.tiltX);
                var tiltedY = rawY * cosT - rawZ * sinT;
                var tiltedZ = rawY * sinT + rawZ * cosT;

                var newX = orb.cx + rawX;
                var newY = orb.cy + tiltedY;
                var newZ = orb.cz + tiltedZ;

                ship.group.position.set(newX, newY, newZ);

                // 朝向运动方向
                var dx = newX - ship.prevPos.x;
                var dy = newY - ship.prevPos.y;
                var dz = newZ - ship.prevPos.z;
                var moveLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (moveLen > 0.001) {
                    // yaw: 朝 XZ 平面运动方向
                    ship.group.rotation.y = Math.atan2(dx, dz);
                    // pitch: 俯仰
                    ship.group.rotation.x = -Math.asin(dy / moveLen) * 0.5;
                    // bank: 侧倾
                    ship.group.rotation.z = -dx * 0.08;
                }
                ship.prevPos.x = newX;
                ship.prevPos.y = newY;
                ship.prevPos.z = newZ;

                // 引擎脉动
                var pulse = 0.7 + 0.3 * Math.sin(t * 5 + si * 2);
                ship.engineGlow.scale.set(pulse, pulse, pulse);
                ship.engineLight.intensity = 1.0 + pulse * 0.8;

                // 尾焰粒子拖尾更新
                var trail = ship.trail;
                trail.history.unshift(newX, newY, newZ);
                if (trail.history.length > trail.maxLength * 3) {
                    trail.history.length = trail.maxLength * 3;
                }
                var drawCount = trail.history.length / 3;
                for (var ti = 0; ti < trail.history.length; ti++) {
                    trail.positions[ti] = trail.history[ti];
                }
                // 粒子大小和透明度：头部大亮 → 尾部小淡
                for (var pi = 0; pi < drawCount; pi++) {
                    var fade = 1 - pi / drawCount;
                    trail.sizes[pi] = 1.2 * fade * fade;
                    trail.opacities[pi] = fade * fade;
                }
                trail.points.geometry.attributes.position.needsUpdate = true;
                trail.points.geometry.attributes.size.needsUpdate = true;
                trail.points.geometry.attributes.alpha.needsUpdate = true;
                trail.points.geometry.setDrawRange(0, drawCount);
                trail.points.material.opacity = 0.5 + 0.3 * pulse;
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
