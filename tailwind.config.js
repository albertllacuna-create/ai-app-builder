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
                    DEFAULT: '#f59e0b', // amber-500
                    hover: '#d97706',   // amber-600
                    light: '#fde68a',   // amber-200
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
