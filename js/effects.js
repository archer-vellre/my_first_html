/* 特效模块 */
var CyberEffects = (function () {

    /** 打字机效果 */
    function initTypewriter(element, texts, speed) {
        speed = speed || 80;
        if (!element || !texts.length) return;

        var textIndex = 0;
        var charIndex = 0;
        var isDeleting = false;
        var pauseTime = 0;

        function type() {
            var currentText = texts[textIndex];

            if (pauseTime > 0) {
                pauseTime--;
                requestAnimationFrame(type);
                return;
            }

            if (isDeleting) {
                charIndex--;
                element.textContent = currentText.substring(0, charIndex);
                if (charIndex === 0) {
                    isDeleting = false;
                    textIndex = (textIndex + 1) % texts.length;
                    pauseTime = 15;
                }
            } else {
                charIndex++;
                element.textContent = currentText.substring(0, charIndex);
                if (charIndex === currentText.length) {
                    isDeleting = true;
                    pauseTime = 60;
                }
            }

            var delay = isDeleting ? 30 : speed;
            setTimeout(function () { requestAnimationFrame(type); }, delay);
        }

        setTimeout(type, 1000);
    }

    /** 技能进度条动画 */
    function initSkillAnimations() {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var item = entry.target;
                        var level = item.dataset.level;
                        var fill = item.querySelector('.skill-fill');
                        if (fill && level) {
                            setTimeout(function () {
                                fill.style.width = level + '%';
                            }, 200);
                        }
                        observer.unobserve(item);
                    }
                });
            },
            { threshold: 0.3 }
        );

        document.querySelectorAll('.skill-item').forEach(function (item) {
            observer.observe(item);
        });
    }

    /** 通用滚动入场动画 */
    function initScrollAnimations() {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
            observer.observe(el);
        });
    }

    /** 数字增长动画 */
    function initCountUp() {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var el = entry.target;
                        var target = parseInt(el.dataset.count, 10);
                        if (isNaN(target)) return;

                        var current = 0;
                        var duration = 2000;
                        var step = target / (duration / 16);

                        function update() {
                            current += step;
                            if (current >= target) {
                                el.textContent = target;
                                return;
                            }
                            el.textContent = Math.floor(current);
                            requestAnimationFrame(update);
                        }
                        update();
                        observer.unobserve(el);
                    }
                });
            },
            { threshold: 0.5 }
        );

        document.querySelectorAll('.stat-number[data-count]').forEach(function (el) {
            observer.observe(el);
        });
    }

    /** 导航栏移动端菜单 */
    function initNavToggle() {
        var toggle = document.querySelector('.nav-toggle');
        var links = document.querySelector('.nav-links');
        if (!toggle || !links) return;

        toggle.addEventListener('click', function () {
            links.classList.toggle('active');
            toggle.classList.toggle('active');
        });

        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                links.classList.remove('active');
                toggle.classList.remove('active');
            });
        });
    }

    /** 平滑滚动 */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                var target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    return {
        initTypewriter: initTypewriter,
        initSkillAnimations: initSkillAnimations,
        initScrollAnimations: initScrollAnimations,
        initCountUp: initCountUp,
        initNavToggle: initNavToggle,
        initSmoothScroll: initSmoothScroll,
    };
})();
