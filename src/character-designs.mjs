function row(width, offset = 0) {
  return Object.freeze({ width, offset });
}

function rows(...values) {
  return Object.freeze(values.map(value =>
    Array.isArray(value) ? row(value[0], value[1]) : row(value)
  ));
}

function rectangle(width, height, offset = 0) {
  return Object.freeze(
    Array.from({ length: height }, () => row(width, offset))
  );
}

function staircase(height) {
  return Object.freeze(
    Array.from(
      { length: height },
      (_, index) => row(index + 1, height - index - 1)
    )
  );
}

function frozenDetails(details) {
  return Object.fromEntries(Object.entries(details).map(([key, value]) => [
    key,
    Array.isArray(value) ? Object.freeze([...value]) : value
  ]));
}

function region(id, color, details = {}) {
  return Object.freeze({ id, ...frozenDetails(details), color });
}

function regions(...values) {
  return Object.freeze(values);
}

function face(x, y, scale = 1) {
  return Object.freeze({ x, y, scale });
}

function accessory(type, details = {}) {
  return Object.freeze({ type, ...frozenDetails(details) });
}

function design(designRows, designRegions, designFace, designAccessory = null) {
  return Object.freeze({
    rows: designRows,
    regions: designRegions,
    face: designFace,
    accessory: designAccessory
  });
}

const WHITE = "#fffaf2";
const RED = "#ef4147";
const ORANGE = "#f2a340";
const GOLD = "#f4bd62";
const YELLOW = "#fff38b";
const GREEN = "#77d982";
const CYAN = "#68cfe8";
const PURPLE = "#8355c5";
const PINK = "#ed5eb2";
const GREY = "#899396";
const RAINBOW = Object.freeze([
  "#ef4147",
  "#f2a340",
  "#f2db4b",
  "#58c96b",
  "#45bdd4",
  "#7854c5",
  "#ed5eb2"
]);

const body = color => region("body", color);
const cap = (count, color) => region("cap", color, { rows: count });
const topBand = (count, color) =>
  region("top-band", color, { rows: count });
const belt = (afterRow, color) =>
  region("belt", color, { afterRow });
const sideStripe = (side, cols, color, fromRow = 0, toRow = null) =>
  region("side-stripe", color, { side, cols, fromRow, toRow });
const rainbowBand = (details = {}) =>
  region("rainbow-band", RAINBOW[0], { ...details, colors: RAINBOW });
const rainbowColumns = () =>
  region("rainbow-columns", RAINBOW[0], { colors: RAINBOW });
const stepMotif = (color, details = {}) =>
  region("step-motif", color, details);
const centerStripe = (cols, color, fromRow = 0, toRow = null) =>
  region("center-stripe", color, { cols, fromRow, toRow });
const facePanel = (color, details) =>
  region("face-panel", color, details);

