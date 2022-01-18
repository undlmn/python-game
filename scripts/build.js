import { copyFile, readFile, writeFile } from "fs/promises";
import { minify } from "terser";

for (const filename of [
  "index.html",
  "sw.js",
  "python.dat",
  "favicon.ico",
  "favicon.svg",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "apple-touch-icon.png",
  "browserconfig.xml",
  "mstile-144x144.png",
  "mstile-150x150.png",
  "mstile-310x150.png",
  "mstile-310x310.png",
  "mstile-70x70.png",
  "site.webmanifest",
]) {
  await copyFile(
    new URL(`../src/${filename}`, import.meta.url),
    new URL(`../build/${filename}`, import.meta.url)
  );
}

const src = await readFile(new URL("../src/python.js", import.meta.url), {
  encoding: "utf8",
});

const { code } = await minify(
  src
    .replace('"use strict";', "")
    .replace(/canvas(\.|,)/g, "canvas_$1")
    .replace(/update(\(|,)/g, "update_$1")
    .replace(/step(:|;)/g, "step_$1")
    .replace(/\.head =/g, ".head_ ="),
  {
    mangle: {
      properties: true,
    },
  }
);

await writeFile(new URL("../build/python.js", import.meta.url), code);
