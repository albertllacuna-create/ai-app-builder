import sdk from '@stackblitz/sdk';

export const exportService = {
    openInStackBlitz: (title: string, files: Record<string, string>) => {
        // Mapear los archivos eliminando el '/' inicial porque StackBlitz requiere rutas relativas
        const stackblitzFiles: Record<string, string> = {};

        // Asignamos los archivos asegurando que las rutas no empiezan por /
        Object.entries(files).forEach(([path, content]) => {
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            stackblitzFiles[cleanPath] = content;
        });

        // Incluimos siempre un package.json por defecto si no existe
        if (!stackblitzFiles['package.json']) {
            stackblitzFiles['package.json'] = JSON.stringify({
                name: "mayson-generated-app",
                version: "0.0.0",
                private: true,
                dependencies: {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "lucide-react": "^0.344.0"
                },
                scripts: {
                    "start": "react-scripts start",
                    "build": "react-scripts build",
                    "test": "react-scripts test",
                    "eject": "react-scripts eject"
                }
            }, null, 2);
        }

        sdk.openProject({
            title: title || 'Mayson Project',
            description: 'Created with Mayson AI Builder',
            template: 'create-react-app',
            files: stackblitzFiles
        }, {
            openAs: 'newWindow'
        });
    }
};
