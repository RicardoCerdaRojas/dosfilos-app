/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    darkMode: "class",
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#1754cf",
                "background-primary": "#0b1120", // Premium Navy
                "background-secondary": "#111621",
                "surface-primary": "#1c2433",
                "surface-secondary": "#080c14",
                "border-primary": "rgba(255, 255, 255, 0.05)",
                "academic-gold": "#c5a059",
                "academic-beige": "#f5f5dc",
                "accent-gold": "#b59410",
                "navy-muted": "#1e293b",
                // Light mode aliases if needed specifically
                "background-light": "#f6f6f8",
            },
            fontFamily: {
                lexend: ["Lexend"],
            },
        },
    },
    plugins: [],
}
