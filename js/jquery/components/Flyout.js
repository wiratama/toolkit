/**
 * @copyright   2010-2013, The Titon Project
 * @license     http://opensource.org/licenses/bsd-license.php
 * @link        http://titon.io
 */

(function($) {
    'use strict';

    Toolkit.Flyout = Toolkit.Component.extend(function(nodes, url, options) {
        if (!url) {
            throw new Error('Flyout URL required to download sitemap JSON');
        }

        this.component = 'Flyout';
        this.version = '1.1.1';

        // Set options
        this.options = options = this.setOptions(options);

        // Nodes to activate menus on
        this.nodes = nodes = $(nodes);

        // Currently active node
        this.node = null;

        // Currently active menu
        this.element = null;

        // The current menu URL being displayed
        this.current = null;

        // Collection of menu elements
        this.menus = {};

        // Raw data response
        this.data = [];

        // Mapping of data indexed by URL
        this.dataMap = {};

        // Delay timers
        this.timers = {};

        // Load data from the URL
        $.getJSON(url, this.load.bind(this));

        // Handles keeping menu open even if mouse exits the context
        if (options.mode === 'hover') {
            $(options.context || document)
                .on('mouseenter', nodes.selector, function() {
                    this.clearTimer('hide');
                    this.startTimer('show', options.showDelay);
                }.bind(this))
                .on('mouseleave', nodes.selector, function() {
                    this.clearTimer('show');
                    this.startTimer('hide', options.showDelay);
                }.bind(this));
        }

        $(options.context || document)
            .on((options.mode === 'click' ? 'click' : 'mouseenter'), nodes.selector, this.__show.bind(this));

        this.fireEvent('init');
    }, {

        /**
         * Clear a timer by key.
         *
         * @param {String} key
         */
        clearTimer: function(key) {
            clearTimeout(this.timers[key]);
            delete this.timers[key];
        },

        /**
         * Hide the currently shown menu.
         */
        hide: function() {
            // Must be called even if the menu is hidden
            this.node.removeClass(Toolkit.options.isPrefix + 'active');

            if (!this.current || !this.isVisible()) {
                return;
            }

            this.menus[this.current].conceal();
            this.fireEvent('hide');

            // Reset last
            this.current = null;
        },

        /**
         * Return true if the current menu exists and is visible.
         *
         * @returns {bool}
         */
        isVisible: function() {
            if (this.current && this.menus[this.current]) {
                this.element = this.menus[this.current];
            }

            return (this.element && this.element.is(':shown'));
        },

        /**
         * Load the data into the class and save a mapping of it.
         *
         * @param {Object} data
         * @param {Number} [depth]
         */
        load: function(data, depth) {
            depth = depth || 0;

            // If root, store the data
            if (depth === 0) {
                this.data = data;
            }

            // Store the data indexed by URL
            if (data.url) {
                this.dataMap[data.url] = data;
            }

            if (data.children) {
                for (var i = 0, l = data.children.length; i < l; i++) {
                    this.load(data.children[i], depth + 1);
                }
            }
        },

        /**
         * Position the menu below the target node.
         */
        position: function() {
            var target = this.current,
                options = this.options;

            if (!this.menus[target]) {
                return;
            }

            var menu = this.menus[target],
                height = menu.outerHeight(),
                coords = this.node.offset(),
                x = coords.left + options.xOffset,
                y = coords.top + options.yOffset + this.node.outerHeight(),
                windowScroll = $(window).height();

            // If menu goes below half page, position it above
            if (y > (windowScroll / 2)) {
                y = coords.top - options.yOffset - height;
            }

            menu.css({
                left: x,
                top: y
            }).reveal();

            this.fireEvent('show');
        },

        /**
         * Show the menu below the node.
         *
         * @param {jQuery} node
         */
        show: function(node) {
            var target = this._getTarget(node);

            // When jumping from one node to another
            // Immediately hide the other menu and start the timer for the current one
            if (this.current && target !== this.current) {
                this.hide();
                this.startTimer('show', this.options.showDelay);
            }

            this.node = $(node);

            // Find the menu, else create it
            if (!this._getMenu()) {
                return;
            }

            this.node.addClass(Toolkit.options.isPrefix + 'active');

            // Display immediately if click
            if (this.options.mode === 'click') {
                this.position();
            }
        },

        /**
         * Add a timer that should trigger a function after a delay.
         *
         * @param {String} key
         * @param {Number} delay
         * @param {Array} [args]
         */
        startTimer: function(key, delay, args) {
            this.clearTimer(key);

            var func;

            if (key === 'show') {
                func = this.position.bind(this);
            } else {
                func = this.hide.bind(this);
            }

            if (func) {
                this.timers[key] = setTimeout(function() {
                    func.apply(this, args || []);
                }.bind(this), delay);
            }
        },

        /**
         * Build a nested list menu using the data object.
         *
         * @private
         * @param {jQuery} parent
         * @param {Object} data
         * @returns {jQuery}
         */
        _buildMenu: function(parent, data) {
            if (!data.children || !data.children.length) {
                return null;
            }

            var menu = $(this.options.template),
                groups = [],
                ul,
                li,
                tag,
                target = this.options.contentElement,
                limit = this.options.itemLimit,
                i, l;

            if (this.options.className) {
                menu.addClass(this.options.className);
            }

            if (parent.is('body')) {
                menu.addClass(Toolkit.options.isPrefix + 'root');
            }

            if (limit && data.children.length > limit) {
                i = 0;
                l = data.children.length;

                while (i < l) {
                    groups.push(data.children.slice(i, i += limit));
                }
            } else {
                groups.push(data.children);
            }

            for (var g = 0, group, child; group = groups[g]; g++) {
                ul = $('<ul/>');

                for (i = 0, l = group.length; i < l; i++) {
                    child = group[i];
                    li = $('<li/>');

                    // Build tag
                    if (child.url) {
                        tag = $('<a/>', {
                            text: child.title,
                            href: child.url
                        });

                        // Add icon
                        $('<span/>').addClass(child.icon || 'caret-right').prependTo(tag);
                    } else {
                        tag = $('<span/>', {
                            text: child.title
                        });

                        li.addClass(Toolkit.options.vendor + 'flyout-heading');
                    }

                    if (child.attributes) {
                        tag.attr(child.attributes);
                    }

                    // Build list
                    if (child.className) {
                        li.addClass(child.className);
                    }

                    li.append(tag).appendTo(ul);

                    if (child.children && child.children.length) {
                        this._buildMenu(li, child);

                        li.addClass(Toolkit.options.hasPrefix + 'children')
                            .on('mouseenter', this.__positionChild.bind(this, li))
                            .on('mouseleave', this.__hideChild.bind(this, li));
                    }
                }

                if (target) {
                    if (menu.is(target)) {
                        menu.append(ul);
                    } else {
                        menu.find(target).append(ul);
                    }
                } else {
                    menu.append(ul);
                }
            }

            menu.appendTo(parent);

            return menu;
        },

        /**
         * Get the menu if it exists, else build it and set events.
         *
         * @private
         * @returns {jQuery}
         */
        _getMenu: function() {
            var target = this._getTarget();

            if (this.menus[target]) {
                this.current = target;

                return this.menus[target];
            }

            if (this.dataMap[target]) {
                var menu = this._buildMenu($('body'), this.dataMap[target]);

                if (!menu) {
                    return null;
                }

                menu.conceal();

                if (this.options.mode === 'hover') {
                    menu.on({
                        mouseenter: function() {
                            this.clearTimer('hide');
                        }.bind(this),
                        mouseleave: function() {
                            this.startTimer('hide', this.options.hideDelay);
                        }.bind(this)
                    });
                }

                this.current = target;
                this.menus[target] = menu;

                return this.menus[target];
            }

            return null;
        },

        /**
         * Get the target URL to determine which menu to show.
         *
         * @private
         * @param {jQuery} [node]
         * @returns {String}
         */
        _getTarget: function(node) {
            node = $(node || this.node);

            return this.readValue(node, this.options.getUrl) || node.attr('href');
        },

        /**
         * Event handler to hide the child menu after exiting parent li.
         *
         * @private
         * @param {jQuery} parent
         */
        __hideChild: function(parent) {
            parent = $(parent);
            parent.removeClass(Toolkit.options.isPrefix + 'open');
            parent.children(this.options.contentElement).removeAttr('style');

            this.fireEvent('hideChild', parent);
        },

        /**
         * Event handler to position the child menu dependent on the position in the page.
         *
         * @private
         * @param {jQuery} parent
         */
        __positionChild: function(parent) {
            var menu = parent.children(this.options.contentElement);

            if (!menu) {
                return;
            }

            // Alter width because of columns
            var children = menu.children();

            menu.css('width', (children.outerWidth() * children.length) + 'px');

            // Get sizes after menu positioning
            var win = $(window),
                winHeight = win.height() + win.scrollTop(),
                winWidth = win.width(),
                parentTop = parent.offset().top,
                parentHeight = parent.outerHeight(),
                parentRight = parent.offset().left + parent.outerWidth();

            // Display menu horizontally on opposite side if it spills out of viewport
            var hWidth = parentRight + menu.outerWidth();

            if (hWidth >= winWidth) {
                menu.addClass('push-left');
            } else {
                menu.removeClass('push-left');
            }

            // Reverse menu vertically if below half way fold
            if (parentTop > (winHeight / 2)) {
                menu.css('top', '-' + (menu.outerHeight() - parentHeight) + 'px');
            } else {
                menu.css('top', 0);
            }

            parent.addClass(Toolkit.options.isPrefix + 'open');

            this.fireEvent('showChild', parent);
        },

        /**
         * Event handler to show the menu.
         *
         * @private
         * @param {jQuery.Event} e
         */
        __show: function(e) {
            var node = $(e.target),
                isNode = (this.node && node[0] === this.node[0]);

            if (this.isVisible()) {

                // Touch devices should pass through on second click
                if (Toolkit.isTouch) {
                    if (!isNode || this.node.prop('tagName').toLowerCase() !== 'a') {
                        e.preventDefault();
                    }

                // Non-touch devices
                } else {
                    e.preventDefault();
                }

                // Second click should close it
                if (this.options.mode === 'click') {
                    this.hide();
                }

                // Exit if the same node so it doesn't re-open
                if (isNode) {
                    return;
                }

            } else {
                e.preventDefault();
            }

            this.show(node);
        }

    }, {
        className: '',
        context: null,
        mode: 'hover',
        getUrl: 'href',
        xOffset: 0,
        yOffset: 0,
        showDelay: 350,
        hideDelay: 1000,
        itemLimit: 15,
        contentElement: '.flyout',
        template: '<div class="flyout"></div>'
    });

    /**
     * Defines a component that can be instantiated through flyout().
     */
    Toolkit.createComponent('flyout', function(url, options) {
        return new Toolkit.Flyout(this, url, options);
    }, true);

})(jQuery);