const DESIGNS = new Map([
  // 11–20: white bodies with the bright unit-color details in the chart.
  [11, design(
    rows([1, 1], 2, 2, 2, 2, 2),
    regions(cap(1, RED), body(WHITE)),
    face(.5, 4, .9)
  )],
  [12, design(
    rectangle(3, 4),
    regions(topBand(1, WHITE), belt(2, ORANGE), body(WHITE)),
    face(1, 2, 1)
  )],
  [13, design(
    rows(3, 2, 2, 2, 2, 2),
    regions(cap(1, "#f2da42"), body(WHITE)),
    face(.5, 4, .85),
    accessory("flower", { color: "#b86fc6" })
  )],
  [14, design(
    rectangle(2, 7),
    regions(cap(2, "#65bd48"), body(WHITE)),
    face(.5, 5, .82),
    accessory("round-glasses", { color: "#58b86a" })
  )],
  [15, design(
    staircase(5),
    regions(
      sideStripe("right", 1, "#67cde4"),
      stepMotif(WHITE, { direction: "down-left" }),
      body(WHITE)
    ),
    face(3.5, 4, .9),
    accessory("cat-ears", { color: "#40396f" })
  )],
  [16, design(
    rectangle(4, 4),
    regions(sideStripe("bottom", 1, PURPLE, 3, 3), body(WHITE)),
    face(1.5, 2, 1.05)
  )],
  [17, design(
    rows(3, 2, 2, 2, 2, 2, 2, 2),
    regions(
      rainbowBand({ orientation: "cap", rows: 2 }),
      body(WHITE)
    ),
    face(.5, 6, .86),
    accessory("rainbow-crown", { colors: RAINBOW })
  )],
  [18, design(
    rectangle(2, 9),
    regions(sideStripe("right", 1, "#ef3fc0"), body(WHITE)),
    face(.5, 7, .82)
  )],
  [19, design(
    rows([1, 1], 2, 2, 2, 2, 2, 2, 2, 2, 2),
    regions(sideStripe("right", 1, "#c9cdd0"), body(WHITE)),
    face(.5, 8, .78),
    accessory("tiny-hat", { color: "#d8d8d8" })
  )],
  [20, design(
    rectangle(2, 10),
    regions(body("#f6c778")),
    face(.5, 8, .82),
    accessory("plume", { color: PURPLE })
  )],

  // 21–30: warm gold/orange bodies and the chart's hats, masks, and bands.
  [21, design(
    rectangle(3, 7),
    regions(centerStripe(1, RED, 2, 4), body(GOLD)),
    face(1, 2, 1.05),
    accessory("top-hat-glasses", { color: "#2e2c5e" })
  )],
  [22, design(
    rows([2, 1], 4, 4, 4, 4, 4),
    regions(cap(1, ORANGE), body(GOLD)),
    face(1.5, 4, .95)
  )],
  [23, design(
    rows(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, [3, 1]),
    regions(
      stepMotif("#f3d63c", { side: "right", fromRow: 9 }),
      body(GOLD)
    ),
    face(.5, 9, .8)
  )],
  [24, design(
    rectangle(2, 12),
    regions(centerStripe(1, "#58bf57", 4, 7), body(GOLD)),
    face(.5, 5, .82)
  )],
  [25, design(
    rectangle(5, 5),
    regions(body(GOLD)),
    face(2, 3, 1.05),
    accessory("blue-glasses", { color: "#3577a8" })
  )],
  [26, design(
    rows([2, 1], 4, 4, 4, 4, 4, 4),
    regions(cap(1, "#9d6a38"), topBand(1, GOLD), belt(5, PURPLE), body(GOLD)),
    face(1.5, 4, 1),
    accessory("sunglasses", { color: "#2e2035" })
  )],
  [27, design(
    rectangle(3, 9),
    regions(
      rainbowBand({ orientation: "vertical", side: "center", cols: 1 }),
      body(GOLD)
    ),
    face(1, 7, .84)
  )],
  [28, design(
    rectangle(2, 14),
    regions(cap(2, "#ed36b5"), body(GOLD)),
    face(.5, 9, .8)
  )],
  [29, design(
    rows([1, 1], 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2),
    regions(sideStripe("right", 1, "#bdc1c2"), body(GOLD)),
    face(.5, 13, .75)
  )],
  [30, design(
    rectangle(3, 10),
    regions(body("#f4e477")),
    face(1, 1, .9),
    accessory("star", { color: RED })
  )],

  // 31–40: sunny yellow bodies, wide banners, steps, and colored side marks.
  [31, design(
    rows([1, 4], 10, 10, 10),
    regions(cap(1, RED), body(YELLOW)),
    face(4.5, 2, 1),
    accessory("number-crown", { count: 10, colors: RAINBOW })
  )],
  [32, design(
    rectangle(4, 8),
    regions(cap(1, ORANGE), body(YELLOW)),
    face(1.5, 3, .95)
  )],
  [33, design(
    rectangle(3, 11),
    regions(cap(1, "#d8c323"), belt(10, "#e865b5"), body(YELLOW)),
    face(1, 9, .82)
  )],
  [34, design(
    rows([2, 1], 4, 4, 4, 4, 4, 4, 4, 4),
    regions(sideStripe("right", 1, "#55bb51", 5), body(YELLOW)),
    face(1.5, 6, .9)
  )],
  [35, design(
    rectangle(5, 7),
    regions(topBand(1, "#43afd0"), body(YELLOW)),
    face(2, 4, .95),
    accessory("flower-band", { colors: [RED, PURPLE, ORANGE] })
  )],
  [36, design(
    rectangle(6, 6),
    regions(belt(5, PURPLE), body(YELLOW)),
    face(2.5, 3, 1.05),
    accessory("pink-mask", { color: "#ef3fc0" })
  )],
  [37, design(
    rows([2, 1], 5, 5, 5, 5, 5, 5, 5),
    regions(
      rainbowBand({ orientation: "vertical", side: "right", cols: 1, fromRow: 2 }),
      body(YELLOW)
    ),
    face(2, 5, .92)
  )],
  [38, Object.freeze({
    rows: Object.freeze([
      row(3, 1),
      row(5),
      row(5),
      row(5),
      row(5),
      row(5),
      row(5),
      row(5)
    ]),
    regions: Object.freeze([
      Object.freeze({ id: "cap", rows: 2, color: "#f23dcd" }),
      Object.freeze({ id: "body", color: "#fff38b" }),
      Object.freeze({
        id: "belt",
        afterRow: 4,
        color: "#d736b6"
      })
    ]),
    face: Object.freeze({ x: 2, y: 6, scale: 1 }),
    accessory: null
  })],
  [39, design(
    rectangle(3, 13),
    regions(cap(2, "#8d9395"), body(YELLOW)),
    face(1, 2, .84),
    accessory("round-glasses", { color: "#343744" })
  )],
  [40, design(
    rectangle(4, 10),
    regions(body("#82df91")),
    face(1.5, 1, .92)
  )],

  // 41–50: green bodies with belts, rainbow side strips, masks, and steps.
  [41, design(
    rows([1, 3], 4, 4, 4, 4, 4, 4, 4, 4, 4, 4),
    regions(cap(1, RED), body(GREEN)),
    face(1.5, 9, .82)
  )],
  [42, design(
    rows([2, 1], 4, 4, 4, 4, 4, 4, 4, 4, 4, 4),
    regions(belt(7, PURPLE), body(GREEN)),
    face(1.5, 2, .9),
    accessory("square-glasses", { color: "#316b74" })
  )],
  [43, design(
    rows(4, 4, 4, 4, 4, 4, 4, 4, 4, 4, [3, 3]),
    regions(
      stepMotif("#f2d946", { side: "right", fromRow: 9 }),
      body(GREEN)
    ),
    face(1.5, 7, .86)
  )],
  [44, design(
    rectangle(4, 11),
    regions(sideStripe("left", 1, "#4ebc69", 3, 5), body(GREEN)),
    face(1.5, 2, .9),
    accessory("square-glasses", { color: "#3c6f75" })
  )],
  [45, design(
    staircase(9),
    regions(
      sideStripe("right", 1, "#4bc4dd"),
      stepMotif(GREEN, { direction: "down-left" }),
      body(GREEN)
    ),
    face(6.5, 8, .82)
  )],
  [46, design(
    rows([1, 2], 5, 5, 5, 5, 5, 5, 5, 5, 5),
    regions(cap(1, PURPLE), body(GREEN)),
    face(2, 2, .88),
    accessory("blue-glasses", { color: "#2f6075" })
  )],
  [47, design(
    rows([2, 1], 5, 5, 5, 5, 5, 5, 5, 5, 5),
    regions(
      rainbowBand({ orientation: "vertical", side: "right", cols: 1, fromRow: 3 }),
      body(GREEN)
    ),
    face(2, 8, .86)
  )],
  [48, design(
    rectangle(8, 6),
    regions(cap(1, "#ee48b9"), body("#a2e6af")),
    face(3.5, 2, 1),
    accessory("purple-mask", { color: PURPLE })
  )],
  [49, design(
    rectangle(7, 7),
    regions(topBand(1, GREEN), facePanel("#7b9f83", { fromRow: 2, toRow: 4, fromCol: 2, toCol: 4 }), body("#a2e6af")),
    face(3, 3, 1.05),
    accessory("rainbow-crown", { colors: RAINBOW })
  )],
  [50, design(
    rectangle(5, 10),
    regions(body("#75d5ed")),
    face(2, 2, .95),
    accessory("eyepatch", { color: "#31546f" })
  )],

  // 51–60: cyan bodies, crowns, tall rainbow strips, and cool side panels.
  [51, design(
    rectangle(3, 17),
    regions(centerStripe(1, "#a9eaf4", 2, 14), body(CYAN)),
    face(1, 13, .76),
    accessory("antennae", { color: "#56d064" })
  )],
  [52, design(
    rectangle(4, 13),
    regions(cap(1, ORANGE), body(CYAN)),
    face(1.5, 5, .84)
  )],
  [53, design(
    rows([3, 1], 5, 5, 5, 5, 5, 5, 5, 5, 5, 5),
    regions(
      stepMotif("#f1dc4b", { side: "right", fromRow: 7 }),
      body(CYAN)
    ),
    face(2, 2, .92),
    accessory("sun-crown", { colors: [RED, YELLOW, GREEN] })
  )],
  [54, design(
    rectangle(9, 6),
    regions(centerStripe(1, "#50b96a"), body(CYAN)),
    face(4, 2, 1),
    accessory("square-glasses", { color: "#355c73" })
  )],
  [55, design(
    staircase(10),
    regions(
      sideStripe("right", 1, "#4cc2dc"),
      stepMotif(CYAN, { direction: "down-left" }),
      body(CYAN)
    ),
    face(7.5, 9, .8),
    accessory("cat-ears", { color: "#ef6aa8" })
  )],
  [56, design(
    rectangle(7, 8),
    regions(cap(1, PURPLE), body(CYAN)),
    face(3, 1, .92),
    accessory("pink-glasses", { color: PINK })
  )],
  [57, design(
    rectangle(3, 19),
    regions(
      rainbowBand({ orientation: "vertical", side: "center", cols: 1, fromRow: 1, toRow: 8 }),
      body(CYAN)
    ),
    face(1, 16, .72)
  )],
  [58, design(
    rows([2, 2], 7, 7, 7, 7, 7, 7, 7, 7),
    regions(sideStripe("right", 1, "#e94bb5"), body(CYAN)),
    face(3, 2, .9)
  )],
  [59, design(
    rows([3, 2], 7, 7, 7, 7, 7, 7, 7, 7),
    regions(sideStripe("right", 1, "#abb6ba"), body(CYAN)),
    face(3, 6, .88),
    accessory("sleep-mask", { color: "#426878" })
  )],
  [60, design(
    rectangle(6, 10),
    regions(body("#8d62d0")),
    face(2.5, 5, .9)
  )],

  // 61–70: purple bodies, staircases, rainbow flanks, pom-poms, and crowns.
  [61, design(
    rows([1, 5], 6, 6, 6, 6, 6, 6, 6, 6, 6, 6),
    regions(sideStripe("right", 1, RED, 9), body(PURPLE)),
    face(2.5, 1, .9)
  )],
  [62, design(
    rows([2, 2], 6, 6, 6, 6, 6, 6, 6, 6, 6, 6),
    regions(sideStripe("right", 1, ORANGE, 9), body(PURPLE)),
    face(2.5, 2, .92),
    accessory("antennae", { color: "#56d064" })
  )],
  [63, design(
    rectangle(7, 9),
    regions(belt(2, "#d7a93e"), body(PURPLE)),
    face(3, 2, .92),
    accessory("gold-glasses", { color: "#dfbd47", tilt: true })
  )],
  [64, design(
    rectangle(8, 8),
    regions(facePanel("#59c768", { fromRow: 3, toRow: 5, fromCol: 3, toCol: 4 }), body(PURPLE)),
    face(3.5, 4, 1)
  )],
  [65, design(
    rectangle(5, 13),
    regions(cap(1, "#45bad4"), body(PURPLE)),
    face(2, 5, .84)
  )],
  [66, design(
    staircase(11),
    regions(
      sideStripe("right", 1, "#7650c0"),
      stepMotif(PURPLE, { direction: "down-left" }),
      body(PURPLE)
    ),
    face(8.5, 10, .78),
    accessory("cat-ears", { color: "#d94b57" })
  )],
  [67, design(
    rows([4, 1], 7, 7, 7, 7, 7, 7, 7, 7, 7),
    regions(
      rainbowBand({ orientation: "vertical", side: "right", cols: 1, fromRow: 3 }),
      body(PURPLE)
    ),
    face(3, 2, .92),
    accessory("brow-mask", { color: "#23243a" })
  )],
  [68, design(
    rows([5, 1], 7, 7, 7, 7, 7, 7, 7, 7, 7),
    regions(sideStripe("right", 1, PINK), body(PURPLE)),
    face(3, 4, .92),
    accessory("pom-poms", { colors: [ORANGE, PINK] })
  )],
  [69, design(
    rectangle(3, 23),
    regions(cap(2, GREY), body(PURPLE)),
    face(1, 13, .72),
    accessory("tiny-hat", { color: GREY })
  )],
  [70, design(
    rectangle(7, 10),
    regions(rainbowColumns(), body(GOLD)),
    face(3, 1, .92),
    accessory("rainbow-crown", { colors: RAINBOW })
  )],

  // 71–80: full rainbow columns and diagonal/stepped rainbow arrangements.
  [71, design(
    rows([1, 3], 7, 7, 7, 7, 7, 7, 7, 7, 7, 7),
    regions(rainbowColumns(), body(PINK)),
    face(3, 4, .9),
    accessory("gem", { color: "#43c9df" })
  )],
  [72, design(
    rectangle(8, 9),
    regions(rainbowColumns(), body(PINK)),
    face(3.5, 4, 1)
  )],
  [73, design(
    rows([1, 3], 8, 8, 8, 8, 8, 8, 8, 8, 8),
    regions(rainbowColumns(), body(PINK)),
    face(3.5, 2, .94),
    accessory("tilted-cap", { color: "#7d57c2" })
  )],
  [74, design(
    rows([2, 3], 8, 8, 8, 8, 8, 8, 8, 8, 8),
    regions(
      sideStripe("right", 1, "#57bc5f", 8),
      rainbowColumns(),
      body(PINK)
    ),
    face(3.5, 4, .92)
  )],
  [75, design(
    rectangle(5, 15),
    regions(rainbowColumns(), facePanel(YELLOW, { fromRow: 8, toRow: 11, fromCol: 1, toCol: 3 }), body(PINK)),
    face(2, 9, .82),
    accessory("blue-glasses", { color: "#3b76ad" })
  )],
  [76, design(
    rectangle(4, 19),
    regions(rainbowColumns(), body(PURPLE)),
    face(1.5, 4, .78),
    accessory("purple-cap", { color: "#4f3997" })
  )],
  [77, design(
    rectangle(7, 11),
    regions(rainbowColumns(), body(PINK)),
    face(3, 2, .9),
    accessory("royal-crown", { colors: RAINBOW })
  )],
  [78, design(
    staircase(12),
    regions(
      rainbowBand({ orientation: "diagonal", direction: "down-left" }),
      stepMotif(PINK, { direction: "down-left" }),
      body(PINK)
    ),
    face(9.5, 11, .76),
    accessory("cat-ears", { color: "#d44a56" })
  )],
  [79, design(
    rows([7, 0], 8, 8, 8, 8, 8, 8, 8, 8, 8),
    regions(rainbowColumns(), body(PINK)),
    face(3.5, 4, .92)
  )],
  [80, design(
    rectangle(8, 10),
    regions(body("#ef79bd")),
    face(3.5, 1, .95),
    accessory("medallion", { color: "#b13a84" })
  )],

  // 81–90: pink squares with colored corners, bands, glasses, and side curls.
  [81, design(
    rectangle(9, 9),
    regions(body(PINK)),
    face(4, 4, 1)
  )],
  [82, design(
    rows([1, 8], 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(sideStripe("right", 1, ORANGE, 8), body(PINK)),
    face(4, 8, .9)
  )],
  [83, design(
    rows([2, 7], 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(sideStripe("right", 1, GREEN, 8), body(PINK)),
    face(4, 8, .9),
    accessory("oversized-eyes", { color: "#8e263c" })
  )],
  [84, design(
    rectangle(7, 12),
    regions(
      rainbowBand({ orientation: "cap", rows: 1 }),
      sideStripe("right", 1, "#4ec3d9", 8),
      body(PINK)
    ),
    face(3, 3, .88)
  )],
  [85, design(
    rows([1, 6], 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7),
    regions(sideStripe("right", 1, "#4dbbd7", 7), body(PINK)),
    face(3, 3, .88)
  )],
  [86, design(
    rows([2, 5], 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7),
    regions(sideStripe("right", 1, PURPLE, 9), body(PINK)),
    face(3, 11, .86),
    accessory("oversized-eyes", { color: "#8d263c" })
  )],
  [87, design(
    rows([3, 4], 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7),
    regions(
      rainbowBand({ orientation: "cap", rows: 2 }),
      body(PINK)
    ),
    face(3, 7, .88)
  )],
  [88, design(
    rectangle(8, 11),
    regions(topBand(1, "#d9329e"), body(PINK)),
    face(3.5, 2, .95),
    accessory("side-curls", { color: "#b9348a" })
  )],
  [89, design(
    rows([1, 7], 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8),
    regions(body(PINK)),
    face(3.5, 5, .92),
    accessory("blue-glasses", { color: "#286bb0" })
  )],
  [90, design(
    rectangle(9, 10),
    regions(topBand(1, "#747d80"), body(GREY)),
    face(4, 2, .95),
    accessory("small-hat", { color: "#555d61" })
  )],

  // 91–100: grey metallic bodies, colored side counters, and 100's red square.
  [91, design(
    rows([1, 4], 9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(cap(1, RED), body(GREY)),
    face(4, 7, .9),
    accessory("crown-and-wings", { colors: [YELLOW, WHITE, PURPLE] })
  )],
  [92, design(
    rectangle(4, 23),
    regions(cap(2, "#737d80"), body(GREY)),
    face(1.5, 5, .74),
    accessory("star-crown", { color: GOLD })
  )],
  [93, design(
    rows([3, 3], 9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(sideStripe("right", 1, "#ead54a", 7), body(GREY)),
    face(4, 2, .92)
  )],
  [94, design(
    rows([4, 2], 9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(sideStripe("right", 1, "#53bf57", 7), body(GREY)),
    face(4, 4, .92),
    accessory("oversized-green-glasses", { color: "#45c969" })
  )],
  [95, design(
    rows([5, 2], 9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(sideStripe("right", 1, "#4dbbd7", 7), body(GREY)),
    face(4, 4, .92),
    accessory("blue-mask", { color: "#366da9" })
  )],
  [96, design(
    rectangle(8, 12),
    regions(facePanel("#b9d9d7", { fromRow: 8, toRow: 10, fromCol: 3, toCol: 4 }), body(GREY)),
    face(3.5, 9, .88),
    accessory("horns", { colors: ["#48cfc7", PURPLE] })
  )],
  [97, design(
    rows([7, 1], 9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(
      rainbowBand({ orientation: "vertical", side: "right", cols: 1, fromRow: 5 }),
      body(GREY)
    ),
    face(4, 1, .92)
  )],
  [98, design(
    rows(8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    regions(cap(1, "#e649af"), body(GREY)),
    face(4, 8, .9),
    accessory("rainbow-boots", { colors: RAINBOW })
  )],
  [99, design(
    rectangle(9, 11),
    regions(body("#747e81")),
    face(4, 2, .92)
  )],
  [100, design(
    rectangle(10, 10),
    regions(facePanel(WHITE, { fromRow: 1, toRow: 4, fromCol: 3, toCol: 6 }), body("#ef6767")),
    face(4.5, 2, 1.25),
    accessory("single-eye", { color: "#111111" })
  )]
]);

function rowsOverlap(first, second) {
  const firstRight = first.offset + first.width - 1;
  const secondRight = second.offset + second.width - 1;
  return Math.max(first.offset, second.offset) <= Math.min(firstRight, secondRight);
}

if (DESIGNS.size !== 90) {
  throw new Error(`reference design catalog must contain 90 entries, got ${DESIGNS.size}`);
}

for (let number = 11; number <= 100; number += 1) {
  const catalogDesign = DESIGNS.get(number);
  if (!catalogDesign) {
    throw new Error(`reference design catalog is missing ${number}`);
  }
  const cellCount = catalogDesign.rows.reduce((sum, item) => sum + item.width, 0);
  if (cellCount !== number) {
    throw new Error(`reference design ${number} contains ${cellCount} cells`);
  }
  for (let index = 1; index < catalogDesign.rows.length; index += 1) {
    if (!rowsOverlap(catalogDesign.rows[index - 1], catalogDesign.rows[index])) {
      throw new Error(`reference design ${number} disconnects at row ${index}`);
    }
  }
}

export function referenceDesign(number) {
  const catalogDesign = DESIGNS.get(number);
  if (!catalogDesign) {
    throw new RangeError(`missing reference design for ${number}`);
  }
  return catalogDesign;
}
