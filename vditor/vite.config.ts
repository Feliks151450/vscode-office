import { cpSync, existsSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, type Plugin } from "vite";
import pkg from "./package.json";

const resourceMarkdownDir = resolve(__dirname, "../resource/markdown");
const localLuteDir = resolve(__dirname, "../test/output/lute");
const resourceLuteDir = resolve(resourceMarkdownDir, "dist/js/lute");
const staticBase = resolve(__dirname, "src");

function copyLocalLuteOverride() {
  if (!existsSync(localLuteDir)) {
    return;
  }
  mkdirSync(resourceLuteDir, { recursive: true });
  cpSync(localLuteDir, resourceLuteDir, { recursive: true });
}

function copyBuildToResource(): Plugin {
  return {
    name: "copy-build-to-resource",
    closeBundle() {
      cpSync(
        resolve(__dirname, "dist"),
        resolve(resourceMarkdownDir, "dist"),
        { recursive: true },
      );
      copyLocalLuteOverride();
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    define: {
      VDITOR_VERSION: JSON.stringify(pkg.version),
    },
    server: {
      port: 3135,
      host: "0.0.0.0",
      fs: {
        allow: [resolve(__dirname, "..")],
      },
    },
    build: {
      outDir: "dist",
      cssMinify: "esbuild",
      minify: mode === "production",
      target: "es2015",
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["umd"],
        name: "Vditor",
        fileName: () => "index.min.js",
      },
      rolldownOptions: {
        output: {
          exports: "default",
          assetFileNames: "index.css",
        },
      },
    },
    plugins: [
      {
        name: "serve-vditor-static",
        enforce: "pre",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || "";
            const prefixes = ["/dist/js/i18n/", "/dist/css/", "/dist/js/lute/", "/dist/js/mathjax/"];
            if (!prefixes.some((p) => url.startsWith(p))) {
              return next();
            }
            const relativePath = url.replace(/^\/dist\//, "");
            const filePath = resolve(staticBase, relativePath);
            if (!existsSync(filePath) || !filePath.startsWith(staticBase)) {
              res.statusCode = 404;
              res.end("Not found");
              return;
            }
            try {
              const data = readFileSync(filePath);
              const ext = filePath.split(".").pop();
              const mime: Record<string, string> = {
                js: "application/javascript",
                css: "text/css",
                map: "application/json",
              };
              res.setHeader("Content-Type", mime[ext || ""] || "application/octet-stream");
              res.setHeader("Cache-Control", "no-cache");
              res.end(data);
            } catch {
              res.statusCode = 404;
              res.end("Not found");
            }
          });
        },
      },
      copyBuildToResource(),
    ],
  };
});
