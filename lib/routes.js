const { Minimatch } = require('minimatch')
const extractComponentOptions = require('./extractComponentOptions')
const { COMPONENT_OPTIONS_BLOCK, COMPONENT_OPTIONS_KEY } = require('./constants')
/**
 * Exclude routes by matching glob patterns on url
 *
 * @param   {string[]} patterns
 * @param   {Array}    routes
 * @returns {Array}
 */
function excludeRoutes(patterns, routes) {
  patterns.forEach((pattern) => {
    const minimatch = new Minimatch(pattern)
    minimatch.negate = true
    routes = routes.filter(({ url }) => minimatch.match(url))
  })
  return routes
}

/**
 * Get static routes from Nuxt router and ignore dynamic routes
 *
 * @param   {Object} router
 * @returns {Array}
 */
function getStaticRoutes(router, options) {
  // Get all static routes and ignore dynamic routes
  let whitelistSet = _transformListToSet(options?.whitelist)
  let blacklistSet = _transformListToSet(options?.blacklist)
  return flattenStaticRoutes(router)
    .filter(({ url }) => !url.includes(':') && !url.includes('*'))
    .filter((route) => {
      if (_checkRouteNameInListSet(whitelistSet, route.name)) return true
      if (_checkRouteNameInListSet(blacklistSet, route.name)) return false
      return extractComponentOptions(route.component, COMPONENT_OPTIONS_BLOCK, COMPONENT_OPTIONS_KEY) !== false
    })
}
function getExcludedSitemapStaticRoutes(router, options) {
  // Get all static routes and ignore dynamic routes that have sitemap:false
  let whitelistSet = _transformListToSet(options?.whitelist)
  let blacklistSet = _transformListToSet(options?.blacklist)
  return flattenStaticRoutes(router)
    .filter(({ url }) => !url.includes(':') && !url.includes('*'))
    .filter((route) => {
      if (_checkRouteNameInListSet(whitelistSet, route.name)) return false
      if (_checkRouteNameInListSet(blacklistSet, route.name)) return true
      return extractComponentOptions(route.component, COMPONENT_OPTIONS_BLOCK, COMPONENT_OPTIONS_KEY) === false
    })
}
// Whitelist & Blacklist helpers
function _transformListToSet(list) {
  return list?.length ? new Set(list) : null
}
function _checkRouteNameInListSet(listSet, routeName) {
  const nameToMatchListAllLocales = routeName?.match(/.+?(?=___.*$)/, 'g')?.[0]
  return listSet?.has(nameToMatchListAllLocales) || listSet?.has(routeName)
}
/**
 * Recursively flatten all static routes and their nested routes
 *
 * @param   {Object} router
 * @param   {string} path
 * @param   {Array}  routes
 * @returns {Array}
 */
function flattenStaticRoutes(router, path = '', routes = []) {
  router.forEach((route) => {
    // Skip dynamic routes
    if ([':', '*'].some((c) => route.path.includes(c))) {
      return
    }

    const realPath = route.path.startsWith('/') ? route.path : path + route.path // Convert absolute paths of children into absolute ones, and allow inheritance within their children
    // Nested routes
    if (route.children) {
      return flattenStaticRoutes(route.children, realPath + '/', routes)
    }
    // Normalize url (without trailing slash)
    route.url = path.length && !route.path.length ? path.slice(0, -1) : realPath

    routes.push(route)
  })
  return routes
}

module.exports = { excludeRoutes, getStaticRoutes, getExcludedSitemapStaticRoutes }
