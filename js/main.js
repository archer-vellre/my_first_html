/* 主入口 */
document.addEventListener('DOMContentLoaded', function () {
    // 初始化 3D 场景
    var canvas = document.getElementById('bg-canvas');
    var sceneData = CyberScene.initScene(canvas);

    // 打字机效果
    var typewriterEl = document.querySelector('.typewriter');
    CyberEffects.initTypewriter(typewriterEl, [
        'Full-Stack Developer',
        'Creative Coder',
        'Open Source Enthusiast',
        'UI/UX Explorer',
    ]);

    // 初始化各种动画
    CyberEffects.initSkillAnimations();
    CyberEffects.initScrollAnimations();
    CyberEffects.initCountUp();
    CyberEffects.initNavToggle();
    CyberEffects.initSmoothScroll();

    // 滚动进度
    var scrollProgress = 0;
    window.addEventListener('scroll', function () {
        var maxScroll = document.body.scrollHeight - window.innerHeight;
        scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    }, { passive: true });

    // 动画循环
    var animationId;
    function loop(time) {
        CyberScene.animate(sceneData, scrollProgress, time);
        animationId = requestAnimationFrame(loop);
    }
    animationId = requestAnimationFrame(loop);

    // 页面不可见时暂停
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            sceneData.isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        } else {
            sceneData.isRunning = true;
            if (!animationId) {
                animationId = requestAnimationFrame(loop);
            }
        }
    });

    console.log(
        '%c🌆 Cyberpunk Portfolio Loaded',
        'color: #00fff5; font-size: 14px; text-shadow: 0 0 10px #00fff5;'
    );
});
