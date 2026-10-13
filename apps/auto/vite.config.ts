import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// @ordercloud/react-sdk ships an ESM dist that contains a stray CJS-only
// "default export hack":
//   typeof module == "object" && ... && (module.exports = Object.assign(module.exports.default, module.exports))
// In a real ESM runtime `module` is undefined, so the `typeof` guard makes this
// dead code. But Vite's @rollup/plugin-commonjs (transformMixedEsModules) sees
// the bare `module.exports` reference, injects a `module` shim, and the hack
// then runs against `module.exports.default === undefined` — throwing
// "Cannot convert undefined or null to object" at module init and producing a
// blank page in the production build (dev uses esbuild and is unaffected).
// This is the only bare top-level `module` reference in the dist, so stripping
// it keeps the file as valid ESM and stops the shim from being injected.
function stripOcReactSdkCjsHack(): Plugin {
  const hack =
    /typeof module\s*==\s*"object"\s*&&\s*typeof module\.exports\s*==\s*"object"\s*&&\s*\(module\.exports\s*=\s*Object\.assign\(module\.exports\.default,\s*module\.exports\)\);?/g;
  return {
    name: "strip-oc-react-sdk-cjs-hack",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("@ordercloud/react-sdk")) return null;
      const fixed = code.replace(hack, "");
      return fixed === code ? null : { code: fixed, map: null };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [stripOcReactSdkCjsHack(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3002,
  },
});
