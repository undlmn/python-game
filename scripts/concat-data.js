import { readFile, writeFile } from "fs/promises";

let offset = 0;

console.log("Map:");
const map = parseMap(
  JSON.parse(await readFile(new URL("../src/map.json", import.meta.url)))
);
offset += map.length;

console.log("Set:");
const set = await readFile(new URL("../src/set.gif", import.meta.url));
console.log(`> offset, length: ${offset}, ${set.length}`);
offset += set.length;

console.log("Samples:");
let i = 0;
const samples = [];
for (const filename of [
  "music-intro.mp3",
  "music-part-1.mp3",
  "music-part-2.mp3",
  "music-part-3.mp3",
  "jump.mp3",
  "eat.mp3",
  "complete.mp3",
  "die.mp3",
  "game-over.mp3",
]) {
  const content = await readFile(
    new URL(`../src/samples/${filename}`, import.meta.url)
  );
  samples.push(content);
  console.log(
    `> ${i++}. [${filename}] offset, end: ${offset}, ${(offset +=
      content.length)}`
  );
}

await writeFile(
  new URL("../src/python.dat", import.meta.url),
  concat(map, set, ...samples)
);
console.log("done.");

function parseMap(json) {
  const name = (name) => (item) => item.name == name;
  const groupName = (name) => (item) =>
    item.type == "group" && item.name == name;

  const title = json.layers.find(groupName("Title Screen"));

  const layers = [
    title.layers.find(name("Record")),
    title.layers.find(name("Score")),
    title.layers.find(name("Title")),
    title.layers.find(name("Annotation - line 1")),
    title.layers.find(name("Annotation - line 2")),
    json.layers.find(name("Playground")),
    json.layers.find(name("Game Over")),
    json.layers.find(name("Carrots - Level 1")),
    json.layers.find(name("Carrots - Level 2")),
    json.layers.find(name("Carrots - Level 3")),
    json.layers.find(name("Carrots - Level 4")),
  ];

  const data = [];
  let offset = 0;
  layers.forEach((layer) => {
    console.log(
      `> [${layer.name}] offset, x, y, w, h: ${offset}, ${layer.x}, ${layer.y}, ${layer.width}, ${layer.height} (${layer.data.length} bytes)`
    );
    offset += layer.data.length;
    data.push(...layer.data.map((n) => n && n - 1));
  });

  return new Uint8Array(data);
}

function concat(...arrs) {
  const res = new Uint8Array(arrs.reduce((len, arr) => len + arr.length, 0));
  let pos = 0;
  for (const arr of arrs) {
    res.set(arr, pos);
    pos += arr.length;
  }
  return res;
}
