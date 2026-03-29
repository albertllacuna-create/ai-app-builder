/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#8b5cf6',
                danger: '#ef4444',
            }
        },
    },
    corePlugins: {
        preflight: false,
    },
    plugins: [],
}
