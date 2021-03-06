/**
 * @copyright   2010-2013, The Titon Project
 * @license     http://opensource.org/licenses/bsd-license.php
 * @link        http://titon.io
 */

(function($) {
    'use strict';

    Toolkit.Tabs = Toolkit.Component.extend(function(element, options) {
        this.component = 'Tabs';
        this.version = '1.0.0';

        // Set options and element
        this.options = options = this.setOptions(options);
        this.element = element = this.setElement(element);

        if (!options.cookie) {
            options.cookie = element.attr('id');
        }

        // Navigation container
        this.nav = element.find(options.navElement);

        // Collection of content sections
        this.sections = element.find(options.sectionsElement).conceal();

        /** Collection of tabs (anchor links) */
        this.tabs = this.nav.find('ul > li > a').each(function(index) {
            $(this).data('index', index).removeClass(Toolkit.options.isPrefix + 'active');
        });

        // The current and previous shown indices
        this.previousIndex = 0;
        this.currentIndex = 0;

        // Cached requests
        this.cache = {};

        // Set events
        this.tabs.on((options.mode === 'click' ? 'click' : 'mouseover'), this.__show.bind(this));

        if (options.mode === 'hover' && options.preventDefault) {
            this.tabs.on('click', function(e) {
                e.preventDefault();
            });
        }

        this.fireEvent('init');

        // Trigger default tab to display
        var index = options.defaultIndex;

        if (options.persistState) {
            index = $.cookie('toolkit.tabs.' + options.cookie);

        } else if (options.loadFragment && location.hash) {
            index = this.tabs.filter(function() {
                return ($(this).attr('href') === location.hash);
            }).item(0).data('index');
        }

        if (!index || !this.tabs[index]) {
            index = 0;
        }

        this.jump(index);
    }, {

        /**
         * Hide all sections.
         */
        hide: function() {
            this.sections.conceal();

            this.fireEvent('hide', this.node);
        },

        /**
         * Jump to a specific tab via index.
         *
         * @param {Number} index
         */
        jump: function(index) {
            if (this.tabs[index]) {
                this.show(this.tabs[index]);
            }
        },

        /**
         * Show the content based on the tab. Can either pass an integer as the index in the collection,
         * or pass an element object for a tab in the collection.
         *
         * @param {jQuery} tab
         */
        show: function(tab) {
            tab = $(tab);

            var index = tab.data('index'),
                section = this.sections.item(index),
                url = this.readValue(tab, this.options.getUrl),
                options = this.options;

            // Load content with AJAX
            if (options.ajax && url && url.substr(0, 1) !== '#' && !this.cache[url]) {
                this.requestData(url,
                    function() {
                        section.html(this._loadingTemplate())
                            .addClass(Toolkit.options.isPrefix + 'loading');
                    },
                    function(response) {
                        this.cache[url] = true;

                        section.html(response)
                            .removeClass(Toolkit.options.isPrefix + 'loading');

                        this.fireEvent('load', response);
                    },
                    function() {
                        section.html(this._errorTemplate())
                            .removeClass(Toolkit.options.isPrefix + 'loading')
                            .addClass(Toolkit.options.hasPrefix + 'failed');
                    }
                );
            }

            // Toggle tabs
            this.nav.find('ul > li').removeClass(Toolkit.options.isPrefix + 'active');

            // Toggle sections
            if (index === this.currentIndex && options.collapsible) {
                if (section.is(':shown')) {
                    section.conceal();

                } else {
                    tab.parent().addClass(Toolkit.options.isPrefix + 'active');
                    section.reveal();
                }
            } else {
                this.hide();

                tab.parent().addClass(Toolkit.options.isPrefix + 'active');
                section.reveal();
            }

            // Persist the state using a cookie
            if (options.persistState) {
                $.cookie('toolkit.tabs.' + options.cookie, index, {
                    expires: options.cookieDuration
                });
            }

            // Track
            this.previousIndex = this.currentIndex;
            this.currentIndex = index;

            this.fireEvent('show', tab);

            // Set current node
            this.node = tab;
        },

        /**
         * Event callback for tab element click.
         *
         * @private
         * @param {jQuery.Event} e
         */
        __show: function(e) {
            if (this.options.preventDefault || (this.options.ajax && $(e.target).attr('href').substr(0, 1) !== '#')) {
                e.preventDefault();
            }

            if (this.enabled) {
                this.show(e.target);
            }
        }

    }, {
        mode: 'click',
        ajax: true,
        collapsible: false,
        defaultIndex: 0,
        persistState: false,
        preventDefault: true,
        loadFragment: true,
        cookie: null,
        cookieDuration: 30,
        getUrl: 'href',
        navElement: '.tabs-nav',
        sectionsElement: '.tabs-section'
    });

    /**
     * Defines a component that can be instantiated through tabs().
     */
    Toolkit.createComponent('tabs', function(options) {
        return new Toolkit.Tabs(this, options);
    });

})(jQuery);