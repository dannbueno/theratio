/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/strava/callback/route";
exports.ids = ["app/api/auth/strava/callback/route"];
exports.modules = {

/***/ "(rsc)/./app/api/auth/strava/callback/route.js":
/*!***********************************************!*\
  !*** ./app/api/auth/strava/callback/route.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\nasync function GET(request) {\n    // Obtener el código de autorización de los parámetros de URL\n    const { searchParams } = new URL(request.url);\n    const code = searchParams.get('code');\n    const error = searchParams.get('error');\n    // Si hay un error o no hay código, redirigir a la página principal con un mensaje de error\n    if (error || !code) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(`${\"http://localhost:3000\"}?error=authentication_failed`);\n    }\n    try {\n        // Intercambiar el código por un token de acceso\n        const tokenResponse = await fetch('https://www.strava.com/oauth/token', {\n            method: 'POST',\n            headers: {\n                'Content-Type': 'application/json'\n            },\n            body: JSON.stringify({\n                client_id: process.env.STRAVA_CLIENT_ID,\n                client_secret: process.env.STRAVA_CLIENT_SECRET,\n                code,\n                grant_type: 'authorization_code'\n            })\n        });\n        const tokenData = await tokenResponse.json();\n        if (!tokenResponse.ok) {\n            console.error('Error intercambiando código por token:', tokenData);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(`${\"http://localhost:3000\"}?error=token_exchange_failed`);\n        }\n        // Extraer los tokens\n        const { access_token, refresh_token, expires_at } = tokenData;\n        // Redirigir al dashboard con el token de acceso\n        // En una aplicación real, almacenarías estos tokens de forma segura en una base de datos\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(`${\"http://localhost:3000\"}/dashboard?token=${access_token}`);\n    } catch (error) {\n        console.error('Error procesando el callback de Strava:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(`${\"http://localhost:3000\"}?error=server_error`);\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvc3RyYXZhL2NhbGxiYWNrL3JvdXRlLmpzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQTJDO0FBRXBDLGVBQWVDLElBQUlDLE9BQU87SUFDL0IsNkRBQTZEO0lBQzdELE1BQU0sRUFBRUMsWUFBWSxFQUFFLEdBQUcsSUFBSUMsSUFBSUYsUUFBUUcsR0FBRztJQUM1QyxNQUFNQyxPQUFPSCxhQUFhSSxHQUFHLENBQUM7SUFDOUIsTUFBTUMsUUFBUUwsYUFBYUksR0FBRyxDQUFDO0lBRS9CLDJGQUEyRjtJQUMzRixJQUFJQyxTQUFTLENBQUNGLE1BQU07UUFDbEIsT0FBT04scURBQVlBLENBQUNTLFFBQVEsQ0FBQyxHQUFHQyx1QkFBZ0MsQ0FBQyw0QkFBNEIsQ0FBQztJQUNoRztJQUVBLElBQUk7UUFDRixnREFBZ0Q7UUFDaEQsTUFBTUcsZ0JBQWdCLE1BQU1DLE1BQU0sc0NBQXNDO1lBQ3RFQyxRQUFRO1lBQ1JDLFNBQVM7Z0JBQ1AsZ0JBQWdCO1lBQ2xCO1lBQ0FDLE1BQU1DLEtBQUtDLFNBQVMsQ0FBQztnQkFDbkJDLFdBQVdWLFFBQVFDLEdBQUcsQ0FBQ1UsZ0JBQWdCO2dCQUN2Q0MsZUFBZVosUUFBUUMsR0FBRyxDQUFDWSxvQkFBb0I7Z0JBQy9DakI7Z0JBQ0FrQixZQUFZO1lBQ2Q7UUFDRjtRQUVBLE1BQU1DLFlBQVksTUFBTVosY0FBY2EsSUFBSTtRQUUxQyxJQUFJLENBQUNiLGNBQWNjLEVBQUUsRUFBRTtZQUNyQkMsUUFBUXBCLEtBQUssQ0FBQywwQ0FBMENpQjtZQUN4RCxPQUFPekIscURBQVlBLENBQUNTLFFBQVEsQ0FBQyxHQUFHQyx1QkFBZ0MsQ0FBQyw0QkFBNEIsQ0FBQztRQUNoRztRQUVBLHFCQUFxQjtRQUNyQixNQUFNLEVBQUVtQixZQUFZLEVBQUVDLGFBQWEsRUFBRUMsVUFBVSxFQUFFLEdBQUdOO1FBRXBELGdEQUFnRDtRQUNoRCx5RkFBeUY7UUFDekYsT0FBT3pCLHFEQUFZQSxDQUFDUyxRQUFRLENBQUMsR0FBR0MsdUJBQWdDLENBQUMsaUJBQWlCLEVBQUVtQixjQUFjO0lBQ3BHLEVBQUUsT0FBT3JCLE9BQU87UUFDZG9CLFFBQVFwQixLQUFLLENBQUMsMkNBQTJDQTtRQUN6RCxPQUFPUixxREFBWUEsQ0FBQ1MsUUFBUSxDQUFDLEdBQUdDLHVCQUFnQyxDQUFDLG1CQUFtQixDQUFDO0lBQ3ZGO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9kYW5pZWxidWVub2Zlcm5hbmRlei9zdHJhdmFwcC9hcHAvYXBpL2F1dGgvc3RyYXZhL2NhbGxiYWNrL3JvdXRlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0KSB7XG4gIC8vIE9idGVuZXIgZWwgY8OzZGlnbyBkZSBhdXRvcml6YWNpw7NuIGRlIGxvcyBwYXLDoW1ldHJvcyBkZSBVUkxcbiAgY29uc3QgeyBzZWFyY2hQYXJhbXMgfSA9IG5ldyBVUkwocmVxdWVzdC51cmwpO1xuICBjb25zdCBjb2RlID0gc2VhcmNoUGFyYW1zLmdldCgnY29kZScpO1xuICBjb25zdCBlcnJvciA9IHNlYXJjaFBhcmFtcy5nZXQoJ2Vycm9yJyk7XG5cbiAgLy8gU2kgaGF5IHVuIGVycm9yIG8gbm8gaGF5IGPDs2RpZ28sIHJlZGlyaWdpciBhIGxhIHDDoWdpbmEgcHJpbmNpcGFsIGNvbiB1biBtZW5zYWplIGRlIGVycm9yXG4gIGlmIChlcnJvciB8fCAhY29kZSkge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QoYCR7cHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQkFTRV9VUkx9P2Vycm9yPWF1dGhlbnRpY2F0aW9uX2ZhaWxlZGApO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBJbnRlcmNhbWJpYXIgZWwgY8OzZGlnbyBwb3IgdW4gdG9rZW4gZGUgYWNjZXNvXG4gICAgY29uc3QgdG9rZW5SZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL3d3dy5zdHJhdmEuY29tL29hdXRoL3Rva2VuJywge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBjbGllbnRfaWQ6IHByb2Nlc3MuZW52LlNUUkFWQV9DTElFTlRfSUQsXG4gICAgICAgIGNsaWVudF9zZWNyZXQ6IHByb2Nlc3MuZW52LlNUUkFWQV9DTElFTlRfU0VDUkVULFxuICAgICAgICBjb2RlLFxuICAgICAgICBncmFudF90eXBlOiAnYXV0aG9yaXphdGlvbl9jb2RlJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdG9rZW5EYXRhID0gYXdhaXQgdG9rZW5SZXNwb25zZS5qc29uKCk7XG5cbiAgICBpZiAoIXRva2VuUmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGludGVyY2FtYmlhbmRvIGPDs2RpZ28gcG9yIHRva2VuOicsIHRva2VuRGF0YSk7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLnJlZGlyZWN0KGAke3Byb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0JBU0VfVVJMfT9lcnJvcj10b2tlbl9leGNoYW5nZV9mYWlsZWRgKTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWVyIGxvcyB0b2tlbnNcbiAgICBjb25zdCB7IGFjY2Vzc190b2tlbiwgcmVmcmVzaF90b2tlbiwgZXhwaXJlc19hdCB9ID0gdG9rZW5EYXRhO1xuICAgIFxuICAgIC8vIFJlZGlyaWdpciBhbCBkYXNoYm9hcmQgY29uIGVsIHRva2VuIGRlIGFjY2Vzb1xuICAgIC8vIEVuIHVuYSBhcGxpY2FjacOzbiByZWFsLCBhbG1hY2VuYXLDrWFzIGVzdG9zIHRva2VucyBkZSBmb3JtYSBzZWd1cmEgZW4gdW5hIGJhc2UgZGUgZGF0b3NcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLnJlZGlyZWN0KGAke3Byb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0JBU0VfVVJMfS9kYXNoYm9hcmQ/dG9rZW49JHthY2Nlc3NfdG9rZW59YCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2VzYW5kbyBlbCBjYWxsYmFjayBkZSBTdHJhdmE6JywgZXJyb3IpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QoYCR7cHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQkFTRV9VUkx9P2Vycm9yPXNlcnZlcl9lcnJvcmApO1xuICB9XG59ICJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJHRVQiLCJyZXF1ZXN0Iiwic2VhcmNoUGFyYW1zIiwiVVJMIiwidXJsIiwiY29kZSIsImdldCIsImVycm9yIiwicmVkaXJlY3QiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfQkFTRV9VUkwiLCJ0b2tlblJlc3BvbnNlIiwiZmV0Y2giLCJtZXRob2QiLCJoZWFkZXJzIiwiYm9keSIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbGllbnRfaWQiLCJTVFJBVkFfQ0xJRU5UX0lEIiwiY2xpZW50X3NlY3JldCIsIlNUUkFWQV9DTElFTlRfU0VDUkVUIiwiZ3JhbnRfdHlwZSIsInRva2VuRGF0YSIsImpzb24iLCJvayIsImNvbnNvbGUiLCJhY2Nlc3NfdG9rZW4iLCJyZWZyZXNoX3Rva2VuIiwiZXhwaXJlc19hdCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/strava/callback/route.js\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&page=%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute.js&appDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&page=%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute.js&appDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_danielbuenofernandez_stravapp_app_api_auth_strava_callback_route_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/strava/callback/route.js */ \"(rsc)/./app/api/auth/strava/callback/route.js\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/strava/callback/route\",\n        pathname: \"/api/auth/strava/callback\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/strava/callback/route\"\n    },\n    resolvedPagePath: \"/Users/danielbuenofernandez/stravapp/app/api/auth/strava/callback/route.js\",\n    nextConfigOutput,\n    userland: _Users_danielbuenofernandez_stravapp_app_api_auth_strava_callback_route_js__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGc3RyYXZhJTJGY2FsbGJhY2slMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkZzdHJhdmElMkZjYWxsYmFjayUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkZzdHJhdmElMkZjYWxsYmFjayUyRnJvdXRlLmpzJmFwcERpcj0lMkZVc2VycyUyRmRhbmllbGJ1ZW5vZmVybmFuZGV6JTJGc3RyYXZhcHAlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGZGFuaWVsYnVlbm9mZXJuYW5kZXolMkZzdHJhdmFwcCZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDMEI7QUFDdkc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9kYW5pZWxidWVub2Zlcm5hbmRlei9zdHJhdmFwcC9hcHAvYXBpL2F1dGgvc3RyYXZhL2NhbGxiYWNrL3JvdXRlLmpzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9hdXRoL3N0cmF2YS9jYWxsYmFjay9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2F1dGgvc3RyYXZhL2NhbGxiYWNrXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9hdXRoL3N0cmF2YS9jYWxsYmFjay9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9kYW5pZWxidWVub2Zlcm5hbmRlei9zdHJhdmFwcC9hcHAvYXBpL2F1dGgvc3RyYXZhL2NhbGxiYWNrL3JvdXRlLmpzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&page=%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute.js&appDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&page=%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fstrava%2Fcallback%2Froute.js&appDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdanielbuenofernandez%2Fstravapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();