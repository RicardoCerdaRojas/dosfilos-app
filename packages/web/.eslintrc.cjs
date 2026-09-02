module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
    ],
    // `public/pdfjs` son activos GENERADOS: los copia `predev`/`prebuild` desde
    // pdfjs-dist (ver scripts/copy-pdfjs-assets.mjs). Son 198 archivos con JS
    // minificado, y sin esta regla cualquiera que corra la app y después
    // `npm run lint` se encuentra ~1.000 errores en código que no escribió.
    ignorePatterns: ['dist', '.eslintrc.cjs', 'public/pdfjs'],
    parser: '@typescript-eslint/parser',
    plugins: ['react-refresh'],
    rules: {
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
        ],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        'prefer-const': 'off',
        'react-hooks/exhaustive-deps': 'off',
        // 'warn' Y NO 'off': se ve en el editor mientras se escribe. Quien la
        // EXIGE es `scripts/check-react-hooks.sh`, con trinquete por archivo —
        // acá en 'error' bloquearía por 38 violaciones viejas y alguien la
        // volvería a apagar, que es exactamente cómo llegamos al crash de
        // `StepDraft` al regenerar.
        'react-hooks/rules-of-hooks': 'warn',
        'no-case-declarations': 'off',
        'no-useless-escape': 'off',
        'no-misleading-character-class': 'off',
    },
}
