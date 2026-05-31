(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var asteroidApi = null;
    var spaceEffectsEnabled = true;
    var mobileSpaceEffects = window.matchMedia ? window.matchMedia('(max-width: 640px)').matches : window.innerWidth <= 640;

    try {
        var storedSpaceEffects = window.localStorage ? window.localStorage.getItem('spaceEffectsEnabled') : null;
        if (storedSpaceEffects === '0') {
            spaceEffectsEnabled = false;
        }
    } catch (err) {
        // ignore storage issues
    }

    function setSpaceEffectsEnabled(enabled) {
        spaceEffectsEnabled = Boolean(enabled);
        if (document.body) {
            document.body.classList.toggle('space-effects-off', !spaceEffectsEnabled);
        }

        try {
            if (window.localStorage) {
                window.localStorage.setItem('spaceEffectsEnabled', spaceEffectsEnabled ? '1' : '0');
            }
        } catch (err) {
            // ignore storage issues
        }
    }

    if (mobileSpaceEffects) {
        setSpaceEffectsEnabled(true);
    } else {
        setSpaceEffectsEnabled(false);
    }

    function forEachNode(nodes, callback) {
        Array.prototype.forEach.call(nodes, callback);
    }

    function revealAllSections() {
        var sections = document.querySelectorAll('.reveal-section');
        if (!sections.length) {
            return;
        }

        forEachNode(sections, function (section) {
            section.classList.add('revealed');
        });

        document.body.classList.remove('reveal-ready');
    }

    function makeRevealPanelsVisible() {
        var panels = document.querySelectorAll('.reveal-panel');
        if (!panels.length) {
            return;
        }

        forEachNode(panels, function (panel) {
            panel.classList.add('is-visible');
        });

        document.body.classList.remove('motion-ready');
    }

    function openModal() {
        var overlay = document.getElementById('modal-overlay');
        var modal = document.getElementById('modal');

        if (overlay) {
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
        }

        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
        }

        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        var overlay = document.getElementById('modal-overlay');
        var modal = document.getElementById('modal');

        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }

        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
        }

        document.body.style.overflow = '';
    }

    function setupModal() {
        window.openModal = openModal;
        window.closeModal = closeModal;

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        var modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }
    }

    function setupMobileNav() {
        var header = document.querySelector('.header');
        if (!header) {
            return;
        }

        var toggle = header.querySelector('.header-menu-toggle');
        var nav = header.querySelector('.header-nav');
        if (!toggle || !nav) {
            return;
        }

        var openLabel = toggle.getAttribute('data-label-open') || toggle.getAttribute('aria-label') || 'Open menu';
        var closeLabel = toggle.getAttribute('data-label-close') || 'Close menu';
        var media = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

        function isMobile() {
            return media ? media.matches : window.innerWidth <= 900;
        }

        function setToggleLabel(isOpen) {
            toggle.setAttribute('aria-label', isOpen ? closeLabel : openLabel);
        }

        function setOpen(isOpen) {
            if (!isMobile()) {
                isOpen = false;
            }

            header.classList.toggle('header--nav-open', isOpen);
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            setToggleLabel(isOpen);
        }

        setToggleLabel(false);

        toggle.addEventListener('click', function () {
            setOpen(!header.classList.contains('header--nav-open'));
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        });

        document.addEventListener('click', function (event) {
            if (!isMobile() || !header.classList.contains('header--nav-open')) {
                return;
            }

            if (event.target.closest('.header-menu-toggle')) {
                return;
            }

            if (event.target.closest('.header-nav-link')) {
                setOpen(false);
                return;
            }

            if (!event.target.closest('.header')) {
                setOpen(false);
            }
        }, true);

        if (media && typeof media.addEventListener === 'function') {
            media.addEventListener('change', function () {
                if (!isMobile()) {
                    setOpen(false);
                }
            });
        } else if (media && typeof media.addListener === 'function') {
            media.addListener(function () {
                if (!isMobile()) {
                    setOpen(false);
                }
            });
        } else {
            window.addEventListener('resize', function () {
                if (!isMobile()) {
                    setOpen(false);
                }
            });
        }
    }

    function ensureLaserLayer() {
        var laserLayer = document.querySelector('.rocket-laser-layer');
        if (!laserLayer) {
            laserLayer = document.createElement('div');
            laserLayer.className = 'rocket-laser-layer';
            document.body.appendChild(laserLayer);
        }
        return laserLayer;
    }

    function setupAsteroids() {
        if (!document.body) {
            return;
        }

        function getDocumentSize() {
            var doc = document.documentElement;
            var body = document.body;

            var width = doc ? doc.clientWidth : window.innerWidth;

            var height = Math.max(
                doc ? doc.scrollHeight : 0,
                body ? body.scrollHeight : 0,
                window.innerHeight
            );

            return { width: width, height: height };
        }

        function getScroll() {
            return {
                x: window.scrollX || window.pageXOffset || 0,
                y: window.scrollY || window.pageYOffset || 0
            };
        }

        function toDocRect(rect, padding) {
            var scroll = getScroll();
            var pad = padding || 0;
            return {
                left: rect.left + scroll.x - pad,
                top: rect.top + scroll.y - pad,
                right: rect.right + scroll.x + pad,
                bottom: rect.bottom + scroll.y + pad
            };
        }

        function pointInRect(x, y, rect) {
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }

        function getExcludedRects(docWidth) {
            var rects = [];

            var header = document.querySelector('.header');
            if (header && header.getBoundingClientRect) {
                var headerRect = header.getBoundingClientRect();
                rects.push({ left: 0, top: 0, right: docWidth, bottom: headerRect.height + 26 });
            } else {
                rects.push({ left: 0, top: 0, right: docWidth, bottom: 120 });
            }

            var controls = document.querySelector('.asteroids-controls');
            if (controls && controls.getBoundingClientRect) {
                rects.push(toDocRect(controls.getBoundingClientRect(), 18));
            }

            return rects;
        }

        function shuffle(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = array[i];
                array[i] = array[j];
                array[j] = tmp;
            }
            return array;
        }

        var container = document.querySelector('.asteroid-field');
        if (!container) {
            container = document.createElement('div');
            container.className = 'asteroid-field';
            container.setAttribute('aria-hidden', 'true');
            document.body.appendChild(container);
        }

        var asteroids = [];
        var asteroidPoints = [];
        var padding = 24;
        var mobileLayout = window.matchMedia ? window.matchMedia('(max-width: 900px)').matches : window.innerWidth <= 900;
        var docSize = getDocumentSize();
        container.style.height = docSize.height + 'px';

        var minCount = mobileLayout ? 8 : 6;
        var maxCount = mobileLayout
            ? 14
            : (function () {
                var rows = Math.max(3, Math.floor(docSize.height / 260));
                var cols = Math.max(3, Math.floor(docSize.width / 220));
                return Math.max(12, Math.min(50, rows * cols));
            })();

        function clamp(min, value, max) {
            return Math.min(max, Math.max(min, value));
        }

        function randomBetween(min, max) {
            return min + Math.random() * (max - min);
        }

        function randomInt(min, max) {
            return Math.floor(min + Math.random() * (max - min + 1));
        }

        function randomBorderRadiusBlob() {
            function p(min, max) {
                return Math.round(randomBetween(min, max)) + '%';
            }
            return p(40, 62) + ' ' + p(38, 62) + ' ' + p(40, 62) + ' ' + p(38, 62) + ' / '
                + p(40, 62) + ' ' + p(38, 62) + ' ' + p(40, 62) + ' ' + p(38, 62);
        }

        function craterStyleVars(el) {
            var base = Math.round(randomBetween(145, 178));
            var base2 = Math.round(base - randomBetween(12, 28));
            var shade = Math.round(base2 - randomBetween(18, 34));

            el.style.setProperty('--ast-base', 'rgb(' + base + ',' + base + ',' + base + ')');
            el.style.setProperty('--ast-mid', 'rgb(' + base2 + ',' + base2 + ',' + base2 + ')');
            el.style.setProperty('--ast-shade', 'rgb(' + shade + ',' + shade + ',' + shade + ')');
            el.style.setProperty('--ast-edge', 'rgba(20, 24, 34, 0.55)');

            el.style.setProperty('--cr1x', Math.round(randomBetween(22, 78)) + '%');
            el.style.setProperty('--cr1y', Math.round(randomBetween(18, 74)) + '%');
            el.style.setProperty('--cr1s', Math.round(randomBetween(12, 22)) + '%');

            el.style.setProperty('--cr2x', Math.round(randomBetween(22, 78)) + '%');
            el.style.setProperty('--cr2y', Math.round(randomBetween(18, 78)) + '%');
            el.style.setProperty('--cr2s', Math.round(randomBetween(8, 18)) + '%');

            el.style.setProperty('--cr3x', Math.round(randomBetween(20, 82)) + '%');
            el.style.setProperty('--cr3y', Math.round(randomBetween(20, 82)) + '%');
            el.style.setProperty('--cr3s', Math.round(randomBetween(6, 16)) + '%');

            if (Math.random() > 0.55) {
                el.style.setProperty('--cr4x', Math.round(randomBetween(18, 84)) + '%');
                el.style.setProperty('--cr4y', Math.round(randomBetween(18, 84)) + '%');
                el.style.setProperty('--cr4s', Math.round(randomBetween(5, 12)) + '%');
            } else {
                el.style.setProperty('--cr4s', '0%');
            }
        }

        function spawnOne(bandTop, bandBottom) {
            var el = document.createElement('div');
            el.className = 'asteroid';

            var size = randomBetween(22, 62);
            var rot = (Math.random() * 360).toFixed(1) + 'deg';

            var radius = size * 0.5;
            var minGap = 16;
            var maxTries = 42;
            var excluded = getExcludedRects(docSize.width);

            var chosenX = null;
            var chosenY = null;

            var xMin = padding;
            var xMax = Math.max(padding, docSize.width - padding - size);
            var yMin = typeof bandTop === 'number' ? clamp(padding, bandTop, Math.max(padding, docSize.height - padding - size)) : padding;
            var yMax = typeof bandBottom === 'number'
                ? clamp(yMin, bandBottom - size, Math.max(yMin, docSize.height - padding - size))
                : Math.max(padding, docSize.height - padding - size);

            for (var attempt = 0; attempt < maxTries; attempt++) {
                var x = xMin + Math.random() * Math.max(0, xMax - xMin);
                var y = yMin + Math.random() * Math.max(0, yMax - yMin);

                var cx = x + radius;
                var cy = y + radius;

                var insideExcluded = excluded.some(function (rect) {
                    return pointInRect(cx, cy, rect);
                });
                if (insideExcluded) {
                    continue;
                }

                var ok = true;
                for (var i = 0; i < asteroidPoints.length; i++) {
                    var p = asteroidPoints[i];
                    var dx = cx - p.cx;
                    var dy = cy - p.cy;
                    var dist2 = dx * dx + dy * dy;
                    var minDist = radius + p.r + minGap;
                    if (dist2 < minDist * minDist) {
                        ok = false;
                        break;
                    }
                }

                if (!ok) {
                    continue;
                }

                chosenX = x;
                chosenY = y;
                break;
            }

            if (chosenX === null) {
                chosenX = xMin + Math.random() * Math.max(0, xMax - xMin);
                chosenY = yMin + Math.random() * Math.max(0, yMax - yMin);
            }

            el.style.left = chosenX.toFixed(1) + 'px';
            el.style.top = chosenY.toFixed(1) + 'px';
            el.style.setProperty('--ast-size', size.toFixed(1) + 'px');
            el.style.setProperty('--ast-rot', rot);
            el.style.setProperty('--ast-br', randomBorderRadiusBlob());
            craterStyleVars(el);

            container.appendChild(el);
            asteroids.push(el);
            asteroidPoints.push({ el: el, cx: chosenX + radius, cy: chosenY + radius, r: radius });
        }

        function clearAll() {
            asteroids.length = 0;
            asteroidPoints.length = 0;
            container.innerHTML = '';
        }

        function createNew(countHint) {
            docSize = getDocumentSize();
            container.style.height = docSize.height + 'px';
            clearAll();

            var defaultCount = mobileLayout ? randomInt(minCount, maxCount) : maxCount;
            var count = clamp(minCount, typeof countHint === 'number' ? countHint : defaultCount, maxCount);
            var indices = [];
            for (var i = 0; i < count; i++) {
                indices.push(i);
            }
            shuffle(indices);

            // Stratified-ish: place across the full height to avoid clumps.
            indices.forEach(function (idx) {
                var bandStart = (idx / count) * docSize.height;
                var bandEnd = ((idx + 1) / count) * docSize.height;
                spawnOne(bandStart, bandEnd);
            });
            updateControls();
        }

        function explode(el) {
            var rect = el.getBoundingClientRect();
            var boom = document.createElement('div');
            boom.className = 'asteroid-explosion';
            boom.style.left = (rect.left + (window.scrollX || window.pageXOffset || 0) + rect.width / 2) + 'px';
            boom.style.top = (rect.top + (window.scrollY || window.pageYOffset || 0) + rect.height / 2) + 'px';
            container.appendChild(boom);

            boom.addEventListener('animationend', function () {
                if (boom.parentNode) {
                    boom.parentNode.removeChild(boom);
                }
            });

            var index = asteroids.indexOf(el);
            if (index !== -1) {
                asteroids.splice(index, 1);
            }

            for (var i = asteroidPoints.length - 1; i >= 0; i--) {
                if (asteroidPoints[i].el === el) {
                    asteroidPoints.splice(i, 1);
                    break;
                }
            }

            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }

            updateControls();
        }

        function rayCircleHit(startX, startY, dirX, dirY, maxDist, cx, cy, radius) {
            var fx = startX - cx;
            var fy = startY - cy;

            var b = 2 * (fx * dirX + fy * dirY);
            var c = fx * fx + fy * fy - radius * radius;
            var discriminant = b * b - 4 * c;

            if (discriminant < 0) {
                return null;
            }

            discriminant = Math.sqrt(discriminant);
            var t1 = (-b - discriminant) / 2;
            var t2 = (-b + discriminant) / 2;

            var t = null;
            if (t1 >= 0 && t1 <= maxDist) {
                t = t1;
            } else if (t2 >= 0 && t2 <= maxDist) {
                t = t2;
            }

            return t;
        }

        function rayHit(startX, startY, dirX, dirY, maxDist) {
            var closest = null;
            var closestEl = null;

            for (var i = 0; i < asteroids.length; i++) {
                var el = asteroids[i];
                if (!el || !el.getBoundingClientRect) {
                    continue;
                }

                var rect = el.getBoundingClientRect();
                var cx = rect.left + rect.width / 2;
                var cy = rect.top + rect.height / 2;
                var radius = rect.width * 0.48;

                var t = rayCircleHit(startX, startY, dirX, dirY, maxDist, cx, cy, radius);
                if (t === null) {
                    continue;
                }

                if (closest === null || t < closest) {
                    closest = t;
                    closestEl = el;
                }
            }

            if (closest === null) {
                return null;
            }

            return { distance: closest, el: closestEl };
        }

        function pointHit(x, y) {
            for (var i = 0; i < asteroids.length; i++) {
                var el = asteroids[i];
                if (!el || !el.getBoundingClientRect) {
                    continue;
                }

                var rect = el.getBoundingClientRect();
                var cx = rect.left + rect.width / 2;
                var cy = rect.top + rect.height / 2;
                var r = rect.width * 0.5;

                var dx = x - cx;
                var dy = y - cy;
                if (dx * dx + dy * dy <= r * r) {
                    return el;
                }
            }
            return null;
        }

        var controls = document.querySelector('.asteroids-controls');
        var controlsBtn = null;
        var controlsToggle = null;
        var controlsCount = null;
        var controlsHint = null;

        function getLabels() {
            var lang = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang.toLowerCase() : 'ru';
            if (lang.indexOf('kk') === 0) {
                return {
                    spawn: 'Астероидтар жасау',
                    more: 'Жаңаларын жасау',
                    hide: 'Жасыру',
                    show: 'Көрсету',
                    cleared: 'Бәрі жойылды',
                    remaining: 'Қалды'
                };
            }
            if (lang.indexOf('en') === 0) {
                return {
                    spawn: 'Spawn asteroids',
                    more: 'Spawn new ones',
                    hide: 'Hide',
                    show: 'Show',
                    cleared: 'All destroyed',
                    remaining: 'Remaining'
                };
            }
            return {
                spawn: 'Создать астероиды',
                more: 'Создать новые',
                hide: 'Скрыть',
                show: 'Показать',
                cleared: 'Все уничтожены',
                remaining: 'Осталось'
            };
        }

        function updateControls() {
            if (!controlsBtn || !controlsCount || !controlsHint || !controlsToggle) {
                return;
            }

            var labels = getLabels();
            var remaining = asteroids.length;
            controlsCount.textContent = String(remaining);
            controlsHint.textContent = remaining ? (labels.remaining + ':') : labels.cleared;
            controlsBtn.textContent = remaining ? labels.more : labels.spawn;
            controlsToggle.textContent = spaceEffectsEnabled ? labels.hide : labels.show;
        }

        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'asteroids-controls';
            controls.setAttribute('aria-live', 'polite');

            var labelsNow = getLabels();
            controls.innerHTML = ''
                + '<div class="asteroids-controls-chip">'
                + '  <span class="asteroids-controls-hint">' + labelsNow.remaining + ':</span>'
                + '  <span class="asteroids-controls-count">0</span>'
                + '</div>'
                + '<button class="asteroids-controls-btn" type="button">' + labelsNow.spawn + '</button>'
                + '<button class="asteroids-controls-btn asteroids-controls-btn--ghost" type="button">' + labelsNow.hide + '</button>';

            document.body.appendChild(controls);
        }

        controlsBtn = controls.querySelector('.asteroids-controls-btn');
        controlsToggle = controls.querySelector('.asteroids-controls-btn--ghost');
        controlsCount = controls.querySelector('.asteroids-controls-count');
        controlsHint = controls.querySelector('.asteroids-controls-hint');

        if (controlsBtn && !controlsBtn.__boundAsteroids) {
            controlsBtn.__boundAsteroids = true;
            controlsBtn.addEventListener('click', function () {
                createNew();
            });
        }

        if (controlsToggle && !controlsToggle.__boundSpaceToggle) {
            controlsToggle.__boundSpaceToggle = true;
            controlsToggle.addEventListener('click', function () {
                setSpaceEffectsEnabled(!spaceEffectsEnabled);
                updateControls();
            });
        }

        if (!document.__boundAsteroidTap) {
            document.__boundAsteroidTap = true;
            document.addEventListener('pointerup', function (event) {
                if (!event || !event.pointerType || event.pointerType === 'mouse') {
                    return;
                }

                if (event.button && event.button !== 0) {
                    return;
                }

                if (event.target && event.target.closest && event.target.closest('a, button, input, textarea, select, label, summary')) {
                    return;
                }

                if (!asteroidApi) {
                    return;
                }

                if (!spaceEffectsEnabled) {
                    return;
                }

                var target = pointHit(event.clientX, event.clientY);
                if (target) {
                    explode(target);
                }
            }, { passive: true });
        }

        asteroidApi = {
            rayHit: rayHit,
            explode: explode,
            createNew: createNew,
            clearAll: clearAll
        };

        updateControls();

        if (!container.__asteroidsInitialized) {
            container.__asteroidsInitialized = true;
            createNew();
        }
    }

    function setupCursorRocket() {
        if (reducedMotion) {
            return;
        }

        if (!document.body) {
            return;
        }

        var rocket = document.querySelector('.cursor-rocket');
        if (!rocket) {
            rocket = document.createElement('div');
            rocket.className = 'cursor-rocket';
            rocket.setAttribute('aria-hidden', 'true');
            rocket.innerHTML = ''
                + '<svg class="cursor-rocket-svg" viewBox="0 0 64 64" role="presentation" focusable="false">'
                + '  <defs>'
                + '    <linearGradient id="cr-hull" x1="16" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">'
                + '      <stop stop-color="#f9fbff"/>'
                + '      <stop offset="0.55" stop-color="#d9e7ff"/>'
                + '      <stop offset="1" stop-color="#b9cfff"/>'
                + '    </linearGradient>'
                + '    <linearGradient id="cr-edge" x1="18" y1="18" x2="50" y2="44" gradientUnits="userSpaceOnUse">'
                + '      <stop stop-color="#26324a"/>'
                + '      <stop offset="1" stop-color="#0f1524"/>'
                + '    </linearGradient>'
                + '    <linearGradient id="cr-glow" x1="24" y1="22" x2="50" y2="42" gradientUnits="userSpaceOnUse">'
                + '      <stop stop-color="#64b5ff"/>'
                + '      <stop offset="1" stop-color="#1a5cff"/>'
                + '    </linearGradient>'
                + '    <radialGradient id="cr-flame" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 32) rotate(180) scale(18 12)">'
                + '      <stop stop-color="#ffffff"/>'
                + '      <stop offset="0.32" stop-color="#bfeaff"/>'
                + '      <stop offset="0.72" stop-color="#64b5ff"/>'
                + '      <stop offset="1" stop-color="#1a5cff" stop-opacity="0"/>'
                + '    </radialGradient>'
                + '    <radialGradient id="cr-flame-inner" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 32) rotate(180) scale(12 9)">'
                + '      <stop stop-color="#ffffff"/>'
                + '      <stop offset="0.55" stop-color="#e8f7ff"/>'
                + '      <stop offset="1" stop-color="#64b5ff" stop-opacity="0"/>'
                + '    </radialGradient>'
                + '    <filter id="cr-shadow" x="-30%" y="-30%" width="160%" height="160%">'
                + '      <feDropShadow dx="0" dy="10" stdDeviation="6" flood-color="#0f2f5a" flood-opacity="0.25"/>'
                + '    </filter>'
                + '  </defs>'
                + '  <g filter="url(#cr-shadow)">'
                + '    <path d="M36 12c8 4 13 11 13 20s-5 16-13 20c-7-7-12-12-12-20S29 19 36 12Z" fill="url(#cr-hull)" stroke="rgba(8,19,34,0.28)" stroke-width="1.2" stroke-linejoin="round"/>'
                + '    <path d="M24 24l-13 8 13 8c2-3 3-6 3-8s-1-5-3-8Z" fill="url(#cr-edge)" opacity="0.96"/>'
                + '    <path d="M24 24l-13 8 13 8" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" stroke-linejoin="round"/>'
                + '    <path d="M34 16c6 4 9 9 9 16s-3 12-9 16c-4-5-6-8-6-16s2-11 6-16Z" fill="rgba(20,34,58,0.88)"/>'
                + '    <path d="M34 19c4 3 6 6 6 13s-2 10-6 13c-3-4-4-6-4-13s1-9 4-13Z" fill="rgba(255,255,255,0.08)"/>'
                + '    <path d="M45 21l6-6c2 3 4 8 4 17s-2 14-4 17l-6-6c2-4 3-7 3-11s-1-7-3-11Z" fill="rgba(255,255,255,0.12)"/>'
                + '    <path d="M45 21l6-6" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" stroke-linecap="round"/>'
                + '    <path d="M45 43l6 6" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" stroke-linecap="round"/>'
                + '    <path d="M32 28l-7-10c-3 4-5 8-5 14s2 10 5 14l7-10c-2-2-3-3-3-4s1-2 3-4Z" fill="rgba(255,255,255,0.78)" opacity="0.86"/>'
                + '    <path d="M32 28l-7-10" fill="none" stroke="rgba(8,19,34,0.16)" stroke-width="1.2" stroke-linecap="round"/>'
                + '    <path d="M32 36l-7 10" fill="none" stroke="rgba(8,19,34,0.16)" stroke-width="1.2" stroke-linecap="round"/>'
                + '    <circle cx="41" cy="32" r="6.1" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>'
                + '    <circle cx="41" cy="32" r="3.2" fill="url(#cr-glow)" opacity="0.95"/>'
                + '  </g>'
                + '  <path class="cursor-rocket-flame" d="M6 32c4-7 9-10 14-10-2 3-3 6-3 10s1 7 3 10c-5 0-10-3-14-10Z" fill="url(#cr-flame)"/>'
                + '  <path class="cursor-rocket-flame cursor-rocket-flame--inner" d="M8.3 32c3.1-5.3 6.6-7.3 9.8-7.3-1.6 2.4-2.2 4.4-2.2 7.3s0.6 4.9 2.2 7.3c-3.2 0-6.7-2-9.8-7.3Z" fill="url(#cr-flame-inner)"/>'
                + '</svg>';
            document.body.appendChild(rocket);
        }

        document.body.classList.add('cursor-rocket-active');

        var size = 48;
        var targetX = window.innerWidth * 0.5;
        var targetY = window.innerHeight * 0.5;
        var currentX = targetX;
        var currentY = targetY;
        var lastDX = 1;
        var lastDY = 0;
        var hasPointer = false;

        function setVisible(visible) {
            rocket.classList.toggle('cursor-rocket--visible', visible);
        }

        function isTouchPointer(event) {
            return Boolean(event && event.pointerType === 'touch');
        }

        function pointerAllowed(event) {
            if (!event) {
                return true;
            }
            if (!event.pointerType) {
                return true;
            }
            return event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === 'touch';
        }

        document.addEventListener('pointermove', function (event) {
            if (!pointerAllowed(event)) {
                return;
            }

            if (!spaceEffectsEnabled) {
                setVisible(false);
                return;
            }

            hasPointer = true;
            setVisible(true);
            targetX = event.clientX;
            targetY = event.clientY;
        }, { passive: true });

        function frame() {
            if (!spaceEffectsEnabled) {
                setVisible(false);
            }

            var dx = targetX - currentX;
            var dy = targetY - currentY;

            currentX += dx * 0.1;
            currentY += dy * 0.1;

            if (Math.abs(dx) + Math.abs(dy) > 0.4) {
                lastDX = dx;
                lastDY = dy;
            }

            var angle = Math.atan2(lastDY, lastDX) * 180 / Math.PI;
            var x = currentX - size * 0.5;
            var y = currentY - size * 0.5;

            rocket.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + angle + 'deg)';

            window.requestAnimationFrame(frame);
        }

        window.requestAnimationFrame(frame);

        function isInteractiveTarget(target) {
            if (!target || !target.closest) {
                return false;
            }
            return Boolean(target.closest('a, button, input, textarea, select, label, summary'));
        }

        function fireLaser(isCharged) {
            if (!hasPointer) {
                return;
            }

            if (!spaceEffectsEnabled) {
                return;
            }

            var laserLayer = ensureLaserLayer();
            var length = Math.hypot(lastDX, lastDY) || 1;
            var dirX = lastDX / length;
            var dirY = lastDY / length;

            var centerX = currentX;
            var centerY = currentY;
            var noseX = centerX + dirX * (size * 0.6);
            var noseY = centerY + dirY * (size * 0.6);
            var angle = Math.atan2(dirY, dirX) * 180 / Math.PI;

            var travel = isCharged
                ? 520 + Math.random() * 380
                : 320 + Math.random() * 260;

            if (asteroidApi && typeof asteroidApi.rayHit === 'function') {
                var hit = asteroidApi.rayHit(noseX, noseY, dirX, dirY, travel);
                if (hit && hit.el && typeof asteroidApi.explode === 'function') {
                    travel = Math.max(60, hit.distance - 2);
                    asteroidApi.explode(hit.el);
                }
            }

            var laser = document.createElement('span');
            laser.className = isCharged ? 'rocket-laser rocket-laser--charged' : 'rocket-laser';
            laser.style.setProperty('--laser-x', noseX + 'px');
            laser.style.setProperty('--laser-y', noseY + 'px');
            laser.style.setProperty('--laser-angle', angle + 'deg');

            if (isCharged) {
                laser.style.setProperty('--laser-height', '5px');
                laser.style.setProperty('--laser-duration', '820ms');
                laser.style.setProperty('--laser-length', 260 + Math.random() * 200 + 'px');
                laser.style.setProperty('--laser-travel', travel + 'px');
            } else {
                laser.style.setProperty('--laser-height', '3px');
                laser.style.setProperty('--laser-duration', '620ms');
                laser.style.setProperty('--laser-length', 170 + Math.random() * 140 + 'px');
                laser.style.setProperty('--laser-travel', travel + 'px');
            }

            laserLayer.appendChild(laser);

            laser.addEventListener('animationend', function () {
                if (laser.parentNode) {
                    laser.parentNode.removeChild(laser);
                }
            });
        }

        var chargeStart = 0;
        var chargeTimer = 0;
        var isPointerDown = false;
        var chargeThresholdMs = 650;

        function setCharging(isCharging) {
            rocket.classList.toggle('cursor-rocket--charging', isCharging);
        }

        document.addEventListener('pointerdown', function (event) {
            if (!pointerAllowed(event)) {
                return;
            }

            if (event.button !== 0) {
                return;
            }

            if (isInteractiveTarget(event.target)) {
                return;
            }

            if (!spaceEffectsEnabled) {
                return;
            }

            if (isTouchPointer(event)) {
                hasPointer = true;
                setVisible(true);
                targetX = event.clientX;
                targetY = event.clientY;
            }

            isPointerDown = true;
            chargeStart = performance.now();

            if (chargeTimer) {
                window.clearTimeout(chargeTimer);
            }
            setCharging(false);
            chargeTimer = window.setTimeout(function () {
                if (isPointerDown) {
                    setCharging(true);
                }
            }, 140);
        });

        function handlePointerUp() {
            if (!isPointerDown) {
                return;
            }

            isPointerDown = false;
            if (chargeTimer) {
                window.clearTimeout(chargeTimer);
                chargeTimer = 0;
            }

            var heldMs = performance.now() - chargeStart;
            var charged = heldMs >= chargeThresholdMs;
            setCharging(false);

            fireLaser(charged);
        }

        document.addEventListener('pointerup', function (event) {
            if (!pointerAllowed(event)) {
                return;
            }
            if (event.button !== 0) {
                return;
            }
            if (isInteractiveTarget(event.target)) {
                return;
            }
            if (!spaceEffectsEnabled) {
                return;
            }
            handlePointerUp();

            if (isTouchPointer(event)) {
                setVisible(false);
            }
        });

        document.addEventListener('pointercancel', function (event) {
            isPointerDown = false;
            if (chargeTimer) {
                window.clearTimeout(chargeTimer);
                chargeTimer = 0;
            }
            setCharging(false);
            if (isTouchPointer(event)) {
                setVisible(false);
            }
        });
    }

    function setupSmoothAnchors() {
        document.documentElement.style.scrollBehavior = 'smooth';
        if (document.body) {
            document.body.style.scrollBehavior = 'smooth';
        }

        document.addEventListener('click', function (event) {
            if (event.defaultPrevented) {
                return;
            }

            var anchor = event.target.closest('a[href^="#"]');
            if (!anchor) {
                return;
            }

            var href = anchor.getAttribute('href');
            if (!href || href === '#') {
                return;
            }

            var target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            if (history.pushState) {
                history.pushState(null, '', href);
            } else {
                window.location.hash = href;
            }

            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });

            window.setTimeout(function () {
                target.removeAttribute('tabindex');
            }, 800);
        }, true);
    }

    function setupRevealAnimations() {
        if (!('IntersectionObserver' in window)) {
            makeRevealPanelsVisible();
            return;
        }

        document.body.classList.add('motion-ready');

        var revealPanels = Array.prototype.slice.call(document.querySelectorAll('.reveal-panel'));
        var panelDirections = ['reveal-from-left', 'reveal-from-right', 'reveal-from-bottom'];

        revealPanels.forEach(function (panel, index) {
            if (panel.classList.contains('reveal-panel--header')) {
                return;
            }

            panel.classList.add(panelDirections[index % panelDirections.length]);
        });

        var targets = document.querySelectorAll(
            '.reveal-panel, .hero-inner, .section-title, .section-ornament, .about-content--card, .about-formats--card, .hero-point, .achievement-card, .specialist-card, .it-club-content, .cta-block, .footer-block'
        );

        if (!targets.length) {
            return;
        }

        var observer;
        try {
            observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    });
                },
                {
                    threshold: 0.1,
                    rootMargin: '0px 0px -8% 0px'
                }
            );
        } catch (err) {
            makeRevealPanelsVisible();
            return;
        }

        forEachNode(targets, function (element, index) {
            var delay = element.classList.contains('reveal-panel')
                ? Math.min(index * 60, 300)
                : Math.min(index * 40, 240);

            element.style.transitionDelay = delay + 'ms';
            observer.observe(element);
        });
    }

    function setupSectionRevealObserver() {
        var sections = document.querySelectorAll('.reveal-section');
        if (!sections.length) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            revealAllSections();
            return;
        }

        var sectionRevealObserver;
        var sectionDirections = ['reveal-from-left', 'reveal-from-right', 'reveal-from-bottom'];
        forEachNode(sections, function (section, index) {
            section.classList.add(sectionDirections[index % sectionDirections.length]);
        });

        try {
            sectionRevealObserver = new IntersectionObserver(
                function (entries, observer) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    });
                },
                {
                    threshold: 0.2,
                    rootMargin: '0px 0px -10% 0px'
                }
            );
        } catch (err) {
            revealAllSections();
            return;
        }

        document.body.classList.add('reveal-ready');

        forEachNode(sections, function (section) {
            sectionRevealObserver.observe(section);
        });

        window.setTimeout(function () {
            var firstSection = document.querySelector('.reveal-section');
            if (firstSection && !firstSection.classList.contains('revealed')) {
                revealAllSections();
            }
        }, 2500);
    }

    function setupSectionActivity() {
        if (!('IntersectionObserver' in window)) {
            return;
        }

        var sections = document.querySelectorAll('.section');
        if (!sections.length) {
            return;
        }

        var sectionObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('section-in-view');
                    }
                });
            },
            {
                threshold: 0.2
            }
        );

        forEachNode(sections, function (section) {
            sectionObserver.observe(section);
        });
    }

    function setupGalleryAutoScroll() {
        if (reducedMotion) {
            return;
        }

        var scroll = document.querySelector('.gallery-scroll');
        var track = scroll ? scroll.querySelector('.gallery-track') : null;
        if (!scroll || !track) {
            return;
        }

        var speed = 28;
        var isPaused = false;
        var lastTime = 0;
        var resumeTimer = 0;
        var rafId = 0;

        function maxScroll() {
            return Math.max(0, track.scrollWidth / 2);
        }

        function setPaused(paused) {
            isPaused = paused;
        }

        function scheduleResume(delay) {
            if (resumeTimer) {
                window.clearTimeout(resumeTimer);
            }
            resumeTimer = window.setTimeout(function () {
                setPaused(false);
            }, delay || 1200);
        }

        function step(time) {
            if (!lastTime) {
                lastTime = time;
            }

            var delta = (time - lastTime) / 1000;
            lastTime = time;
            delta = Math.min(delta, 0.06);

            if (!isPaused) {
                var max = maxScroll();
                if (max > 0) {
                    scroll.scrollLeft += speed * delta;
                    if (scroll.scrollLeft >= max) {
                        scroll.scrollLeft -= max;
                    }
                }
            }

            rafId = window.requestAnimationFrame(step);
        }

        scroll.addEventListener('mouseenter', function () {
            setPaused(true);
        });

        scroll.addEventListener('mouseleave', function () {
            scheduleResume(400);
        });

        scroll.addEventListener('focusin', function () {
            setPaused(true);
        });

        scroll.addEventListener('focusout', function () {
            scheduleResume(400);
        });

        scroll.addEventListener('pointerdown', function () {
            setPaused(true);
        });

        scroll.addEventListener('pointerup', function () {
            scheduleResume(800);
        });

        scroll.addEventListener('touchstart', function () {
            setPaused(true);
        }, { passive: true });

        scroll.addEventListener('touchend', function () {
            scheduleResume(800);
        }, { passive: true });

        scroll.addEventListener('wheel', function () {
            setPaused(true);
            scheduleResume(1000);
        }, { passive: true });

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                setPaused(true);
                return;
            }
            scheduleResume(400);
        });

        window.addEventListener('resize', function () {
            if (scroll.scrollLeft > maxScroll()) {
                scroll.scrollLeft = 0;
            }
        });

        scroll.scrollLeft = 0;
        rafId = window.requestAnimationFrame(step);
    }

    function cubicBezier(p0, p1, p2, p3, t) {
        var mt = 1 - t;
        return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
    }

    function cubicBezierDerivative(p0, p1, p2, p3, t) {
        var mt = 1 - t;
        return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
    }

    function randomPath(width, height, routeHint) {
        var edge = 130;
        var w = Math.max(width, 320);
        var h = Math.max(height, 420);
        var jitter = function (value, spread) {
            return value + (Math.random() * 2 - 1) * spread;
        };
        var routes = [
            [
                { x: -edge, y: h + 60 },
                { x: w * 0.2, y: h * 0.72 },
                { x: w * 0.62, y: h * 0.22 },
                { x: w + edge, y: -80 }
            ],
            [
                { x: w + edge, y: h + 70 },
                { x: w * 0.8, y: h * 0.7 },
                { x: w * 0.38, y: h * 0.2 },
                { x: -edge, y: -70 }
            ],
            [
                { x: -edge, y: -90 },
                { x: w * 0.25, y: h * 0.18 },
                { x: w * 0.65, y: h * 0.58 },
                { x: w + edge, y: h + 80 }
            ],
            [
                { x: w + edge, y: -90 },
                { x: w * 0.75, y: h * 0.2 },
                { x: w * 0.35, y: h * 0.64 },
                { x: -edge, y: h + 85 }
            ],
            [
                { x: w * 0.12, y: h + 90 },
                { x: w * 0.25, y: h * 0.65 },
                { x: w * 0.75, y: h * 0.22 },
                { x: w + edge, y: h * 0.05 }
            ],
            [
                { x: w * 0.88, y: h + 90 },
                { x: w * 0.76, y: h * 0.64 },
                { x: w * 0.24, y: h * 0.22 },
                { x: -edge, y: h * 0.08 }
            ]
        ];

        var routeIndex = typeof routeHint === 'number'
            ? Math.abs(routeHint) % routes.length
            : Math.floor(Math.random() * routes.length);

        return routes[routeIndex].map(function (point) {
            return {
                x: jitter(point.x, Math.max(14, w * 0.04)),
                y: jitter(point.y, Math.max(10, h * 0.04))
            };
        });
    }

    function ensureRocketElements() {
        var accent = document.querySelector('.hero-accent');
        if (!accent) {
            return { rockets: [], glows: [] };
        }

        var baseRocket = document.getElementById('hero-accent-rocket') || accent.querySelector('.hero-accent-svg');
        if (!baseRocket) {
            return { rockets: [], glows: [] };
        }

        var desiredCount = 5;
        var rockets = Array.prototype.slice.call(accent.querySelectorAll('.hero-accent-svg'));
        while (rockets.length < desiredCount) {
            var rocketClone = baseRocket.cloneNode(true);
            rocketClone.removeAttribute('id');
            accent.appendChild(rocketClone);
            rockets.push(rocketClone);
        }

        var glows = Array.prototype.slice.call(accent.querySelectorAll('.hero-accent-glow'));
        var baseGlow = glows[0];
        if (!baseGlow) {
            baseGlow = document.createElement('span');
            baseGlow.className = 'hero-accent-glow';
            accent.insertBefore(baseGlow, accent.firstChild);
            glows.push(baseGlow);
        }

        while (glows.length < desiredCount) {
            var glowClone = baseGlow.cloneNode(true);
            accent.appendChild(glowClone);
            glows.push(glowClone);
        }

        return {
            rockets: rockets.slice(0, desiredCount),
            glows: glows.slice(0, desiredCount)
        };
    }

    function setupRocketAnimation() {
        if (reducedMotion) {
            return;
        }

        var prepared = ensureRocketElements();
        var rockets = prepared.rockets;
        var glows = prepared.glows;

        if (!rockets.length) {
            return;
        }

        var states = rockets.map(function (_, index) {
            return {
                routeIndex: index,
                path: randomPath(window.innerWidth, window.innerHeight, index),
                startedAt: performance.now() - Math.random() * 9000,
                duration: 9500 + Math.random() * 6000,
                angleOffset: -8 + Math.random() * 16,
                size: 24 + Math.random() * 14,
                opacity: 0.38 + Math.random() * 0.36,
                glow: glows[index] || null
            };
        });

        states.forEach(function (state, index) {
            rockets[index].style.setProperty('--rocket-size', state.size + 'px');
            rockets[index].style.opacity = String(state.opacity);
            if (index % 2 === 1) {
                rockets[index].classList.add('hero-accent-svg--light');
            }
            if (state.glow) {
                state.glow.style.width = 10 + index * 1.5 + 'px';
                state.glow.style.height = 10 + index * 1.5 + 'px';
            }
        });

        function reset(state, now) {
            state.routeIndex = (state.routeIndex + 1 + Math.floor(Math.random() * 2)) % 6;
            state.path = randomPath(window.innerWidth, window.innerHeight, state.routeIndex);
            state.startedAt = now;
            state.duration = 9500 + Math.random() * 6000;
        }

        function frame(now) {
            states.forEach(function (state, index) {
                var progress = (now - state.startedAt) / state.duration;

                if (progress >= 1) {
                    reset(state, now);
                    progress = 0;
                }

                var p = state.path;
                var x = cubicBezier(p[0].x, p[1].x, p[2].x, p[3].x, progress);
                var y = cubicBezier(p[0].y, p[1].y, p[2].y, p[3].y, progress);
                var dx = cubicBezierDerivative(p[0].x, p[1].x, p[2].x, p[3].x, progress);
                var dy = cubicBezierDerivative(p[0].y, p[1].y, p[2].y, p[3].y, progress);
                var angle = Math.atan2(dy, dx) * 180 / Math.PI;
                var rocket = rockets[index];

                state.lastX = x;
                state.lastY = y;
                state.lastAngle = angle + state.angleOffset;
                state.dirX = dx;
                state.dirY = dy;

                rocket.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0) rotate(' + state.lastAngle + 'deg)';

                if (state.glow) {
                    state.glow.style.transform = 'translate3d(' + (x - dx * 0.03) + 'px, ' + (y - dy * 0.03) + 'px, 0)';
                    state.glow.style.opacity = String(0.34 + Math.abs(Math.sin((now + index * 120) / 260)) * 0.4);
                }
            });

            window.requestAnimationFrame(frame);
        }

        window.addEventListener('resize', function () {
            var now = performance.now();
            states.forEach(function (state) {
                reset(state, now);
            });
        });

        window.requestAnimationFrame(frame);

        setupLaserFire(states);
    }

    function setupLaserFire(states) {
        if (!states || !states.length) {
            return;
        }

        if (document.body && document.body.classList.contains('cursor-rocket-active')) {
            return;
        }

        var laserLayer = document.querySelector('.rocket-laser-layer');
        if (!laserLayer) {
            laserLayer = document.createElement('div');
            laserLayer.className = 'rocket-laser-layer';
            document.body.appendChild(laserLayer);
        }

        function fireLaser() {
            var shooter = states[0];
            if (!shooter || typeof shooter.lastX !== 'number') {
                return;
            }

            var size = shooter.size || 32;
            var centerX = shooter.lastX + size / 2;
            var centerY = shooter.lastY + size / 2;

            var dx = shooter.dirX;
            var dy = shooter.dirY;
            var length = Math.hypot(dx, dy) || 1;
            dx /= length;
            dy /= length;

            var noseX = centerX + dx * (size * 0.7);
            var noseY = centerY + dy * (size * 0.7);

            var laser = document.createElement('span');
            laser.className = 'rocket-laser';
            laser.style.setProperty('--laser-x', noseX + 'px');
            laser.style.setProperty('--laser-y', noseY + 'px');
            laser.style.setProperty('--laser-angle', (shooter.lastAngle || 0) + 'deg');
            laser.style.setProperty('--laser-length', 180 + Math.random() * 140 + 'px');
            laser.style.setProperty('--laser-travel', 260 + Math.random() * 220 + 'px');

            laserLayer.appendChild(laser);

            laser.addEventListener('animationend', function () {
                if (laser.parentNode) {
                    laser.parentNode.removeChild(laser);
                }
            });
        }

        document.addEventListener('pointerdown', function (event) {
            if (event.button !== 0) {
                return;
            }

            fireLaser();
        });
    }

    function setupInitialSectionState() {
        var sections = document.querySelectorAll('.section');
        forEachNode(sections, function (section) {
            var rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9) {
                section.classList.add('section-in-view');
            }
        });

        var revealPanels = document.querySelectorAll('.reveal-panel');
        forEachNode(revealPanels, function (panel) {
            var rect = panel.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.92) {
                panel.classList.add('is-visible');
            }
        });
    }

    try {
        setSpaceEffectsEnabled(spaceEffectsEnabled);
        setupModal();
        setupMobileNav();
        if (mobileSpaceEffects) {
            setupAsteroids();
            setupCursorRocket();
        }
        setupSmoothAnchors();
        setupSectionRevealObserver();
        setupInitialSectionState();
        setupSectionActivity();
        setupGalleryAutoScroll();
        setupRevealAnimations();
        if (mobileSpaceEffects) {
            setupRocketAnimation();
        }
    } catch (err) {
        revealAllSections();
        makeRevealPanelsVisible();
    }
})();
