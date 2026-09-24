/* =========================================================
   E-KABAADI PLATFORM
   UI State Manager (Loading / Empty / Error)
   File: frontend/shared/js/ui-states.js

   Provides consistent loading, empty, and error states
   for all pages when data is being fetched from the backend.
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.UIStates = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function getContainer(containerId) {
        if (typeof document === "undefined") return null;
        return typeof containerId === "string" 
            ? document.getElementById(containerId) 
            : containerId;
    }

    var UIStates = {
        /**
         * Show a loading spinner inside a container.
         * @param {string|Element} containerId 
         * @param {string} message - Optional loading text
         */
        showLoading: function (containerId, message) {
            var container = getContainer(containerId);
            if (!container) return;

            container.innerHTML = 
                '<div class="ui-state ui-state-loading" role="status" aria-live="polite">' +
                    '<div class="ui-state-spinner">' +
                        '<div class="ui-spinner-ring"></div>' +
                    '</div>' +
                    '<p class="ui-state-text">' + (message || 'Loading...') + '</p>' +
                '</div>';
        },

        /**
         * Show an empty state inside a container.
         * @param {string|Element} containerId 
         * @param {string} message - Empty state message
         * @param {string} icon - Optional emoji/icon
         */
        showEmpty: function (containerId, message, icon) {
            var container = getContainer(containerId);
            if (!container) return;

            container.innerHTML = 
                '<div class="ui-state ui-state-empty" role="status">' +
                    '<div class="ui-state-icon">' + (icon || '📭') + '</div>' +
                    '<p class="ui-state-text">' + (message || 'No data available.') + '</p>' +
                '</div>';
        },

        /**
         * Show an error state inside a container.
         * @param {string|Element} containerId 
         * @param {string} message - Error message
         * @param {Function} retryFn - Optional retry callback
         */
        showError: function (containerId, message, retryFn) {
            var container = getContainer(containerId);
            if (!container) return;

            var retryBtn = retryFn 
                ? '<button class="ui-state-retry-btn" onclick="this._retryFn()">Try Again</button>' 
                : '';

            container.innerHTML = 
                '<div class="ui-state ui-state-error" role="alert">' +
                    '<div class="ui-state-icon">⚠️</div>' +
                    '<p class="ui-state-text">' + (message || 'Something went wrong. Please try again.') + '</p>' +
                    retryBtn +
                '</div>';

            if (retryFn) {
                var btn = container.querySelector('.ui-state-retry-btn');
                if (btn) btn._retryFn = retryFn;
                if (btn) btn.onclick = retryFn;
            }
        },

        /**
         * Clear any UI state from a container.
         * @param {string|Element} containerId 
         */
        clearState: function (containerId) {
            var container = getContainer(containerId);
            if (!container) return;

            var stateEl = container.querySelector('.ui-state');
            if (stateEl) stateEl.remove();
        },

        /**
         * Wrap an async data-fetch with loading → success/error/empty states.
         * @param {string|Element} containerId 
         * @param {Function} fetchFn - Function that returns a Promise
         * @param {Function} renderFn - Function to render the data
         * @param {object} options - { loadingMsg, emptyMsg, emptyIcon, errorMsg }
         */
        wrapAsync: function (containerId, fetchFn, renderFn, options) {
            var opts = options || {};
            var self = this;

            self.showLoading(containerId, opts.loadingMsg);

            return Promise.resolve()
                .then(function () { return fetchFn(); })
                .then(function (data) {
                    self.clearState(containerId);

                    // Check for empty data
                    if (!data || (Array.isArray(data) && data.length === 0)) {
                        self.showEmpty(containerId, opts.emptyMsg, opts.emptyIcon);
                        return data;
                    }

                    // Render the data
                    if (renderFn) renderFn(data);
                    return data;
                })
                .catch(function (err) {
                    console.error("[UIStates] Fetch error:", err);
                    self.showError(
                        containerId, 
                        opts.errorMsg || "Unable to load data. Please try again.",
                        function () { self.wrapAsync(containerId, fetchFn, renderFn, opts); }
                    );
                });
        },

        /**
         * Helper to resolve data that may be sync (mock) or async (Supabase).
         * @param {*} dataOrPromise 
         * @returns {Promise}
         */
        resolve: function (dataOrPromise) {
            if (dataOrPromise && typeof dataOrPromise.then === "function") {
                return dataOrPromise;
            }
            return Promise.resolve(dataOrPromise);
        }
    };

    return UIStates;
}));
