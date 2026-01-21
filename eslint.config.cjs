module.exports = [
    {
        ignores: ['dist/', 'node_modules/', 'coverage/', 'tmp/', 'bin/**'],
    },

    {
        files: ['**/*.ts', '**/*.mts'],
        languageOptions: {
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
        },
        rules: {},
    },
];