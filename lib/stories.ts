export type Story = {
  id: string;
  page: number;
  column: number;
  group: string;
  title: string;
  kind: "title" | "photo" | "schedule";
  image: string;
};

const groups = [
  {
    page: 18,
    group: "ELISAVA Workshop",
    titles: [
      "17.10 — ELISAVA Workshop",
      "Encontro no galpão",
      "Programação dos workshops",
      "Design e experimentação",
    ],
  },
  {
    page: 19,
    group: "VERSA 360 Days",
    titles: [
      "14.11 — VERSA 360 Days",
      "Uma pausa para estar presente",
      "Programação VERSA 360",
      "Listening session",
    ],
  },
  {
    page: 20,
    group: "Esben Weile Kjær",
    titles: [
      "15.11 — Esben Weile Kjær",
      "Instalação",
      "Esben Weile Kjær",
      "Arte em outra escala",
    ],
  },
  {
    page: 21,
    group: "Creative Aperitivo",
    titles: [
      "12.11 — Creative Aperitivo",
      "Terceiro Espaço no copo",
      "À mesa com Gio Cozinha",
      "Feito para compartilhar",
    ],
  },
  {
    page: 22,
    group: "Design Barra Funda",
    titles: [
      "27.11 — Design Barra Funda",
      "Encontros que aproximam",
      "Design que convida",
      "Programação Design Barra Funda",
    ],
  },
];

export const stories: Story[] = groups.flatMap(({ page, group, titles }) =>
  titles.map((title, column) => ({
    id: `${page}-${column}`,
    page,
    column,
    group,
    title,
    kind:
      column === 0
        ? "title"
        : column === 2 && page <= 19
          ? "schedule"
          : "photo",
    image: `/stories/${page}-${column}.webp`,
  })),
);
