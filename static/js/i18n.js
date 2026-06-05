(function () {
    'use strict';

    var dictionaries = window.APRO_I18N || {};
    var storageKey = 'aprostudio.lang';
    var supported = ['ru', 'en', 'kk'];
    var originalText = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var originalAttr = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

    function normalizeLanguage(lang) {
        lang = (lang || '').toLowerCase();
        if (lang.indexOf('kk') === 0) {
            return 'kk';
        }
        if (lang.indexOf('en') === 0) {
            return 'en';
        }
        return 'ru';
    }

    function getStoredLanguage() {
        try {
            if (window.localStorage) {
                return normalizeLanguage(window.localStorage.getItem(storageKey));
            }
        } catch (err) {
            // ignore storage issues
        }
        return null;
    }

    function setStoredLanguage(lang) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(storageKey, lang);
            }
        } catch (err) {
            // ignore storage issues
        }
    }

    function getInitialLanguage() {
        var stored = getStoredLanguage();
        if (stored) {
            return stored;
        }

        return normalizeLanguage(document.documentElement && document.documentElement.lang);
    }

    function getDictionary(lang) {
        return dictionaries[lang] || dictionaries.ru || { text: {}, meta: {} };
    }

    function cacheTextNode(node) {
        if (!originalText || originalText.has(node)) {
            return;
        }
        originalText.set(node, node.nodeValue);
    }

    function cacheAttribute(el, attr) {
        if (!originalAttr) {
            return;
        }

        var stored = originalAttr.get(el);
        if (!stored) {
            stored = {};
            originalAttr.set(el, stored);
        }

        if (!(attr in stored)) {
            stored[attr] = el.getAttribute(attr);
        }
    }

    function replaceTextNodes(root, lang) {
        var dictionary = getDictionary(lang).text || {};
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;

        while ((node = walker.nextNode())) {
            if (!node.nodeValue || !node.nodeValue.trim()) {
                continue;
            }

            var parent = node.parentElement;
            if (parent && /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName)) {
                continue;
            }

            cacheTextNode(node);

            var current = node.nodeValue;
            var source = originalText && originalText.has(node) ? originalText.get(node) : current;
            var trimmed = source.trim();
            var translated = dictionary[trimmed];

            if (lang === 'ru') {
                if (originalText && originalText.has(node)) {
                    node.nodeValue = originalText.get(node);
                }
                continue;
            }

            if (!translated) {
                continue;
            }

            var prefixMatch = current.match(/^\s*/);
            var suffixMatch = current.match(/\s*$/);
            var prefix = prefixMatch ? prefixMatch[0] : '';
            var suffix = suffixMatch ? suffixMatch[0] : '';
            node.nodeValue = prefix + translated + suffix;
        }
    }

    function replaceAttributes(root, lang) {
        var dictionary = getDictionary(lang).text || {};
        var elements = root.querySelectorAll('[aria-label], [placeholder], [data-label-open], [data-label-close], [title]');

        Array.prototype.forEach.call(elements, function (el) {
            ['aria-label', 'placeholder', 'data-label-open', 'data-label-close', 'title'].forEach(function (attr) {
                if (!el.hasAttribute(attr)) {
                    return;
                }

                var current = el.getAttribute(attr);
                if (!current) {
                    return;
                }

                if (lang === 'ru') {
                    if (originalAttr) {
                        var stored = originalAttr.get(el);
                        if (stored && Object.prototype.hasOwnProperty.call(stored, attr)) {
                            var originalValue = stored[attr];
                            if (originalValue !== null) {
                                el.setAttribute(attr, originalValue);
                            }
                        }
                    }
                    return;
                }

                var storedAttr = originalAttr ? originalAttr.get(el) : null;
                var sourceValue = storedAttr && Object.prototype.hasOwnProperty.call(storedAttr, attr)
                    ? storedAttr[attr]
                    : current;
                var translated = dictionary[sourceValue];
                if (!translated) {
                    return;
                }

                cacheAttribute(el, attr);
                el.setAttribute(attr, translated);
            });
        });
    }

    function applyMeta(lang) {
        var dictionary = getDictionary(lang).meta || {};

        if (dictionary.title) {
            document.title = dictionary.title;
        }

        var description = document.querySelector('meta[name="description"]');
        if (description && dictionary.description) {
            description.setAttribute('content', dictionary.description);
        }

        var keywords = document.querySelector('meta[name="keywords"]');
        if (keywords && dictionary.keywords) {
            keywords.setAttribute('content', dictionary.keywords);
        }

        var ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription && dictionary.ogDescription) {
            ogDescription.setAttribute('content', dictionary.ogDescription);
        }

        var ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale && dictionary.ogLocale) {
            ogLocale.setAttribute('content', dictionary.ogLocale);
        }
    }

    function updateLangButtons(lang) {
        var buttons = document.querySelectorAll('.lang-btn');
        Array.prototype.forEach.call(buttons, function (button) {
            var buttonLang = normalizeLanguage(button.getAttribute('data-lang'));
            var isActive = buttonLang === lang;
            button.classList.toggle('lang-btn--active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function updateCurrentYear() {
        var year = document.getElementById('current-year');
        if (year) {
            year.textContent = String(new Date().getFullYear());
        }
    }

    function translatePage(lang) {
        lang = supported.indexOf(lang) !== -1 ? lang : 'ru';
        document.documentElement.lang = lang;
        document.documentElement.setAttribute('lang', lang);
        setStoredLanguage(lang);
        applyMeta(lang);
        replaceTextNodes(document.body, lang);
        replaceAttributes(document.body, lang);
        updateLangButtons(lang);
        updateCurrentYear();
        document.dispatchEvent(new CustomEvent('aprostudio:languagechange', { detail: { lang: lang } }));
    }

    function bindLanguageButtons() {
        var buttons = document.querySelectorAll('.lang-btn[data-lang]');
        Array.prototype.forEach.call(buttons, function (button) {
            button.addEventListener('click', function () {
                translatePage(normalizeLanguage(button.getAttribute('data-lang')));
            });
        });
    }

    function init() {
        bindLanguageButtons();
        translatePage(getInitialLanguage());
    }

    window.APRO_I18N_API = {
        setLanguage: translatePage,
        getLanguage: function () {
            return normalizeLanguage(document.documentElement.lang);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
