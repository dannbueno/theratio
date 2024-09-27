module.exports = {
    // Otras configuraciones de Webpack...
    resolve: {
        fallback: {
            "path": require.resolve("path-browserify")
        }
    }
};
