import * as esbuild from 'esbuild';
import path from 'path';

// External dependencies that will be loaded via CDN in the HTML shell
// External dependencies that will be loaded via ESM import maps
const EXTERNAL_DEPS = [
  'react',
  'react-dom',
  'react-dom/client',
  'react-router-dom',
  'lucide-react',
  '@supabase/supabase-js',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

/**
 * Normalizes a relative import path against the current file's path
 * in the virtual filesystem.
 */
function resolveVirtualPath(importer: string, importee: string): string {
  if (importee.startsWith('.')) {
    // Relative import: resolve against importer's directory
    const dir = path.posix.dirname(importer);
    const resolved = path.posix.normalize(path.posix.join(dir, importee));
    return resolved;
  }
  return importee;
}

/**
 * Try to find a file in the virtual filesystem by trying common extensions
 */
function findInFiles(
  files: Record<string, string>,
  basePath: string
): { path: string; content: string } | null {
  const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js'];
  for (const ext of extensions) {
    const candidate = basePath + ext;
    if (files[candidate] !== undefined) {
      return { path: candidate, content: files[candidate] };
    }
    // Also try without leading slash
    const candidateNoSlash = candidate.startsWith('/') ? candidate.slice(1) : '/' + candidate;
    if (files[candidateNoSlash] !== undefined) {
      return { path: candidateNoSlash, content: files[candidateNoSlash] };
    }
  }
  return null;
}

/**
 * Creates an esbuild virtual filesystem plugin that resolves imports
 * from an in-memory files map instead of the real disk.
 */
function createVirtualPlugin(files: Record<string, string>): esbuild.Plugin {
  return {
    name: 'virtual-fs',
    setup(build) {
      // All imports go through this resolve step first
      build.onResolve({ filter: /.*/ }, (args) => {
        const dep = args.path;

        // External deps → skip bundling, will be loaded via import map
        if (EXTERNAL_DEPS.includes(dep)) {
          return { path: dep, external: true };
        }

        // CSS imports → intercept and return as 'css-stub' namespace
        if (dep.endsWith('.css')) {
          const resolved = dep.startsWith('.') ? resolveVirtualPath(args.importer, dep) : dep;
          return { path: resolved, namespace: 'css-stub' };
        }

        // Entry point
        if (args.namespace === 'entrypoint') {
          return { path: dep, namespace: 'virtual' };
        }

        // Relative imports from virtual files
        if (dep.startsWith('.')) {
          const resolved = resolveVirtualPath(args.importer, dep);
          const found = findInFiles(files, resolved);
          if (found) {
            return { path: found.path, namespace: 'virtual' };
          }
          // Not found → resolve as external gracefully
          return { path: dep, external: true };
        }

        // Absolute virtual paths like /src/App.tsx
        if (dep.startsWith('/')) {
          const found = findInFiles(files, dep);
          if (found) {
            return { path: found.path, namespace: 'virtual' };
          }
        }

        // Unknown external
        return { path: dep, external: true };
      });



      // CSS stub: return an empty JS module so esbuild doesn't crash
      build.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({
        contents: '// CSS injected as <style> tag',
        loader: 'js',
      }));

      // Load virtual files from memory
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
        const found = findInFiles(files, args.path);
        if (found) {
          const ext = found.path.split('.').pop() || 'tsx';
          // CSS files should have been caught by css-stub above, but just in case:
          if (ext === 'css') {
            return { contents: '// CSS injected as <style> tag', loader: 'js' };
          }
          const loaderMap: Record<string, esbuild.Loader> = {
            tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js', json: 'json',
          };
          return {
            contents: found.content,
            loader: loaderMap[ext] || 'tsx',
          };
        }
        return { contents: '', loader: 'tsx' };
      });
    },
  };
}

export interface BundleResult {
  html: string;
  error?: string;
}

/**
 * Bundles the project files using esbuild and returns a complete HTML document.
 * All React/router/lucide deps are loaded via CDN and NOT bundled.
 */
export async function bundleProject(
  files: Record<string, string>
): Promise<BundleResult> {
  // Find the entry point
  const entryFile =
    Object.keys(files).find((f) => f === '/src/index.tsx') ||
    Object.keys(files).find((f) => f.endsWith('/index.tsx')) ||
    Object.keys(files).find((f) => f === '/src/App.tsx');

  if (!entryFile) {
    return {
      html: buildErrorHtml('No se encontró el archivo de entrada (index.tsx o App.tsx).'),
      error: 'No entry file found',
    };
  }

  try {
    const result = await esbuild.build({
      entryPoints: [{ in: entryFile, out: 'bundle' }],
      bundle: true,
      write: false,
      format: 'esm',
      jsx: 'automatic',
      jsxImportSource: 'react',
      target: ['es2020'],
      plugins: [createVirtualPlugin(files)],
      external: EXTERNAL_DEPS,
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      logLevel: 'silent',
    });

    if (result.errors.length > 0) {
      const errorText = result.errors.map((e) => e.text).join('\n');
      return { html: buildErrorHtml(errorText), error: errorText };
    }

    const bundleCode = result.outputFiles?.[0]?.text || '';

    return { html: buildSuccessHtml(bundleCode, files) };
  } catch (err: any) {
    const message = err?.message || String(err);
    // Try to format esbuild errors nicely
    const errors: esbuild.Message[] = err?.errors || [];
    const formatted = errors.length > 0
      ? errors.map((e) => `${e.location?.file || ''}:${e.location?.line || ''} — ${e.text}`).join('\n')
      : message;
    return { html: buildErrorHtml(formatted), error: formatted };
  }
}

