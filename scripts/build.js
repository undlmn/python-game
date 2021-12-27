import { copyFile, readFile, writeFile } from "fs/promises";
import { minify } from "terser";

for (const filename of ["favicon.ico", "index.html", "python.dat"]) {
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
