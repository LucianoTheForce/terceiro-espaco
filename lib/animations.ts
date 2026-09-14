export type FilmPlacement = {
  page: number;
  character: number;
  box: [number, number, number, number];
  frame: [number, number, number];
  background: string;
};

// Coordinates use the PDF's original 1920 × 1080 artboard.
export const films: FilmPlacement[] = [
  ...[0, 1, 2, 3].map((character): FilmPlacement => ({
    page: 15,
    character,
    box: [40 + character * 460, 315, 460, 425],
    frame: [-23.7931, -41.2931, 507.5862],
    background: "#ffffff",
  })),
  {
    page: 16,
    character: 4,
    box: [650, 330, 640, 640],
    frame: [0, 0, 640],
    background: "#0064df",
  },
  {
    page: 18,
    character: 1,
    box: [1145, 435, 110, 220],
    frame: [-84.64, -24.45, 270],
    background: "#ffffff",
  },
  {
    page: 24,
    character: 5,
    box: [680, 320, 640, 640],
    frame: [0, 0, 640],
    background: "#cd18b8",
  },
  {
    page: 35,
    character: 7,
    box: [680, 320, 640, 640],
    frame: [0, 0, 640],
    background: "#f80000",
  },
  {
    page: 41,
    character: 3,
    box: [580, 330, 760, 680],
    frame: [-78.8, -133.8, 955.6],
    background: "#e4d400",
  },
];

export const details = [
  {
    id: "phone-meditation",
    page: 32,
    box: [1155, 488, 153, 181],
    background: "#f7f7f7",
  },
  {
    id: "phone-avatar",
    page: 32,
    box: [600, 850, 46, 53],
    background: "#ffffff",
  },
];
