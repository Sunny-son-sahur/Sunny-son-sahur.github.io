/* site-base.js — deployment base-path resolver.
 *
 * The same build has to run at a domain root (user site) or under a
 * project-site subpath (/simplegames-lol.github.io/). Every page that loads
 * a path-keyed script also loads this file with a depth-relative src, so this
 * script's own URL always resolves to the site root.
 *
 * Exposes:
 *   window.SITE_BASE       site root as an absolute URL  (https://x/repo/)
 *   window.SITE_BASE_PATH  site root as a pathname       (/repo/ or /)
 *   window.sitePath(v)     any href/pathname -> canonical "/slug/" key
 *   window.siteUrl(v)      canonical "/slug/" -> absolute URL under site root
 */
(function () {
  var me = document.currentScript;
  var base = "/";
  if (me && me.src) base = me.src.replace(/[^/]*$/, "");

  var basePath = "/";
  try {
    basePath = new URL(base, location.href).pathname;
  } catch (error) {
    basePath = "/";
  }

  function sitePath(value) {
    var text = value == null ? "" : String(value);
    var path;
    try {
      // Absolute URLs and relative refs both resolve against this document.
      path = new URL(text, location.href).pathname;
    } catch (error) {
      path = text;
    }
    if (basePath !== "/" && path.indexOf(basePath) === 0) {
      path = "/" + path.slice(basePath.length).replace(/^\/+/, "");
    }
    return path;
  }

  function siteUrl(value) {
    var rel = String(value == null ? "" : value).replace(/^\/+/, "");
    try {
      return new URL(rel, base).href;
    } catch (error) {
      return rel;
    }
  }

  window.SITE_BASE = base;
  window.SITE_BASE_PATH = basePath;
  window.sitePath = sitePath;
  window.siteUrl = siteUrl;
})();
