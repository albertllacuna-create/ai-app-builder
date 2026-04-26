/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#8b5cf6',
                    hover: '#7c3aed',
                    light: '#a78bfa',
                },
                danger: '#ef4444',
                success: '#10b981',
            }
        },
    },
    corePlugins: {
        preflight: false,
    },
    plugins: [],
}
