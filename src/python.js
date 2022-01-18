"use strict";

(async () => {
  const [canvas, data] = await Promise.all([
    getElementById("python"),
    loadData([...document.querySelectorAll("script")].pop().dataset.url),
  ]);

  let updates = [];
  const [screen, overlay] = Screen({
    canvas,
    w: 36,
    h: 28,
    imgSet: await createImg(new Uint8Array(data, 1945, 2956), "image/gif"),
    update(n) {
      for (let i = 0; i < updates.length; i++) {
        const item = updates[i];
        if (item.skip) {
          item.skip--;
        } else {
          item.update(n);
          item.skip = item.step;
        }
      }
    },
  });

  let keyboard;
  listenKeyboard((event) => {
    if (keyboard) {
      const key = keyboard.keys.indexOf(event.code);
      const callback = event.type[3] == "d" ? keyboard.down : keyboard.up;
      if (~key && callback) {
        callback(key);
        event.preventDefault();
      }
    }
  });

  let touch;
  let touchStartX;
  let touchStartY;
  let touchMoveDir = -1;
  listenTouch((event) => {
    event.preventDefault();
    const t = event.type[5];
    touchMoveDir = -1;
    const x = event.touches[0]?.pageX;
    const y = event.touches[0]?.pageY;
    if (t == "s") {
      touchStartX = x;
      touchStartY = y;
    }
    if (t == "m") {
      const dx = touchStartX - x;
      const dy = touchStartY - y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx > 9 || ady > 9) {
        touchMoveDir = adx > ady ? (dx > 0 ? 3 : 1) : dy > 0 ? 0 : 2;
      }
    }
    if (touch) {
      const callback =
        t == "s" ? touch.start : t == "m" ? touch.move : touch.end;
      callback?.(x, y);
    }
  });

  const indexAt = (x, y) => y * 36 + x;

  function printMap(layer, offset, x, y, w, h) {
    for (let i = 0; i < h; i++) {
      new Uint8Array(layer.buffer, indexAt(x, y + i), 36 - x).set(
        new Uint8Array(data, w * i + offset, w)
      );
    }
  }

  function printNum(layer, num, x, y, pad = 6) {
    `      ${num}`.slice(-pad).split``.forEach(
      (c, i) => (layer[indexAt(x, y) + i] = c == " " ? 0 : c.charCodeAt())
    );
  }

  function merge(...layers) {
    for (let i = 1008; i--; ) {
      screen[i] = layers.map((l) => l[i]).reduceRight((a, c) => c || a);
    }
  }

  function disableAll() {
    updates = [];
    keyboard = null;
    touch = null;
    overlay.head = null;
    overlay.merge = false;
  }

  function storageGet(key) {
    return localStorage.getItem(`python_${key}`);
  }

  function storageSet(key, value) {
    return localStorage.setItem(`python_${key}`, value);
  }

  let topScore = +storageGet("topScore") || 500;
  let score = +storageGet("lastScore") || 0;
  function addScore(amount) {
    score += amount;
    storageSet("lastScore", score);
    if (topScore < score) {
      topScore = score;
      storageSet("topScore", topScore);
    }
  }

  let audioContext;
  let audioOut;
  let samplesData = [];
  async function startAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      audioContext.resume();

      let offset = 4901;
      for (const next of [
        34480, 65420, 117242, 203649, 205945, 208919, 256509, 292880, 400963,
      ]) {
        samplesData.push(
          await audioContext.decodeAudioData(data.slice(offset, next))
        );
        offset = next;
      }

      audioOut = audioContext.createGain();
      audioOut.connect(audioContext.destination);
      audioOut.gain.value = 0.1;
    }
  }

  function playSample(n, destination) {
    const source = audioContext.createBufferSource();
    source.buffer = samplesData[n];
    source.connect(destination || audioOut);
    source.start();
    return new Promise((resolve) => (source.onended = resolve));
  }

  function playMusic() {
    const gainNode = audioContext.createGain();
    gainNode.connect(audioOut);
    gainNode.gain.value = 0.6;
    let play = true;
    (async () => {
      const sequence = [3, 3, 2, 1, 1, 2, 1, 1, 0];
      for (let i = 9; play; i || (i = 8)) {
        await playSample(sequence[--i], gainNode);
      }
    })();
    return () => {
      play = false;
      gainNode.gain.value = 0;
    };
  }

  // RUN
  titleScreen();

  //
  // -------------------------------------------------------------------
  //

  async function titleScreen() {
    disableAll();
    screen.fill(0);
    await delay(50);

    printMap(screen, 0, 9, 4, 6, 1);
    printMap(screen, 6, 21, 4, 4, 1);
    printMap(screen, 10, 8, 10, 20, 5);
    printMap(screen, 110, 10, 20, 15, 1);
    printMap(screen, 125, 10, 22, 15, 1);

    printNum(screen, topScore, 8, 6);
    printNum(screen, score, 19, 6);

    keyboard = {
      keys: ["Space"],
      down: game,
    };
    touch = {
      end: game,
    };
  }

  //
  // -------------------------------------------------------------------
  //

  async function game() {
    disableAll();
    await startAudio();

    let level = 0;
    let lives = 3;
    score = 0;
    play();

    async function play() {
      disableAll();
      screen.fill(0);
      await delay(500);

      const stopMusic = playMusic();

      const backgroundLayer = new Uint8Array(1008);
      backgroundLayer.fill(1);
      printMap(backgroundLayer, 140, 2, 2, 32, 24);
      printNum(backgroundLayer, lives, 17, 25, 3);

      const carrotsLayer = new Uint8Array(1008);
      printMap(carrotsLayer, 921 + 256 * level, 9, 5, 16, 16);

      let key = -1;
      let heldKeys = [];
      keyboard = {
        keys: ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Escape"],

        down(k) {
          key = k;
          heldKeys.includes(k) || heldKeys.push(k);
        },

        up(k) {
          heldKeys = heldKeys.filter((item) => item != k);
          if (key == k) {
            key = heldKeys.length ? heldKeys[heldKeys.length - 1] : -1;
          }
        },
      };

      //------------------------------
      // Rabbits
      //
      const rabbitsLayer = new Uint8Array(1008);

      const rabbits = [
        { x: 23, y: 12, turned: rand(2), idle: 128 + rand(3) * 36 },
        { x: 8, y: 5, turned: rand(2), idle: 125 + rand(3) * 36 },
        { x: 11, y: 17, turned: rand(2), idle: 124 + rand(3) * 36 },
        { x: 18, y: 12, turned: rand(2), idle: 123 + rand(3) * 36 },
        { x: 17, y: 5, turned: rand(2), idle: 120 + rand(3) * 36 },
        { x: 8, y: 10, turned: rand(2), idle: 119 + rand(3) * 36 },
        { x: 22, y: 6, turned: rand(2), idle: 114 + rand(3) * 36 },
        { x: 17, y: 17, turned: rand(2), idle: 113 + rand(3) * 36 },
        { x: 12, y: 12, turned: rand(2), idle: 111 + rand(3) * 36 },
        { x: 12, y: 8, turned: rand(2), idle: 108 + rand(3) * 36 },
      ];
      let rabbitsLeft = rabbits.length;

      const isPythonsHeadNearby = (x, y) => {
        const dx = pythonX - x;
        const dy = pythonY - y;
        return (
          (dx == 0 && inRange(dy, -2, 1)) ||
          (inRange(dy, -1, 0) && inRange(dx, -1, 1))
        );
      };

      const cannotRabbitBeAt = (i, x, y) => {
        for (let j = 0; j < rabbitsLeft; j++) {
          if (i == j) continue;
          if (x == rabbits[j].x && inRange(y - rabbits[j].y, -1, 1)) {
            return true;
          }
        }
        const a = indexAt(x, y - 1);
        const b = indexAt(x, y);
        return (
          backgroundLayer[a] != 1 ||
          backgroundLayer[b] != 1 ||
          pythonLayer[a] ||
          pythonLayer[b] ||
          (x == pythonX && inRange(y - pythonY, 0, 1))
        );
      };

      updates.push({
        update() {
          rabbitsLayer.fill(0);

          for (let i = 0; i < rabbitsLeft; i++) {
            const rabbit = rabbits[i];
            let { x, y } = rabbit;

            if (rabbit.eats) {
              rabbit.eats--;
            } else {
              if (
                rabbit.idle < 102 &&
                !rand(6) && // Degree of dullness
                isPythonsHeadNearby(x, y)
              ) {
                rabbit.idle = 0;
              }

              if (rabbit.idle) {
                // Standing still
                rabbit.idle--;
              } else if (
                carrotsLayer[indexAt(x, y)] &&
                !isPythonsHeadNearby(x, y)
              ) {
                // Eats
                carrotsLayer[indexAt(x, y)] = 0;
                rabbit.eats = 204;
                rabbit.idle = 108;
                rabbit.turned = !rabbit.turned;
              } else {
                // Jumps
                const toCarrotJumps = [];
                const toCarrotAboveJumps = [];
                const safeJumps = [];
                const otherJumps = [];

                for (let dy = -1; dy < 2; dy++) {
                  for (let dx = -1; dx < 2; dx++) {
                    const jx = x + dx;
                    const jy = y + dy;

                    if (!(dx || dy) || cannotRabbitBeAt(i, jx, jy)) continue;

                    if (isPythonsHeadNearby(jx, jy)) {
                      otherJumps.push([dx, dy]);
                    } else if (carrotsLayer[indexAt(jx, jy)]) {
                      toCarrotJumps.push([dx, dy]);
                    } else if (carrotsLayer[indexAt(jx, jy - 1)]) {
                      toCarrotAboveJumps.push([dx, dy]);
                    } else {
                      safeJumps.push([dx, dy]);
                    }
                  }
                }

                const jumps = toCarrotJumps.length
                  ? toCarrotJumps
                  : toCarrotAboveJumps.length
                  ? toCarrotAboveJumps
                  : safeJumps.length
                  ? safeJumps
                  : otherJumps;
                const jumpsCount = jumps.length;

                if (jumpsCount) {
                  const [dx, dy] = jumps[rand(jumpsCount)];
                  rabbit.x = x += dx;
                  rabbit.y = y += dy;
                  rabbit.turned = dx > 0 ? 0 : dx < 0 ? 1 : +(dy > 0);
                  playSample(4);
                } else {
                  rabbit.turned = rand(2);
                }

                rabbit.idle = 107;
              }
            }

            // Draw rabbit
            const { turned, idle } = rabbit;
            rabbitsLayer[indexAt(x, y - 1)] =
              96 +
              (rabbit.eats
                ? 2 + turned + ((rabbit.eats / 5) & 1 ? 2 : 0)
                : idle > 107 || (idle / 18) & 1
                ? turned
                : !turned);
            rabbitsLayer[indexAt(x, y)] = 112 + turned + (rabbit.eats ? 2 : 0);
          }
        },
      });

      //------------------------------
      // Python
      //
      const pythonLayer = new Uint8Array(1008);
      const python = [
        141, 141, 141, 141, 141, 141, 141, 141, 141, 141, 141, 141, 141, 141,
        141, 141, 141, 141, 141, 141, 141, 133,
      ];

      let pythonX = 27;
      let pythonY = 21;
      let pythonBodyX = pythonX;
      let pythonBodyY = pythonY;
      let pythonMove = 0;
      let pythonNext;
      let pythonEats;
      let pythonIsGrowing;
      let pythonPoisoned;

      const canPythonMoveTo = (x, y) =>
        backgroundLayer[indexAt(x, y)] == 1 && !pythonLayer[indexAt(x, y)];

      const pythonCheckEdible = () => {
        for (let i = 0; i < rabbitsLeft; i++) {
          if (
            pythonX == rabbits[i].x &&
            inRange(rabbits[i].y - pythonY, 0, 1)
          ) {
            pythonEats = true;
            rabbits.splice(i, 1);
            rabbitsLeft--;
            carrotsLayer[indexAt(pythonX, pythonY)] = 0;
            addScore(100);
            time += 8;
            break;
          }
        }
        if (carrotsLayer[indexAt(pythonX, pythonY)]) {
          pythonEats = true;
          pythonPoisoned = true;
          carrotsLayer[indexAt(pythonX, pythonY)] = 0;
        }
        pythonEats && playSample(5);
      };

      updates.push({
        update() {
          if (!pythonMove) {
            if (pythonPoisoned || timeIsUp || key == 4) return die();
            if (!rabbitsLeft) return levelComplete();

            // keyboard: ArrowUp
            if (
              (key == 0 || touchMoveDir == 0) &&
              canPythonMoveTo(pythonX, pythonY - 1)
            ) {
              const d = python[0] & 12;
              if (d == 4) python[0] = 132;
              if (d == 8) python[0] = 136;
              if (d == 12) python[0] = 140;
              pythonY--;
              pythonNext = 136;
              pythonMove = 12;
              pythonCheckEdible();
            }

            // keyboard: ArrowRight
            if (
              (key == 1 || touchMoveDir == 1) &&
              canPythonMoveTo(pythonX + 1, pythonY)
            ) {
              const d = python[0] & 12;
              if (d == 0) python[0] = 129;
              if (d == 8) python[0] = 137;
              if (d == 12) python[0] = 141;
              pythonX++;
              pythonNext = 141;
              pythonMove = 12;
              pythonCheckEdible();
            }

            // keyboard: ArrowDown
            if (
              (key == 2 || touchMoveDir == 2) &&
              canPythonMoveTo(pythonX, pythonY + 1)
            ) {
              const d = python[0] & 12;
              if (d == 0) python[0] = 130;
              if (d == 4) python[0] = 134;
              if (d == 12) python[0] = 142;
              pythonY++;
              pythonNext = 130;
              pythonMove = 12;
              pythonCheckEdible();
            }

            // keyboard: ArrowLeft
            if (
              (key == 3 || touchMoveDir == 3) &&
              canPythonMoveTo(pythonX - 1, pythonY)
            ) {
              const d = python[0] & 12;
              if (d == 0) python[0] = 131;
              if (d == 4) python[0] = 135;
              if (d == 8) python[0] = 139;
              pythonX--;
              pythonNext = 135;
              pythonMove = 12;
              pythonCheckEdible();
            }
          }

          if (pythonMove == 1) {
            python.unshift(pythonNext);
            pythonBodyX = pythonX;
            pythonBodyY = pythonY;

            if (!pythonIsGrowing) {
              python.pop();
              const last = python.length - 1;
              const d = python[last] & 3;
              if (d == 0) python[last] = 128;
              if (d == 1) python[last] = 133;
              if (d == 2) python[last] = 138;
              if (d == 3) python[last] = 143;
            }

            pythonIsGrowing = pythonEats;
            pythonEats = false;
          }

          const moveFrame =
            pythonMove > 1 ? 3 - (((pythonMove - 2) / 3) | 0) : 0;

          // Draw pyphon's body
          pythonLayer.fill(0);
          let x = pythonBodyX;
          let y = pythonBodyY;
          python.forEach((p) => {
            pythonLayer[indexAt(x, y)] =
              p + (pythonIsGrowing ? 0 : moveFrame * 16);
            const d = p & 12;
            if (d == 0) y--;
            if (d == 4) x++;
            if (d == 8) y++;
            if (d == 12) x--;
          });

          // Draw python's head
          overlay.head = [
            208 + (python[0] & 3) + (pythonEats ? 8 : pythonPoisoned ? 4 : 0),
            (pythonBodyX - ((pythonBodyX - pythonX) * moveFrame) / 4) * 8,
            (pythonBodyY - ((pythonBodyY - pythonY) * moveFrame) / 4) * 8,
          ];

          pythonMove && pythonMove--;
        },
      });

      //------------------------------
      // Timer
      //
      let time = 73;
      let timeIsUp;
      updates.push({
        step: 25 - level * 5,
        update() {
          time ? time-- : (timeIsUp = true);
          for (let i = 0, j = 0; i < 9; i++, j = i * 8) {
            backgroundLayer[922 + i] =
              86 + (time < j ? 0 : time >= j + 8 ? 8 : time - j);
          }
        },
      });

      //------------------------------
      // Jumping fish
      //
      let fishFrame = 0;
      let fishY = 0;
      updates.push({
        step: 5,
        update() {
          if (fishFrame) {
            backgroundLayer[indexAt(30, 6 + fishY)] = 109 - fishFrame;
            fishFrame--;
          } else if (!rand(4)) {
            fishFrame = 5;
            fishY = rand(8);
          }
        },
      });

      //------------------------------
      // Waves on the water
      //
      const wavePoints = [714, 750, 751, 786, 787, 824, 860, 861, 897];
      let waveFrame = 2;
      updates.push({
        step: 7,
        update() {
          wavePoints.forEach((p) => (backgroundLayer[p] = 111 - waveFrame));
          if (!waveFrame--) waveFrame = 2;
        },
      });

      //------------------------------
      // Merge all
      //
      updates.push({
        update() {
          printNum(backgroundLayer, topScore, 3, 25);
          printNum(backgroundLayer, score, 10, 25);
          merge(pythonLayer, rabbitsLayer, carrotsLayer, backgroundLayer);
        },
      });

      //
      //------------------------------
      //

      function levelComplete() {
        stopMusic();

        disableAll();
        overlay.merge = true;

        const carrots = [];
        for (let i = 1008; i--; ) {
          carrotsLayer[i] && carrots.push(i);
        }

        updates = [
          {
            step: 2,
            async update() {
              if (carrots.length) {
                screen[carrots.pop()] = 1;
                addScore(5);
                printNum(screen, topScore, 3, 25);
                printNum(screen, score, 10, 25);
                playSample(4);
              } else {
                disableAll();
                await playSample(6);
                level++;
                level > 3 ? gameOver() : play();
              }
            },
          },
        ];
      }

      async function die() {
        stopMusic();

        keyboard = null;
        let even;
        let stop;
        updates = [
          {
            skip: 1,
            step: 2,
            update() {
              if (even && stop) return lives-- ? play() : gameOver();

              // Shimmering python's body
              let x = pythonX;
              let y = pythonY;
              python.forEach((p) => {
                screen[indexAt(x, y)] = p + (even ? 64 : 0);
                const d = p & 12;
                if (d == 0) y--;
                if (d == 4) x++;
                if (d == 8) y++;
                if (d == 12) x--;
              });

              // Shimmering python's head
              overlay.head = [
                208 +
                  (python[0] & 3) +
                  (pythonPoisoned ? 4 : 0) +
                  (even ? 16 : 0),
                pythonX * 8,
                pythonY * 8,
              ];

              even = !even;
            },
          },
        ];
        await playSample(7);
        stop = true;
      }
    }

    async function gameOver() {
      disableAll();
      overlay.merge = true;
      printMap(screen, 908, 12, 12, 13, 1);
      await playSample(8);
      titleScreen();
    }
  }

  //
  // -------------------------------------------------------------------
  //

  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
  }

  function listenKeyboard(handler) {
    const noPassive = { passive: false };
    listen(document, "keydown", handler, noPassive);
    listen(document, "keyup", handler, noPassive);
  }

  function listenTouch(handler) {
    const noPassive = { passive: false };
    listen(document, "touchstart", handler, noPassive);
    listen(document, "touchmove", handler, noPassive);
    listen(document, "touchend", handler, noPassive);
    listen(document, "touchcancel", handler, noPassive);
  }

  async function getElementById(id) {
    if (document.readyState == "loading") {
      await new Promise((resolve) =>
        listen(window, "DOMContentLoaded", resolve)
      );
    }
    return document.getElementById(id);
  }

  async function loadData(url) {
    const response = await fetch(url);
    return response.ok ? await response.arrayBuffer() : null;
  }

  async function createImg(data, type) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(new Blob([data], { type }));
    await new Promise((resolve) => listen(img, "load", resolve));
    return img;
  }

  function rand(n) {
    return n && Math.round(Math.random() * (n - 1));
  }

  function inRange(n, min, max) {
    return n >= min && n <= max;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function Screen({
    canvas,
    w, // screen width (chars)
    h, // screen height (chars)
    imgSet, // sprites (16x16 items)
    cW = 8, // sprite width
    cH = 8, // sprite height
    fps = 60, // frames per second
    mdf = 4, // maximum dropped frames
    update,
  }) {
    const sW = w * cW;
    const sH = h * cH;
    const frameTime = 1000 / fps;

    canvas.width = sW;
    canvas.height = sH;
    const context = canvas.getContext("2d");

    const sprites = [];
    context.clearRect(0, 0, sW, sH);
    context.drawImage(imgSet, 0, 0);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        sprites.push(context.getImageData(x * cW, y * cH, cW, cH));
      }
    }
    context.clearRect(0, 0, sW, sH);

    const renderedData = new Uint8Array(w * h);
    const data = new Uint8Array(w * h);
    const overlay = {};
    let underOverlay = [];

    const requestAnimationFrame = window.requestAnimationFrame;

    let nextFrameTime;
    function animationFrameHandler(timestamp) {
      let forceRender;
      if (!nextFrameTime) {
        nextFrameTime = timestamp + frameTime;
        forceRender = true;
      }

      let updatesCount = 0;
      while (nextFrameTime <= timestamp) {
        if (updatesCount > mdf) {
          nextFrameTime = timestamp + frameTime;
          updatesCount = 1;
          break;
        }
        nextFrameTime += frameTime;
        updatesCount++;
      }

      for (let i = updatesCount; i--; ) update(i);

      if (updatesCount || forceRender) {
        overlay.merge ||
          underOverlay
            .reverse()
            .forEach(([d, x, y]) => context.putImageData(d, x, y));

        for (let i = 0, y = 0; y < sH; y += cH) {
          for (let x = 0; x < sW; x += cW, i++) {
            let c = data[i];
            if (renderedData[i] !== c || forceRender) {
              context.putImageData(sprites[c], x, y);
              renderedData[i] = c;
            }
          }
        }

        underOverlay = [];
        Object.values(overlay)
          .filter((item) => item && item.length)
          .forEach(([c, x, y]) => {
            const under = context.getImageData(x, y, cW, cH);
            underOverlay.push([under, x, y]);
            const spriteData = sprites[c].data;
            const comb = new ImageData(cW, cH);
            const combData = comb.data;
            for (let data, i = cW * cH * 4; i--; ) {
              // Check alpha
              if ((i & 3) == 3) {
                data = spriteData[i] ? spriteData : under.data;
              }
              combData[i] = data[i];
            }
            context.putImageData(comb, x, y);
          });
      }
      requestAnimationFrame(animationFrameHandler);
    }
    requestAnimationFrame(animationFrameHandler);

    return [data, overlay];
  }
})();