/**
 * Generates the full HTML document with CDN deps loaded before the bundle.
 * All CSS files are collected from the virtual filesystem and injected as <style> tags.
 */
function buildSuccessHtml(bundleCode: string, files: Record<string, string>): string {
  // Collect all CSS files from the virtual filesystem and inject as <style> tags
  const cssContents = Object.entries(files)
    .filter(([path]) => path.endsWith('.css'))
    .map(([, content]) => content)
    .join('\n');

  const styleTag = cssContents ? `<style>\n${cssContents}\n</style>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bolbia Preview</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- ESM Import Map -->
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "react-router-dom": "https://esm.sh/react-router-dom@6.22.3?deps=react@18.3.1",
      "lucide-react": "https://esm.sh/lucide-react@0.344.0?deps=react@18.3.1",
      "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.45.1?deps=react@18.3.1",
      "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
      "react/jsx-dev-runtime": "https://esm.sh/react@18.3.1/jsx-dev-runtime",
      "class-variance-authority": "https://esm.sh/class-variance-authority@0.7.0?deps=react@18.3.1",
      "clsx": "https://esm.sh/clsx@2.1.1",
      "tailwind-merge": "https://esm.sh/tailwind-merge@2.5.2"
    }
  }
  </script>
  ${styleTag}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // System-wide Global Setup
    window.process = { env: { NODE_ENV: 'development' } };
    window.global = window;

    // --- SMART HEALING 2.0: Console & Logic Interception ---
    var _errorSent = false;
    var notifyParent = function(msg) {
        if (_errorSent) return;
        _errorSent = true;
        window.parent.postMessage({ type: 'sandpack-error', error: msg }, '*');
    };

    // Proxy console.error to catch logic failures (e.g. database errors)
    var originalConsoleError = console.error;
    console.error = function() {
        var args = Array.prototype.slice.call(arguments);
        originalConsoleError.apply(console, args);
        var msg = args.map(function(arg) { 
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); 
        }).join(' ');
        
        var rootElement = document.getElementById('root');
        var hasRendered = rootElement && rootElement.innerHTML.trim().length > 0;
        
        if (msg.toLowerCase().indexOf('error') !== -1 || msg.toLowerCase().indexOf('fail') !== -1) {
            if (!hasRendered) {
                notifyParent('[Consola] ' + msg);
            } else {
                notifyParent('[Aviso] ' + msg);
            }
        }
    };

    // Global helper for AI to report its own logical "soft" errors
    window.reportBolbiaError = function(msg) {
        notifyParent('[Logic] ' + msg);
    };

${bundleCode}

    // If we reach this point without throwing, the app loaded successfully
    window.parent.postMessage({ type: 'sandpack-error-cleared' }, '*');
  </script>
  <script>
    // Error boundary for runtime errors — notify parent for Auto-Healing
    window.addEventListener('error', function(e) {
      var msg = e.message || String(e);
      document.getElementById('root').innerHTML = buildErrorPanel(msg);
      if (typeof notifyParent === 'function') notifyParent(msg);
      else window.parent.postMessage({ type: 'sandpack-error', error: msg }, '*');
    });
    window.addEventListener('unhandledrejection', function(e) {
      var msg = String(e.reason);
      document.getElementById('root').innerHTML = buildErrorPanel(msg);
      if (typeof notifyParent === 'function') notifyParent(msg);
      else window.parent.postMessage({ type: 'sandpack-error', error: msg }, '*');
    });
    function buildErrorPanel(msg) {
      return '<div style="padding:2rem;background:#1e1e2e;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;">' +
        '<div style="background:#2d1b28;border:1px solid #7f1d1d;border-radius:12px;padding:2rem;max-width:700px;width:100%;margin-top:3rem;">' +
        '<h2 style="color:#f87171;margin:0 0 1rem;font-size:1rem;font-family:monospace;">Error de ejecución</h2>' +
        '<pre style="color:#fca5a5;font-size:0.8rem;white-space:pre-wrap;font-family:monospace;margin:0;">' + msg + '</pre>' +
        '</div></div>';
    }
  </script>
</body>
</html>`;
}

/**
 * Generates a user-friendly error HTML page when bundling fails.
 */
function buildErrorHtml(errorText: string): string {
  const escaped = errorText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Error de compilación</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f0a18;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: system-ui, sans-serif;
    }
    .card {
      background: #1c0f2e;
      border: 1px solid #6d28d9aa;
      border-radius: 16px;
      padding: 2rem;
      max-width: 760px;
      width: 100%;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #7c3aed22;
      border: 1px solid #7c3aed66;
      color: #c4b5fd;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 99px;
      margin-bottom: 1rem;
    }
    h2 {
      color: #f0e6ff;
      font-size: 1.1rem;
      margin-bottom: 1.25rem;
    }
    pre {
      background: #0d0118;
      border: 1px solid #3b0764;
      border-radius: 8px;
      padding: 1.25rem;
      font-size: 0.78rem;
      color: #e879f9;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.6;
      max-height: 350px;
      overflow-y: auto;
    }
    .hint {
      margin-top: 1.25rem;
      font-size: 0.78rem;
      color: #7c3aed;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">⚡ Error de compilación — esbuild</div>
    <h2>No se pudo compilar el proyecto</h2>
    <pre>${escaped}</pre>
    <p class="hint">El asistente intentará corregirlo automáticamente...</p>
  </div>
  <script>
    // Notify parent frame so Auto-Healing kicks in
    window.parent.postMessage({ type: 'sandpack-error', error: ${JSON.stringify(errorText)} }, '*');
  </script>
</body>
</html>`;
}
