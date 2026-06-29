import { HydroCubePlaceholder } from "./HydroCubePlaceholder";
import type { Project } from "./types";

/**
 * Featured projects in scroll order. V1 ships the Hydro Cube only; later
 * entries just append to this array — the scheduler in ProjectsViewport
 * handles N projects and the side (left/right) is derived from index.
 */
export const PROJECTS: Project[] = [
  {
    id: "hydro-cube",
    title: "The Hydro Cube",
    bullets: [
      "Super small (3 cm³) device that drops into any water bottle",
      "ESP32-C3 microcontroller, BMP280 pressure sensor, gyroscope, I²C display",
      "Physics model derives the water column above the cube from pressure",
      "Firmware uses the gyroscope to correct for bottle tilt, then logs each change",
      "Reports how much you've drunk through the day — startup prototype",
    ],
    repoUrl: "https://github.com/EthanOrr930/hydroqube",
    Model: HydroCubePlaceholder,
  },
];
