import type { LucideIcon } from "lucide-react";
import {
  Cpu, Wifi, Mic, Brain, Code, Flame, CircuitBoard, Box, Gauge, Move3d, Smartphone,
  Sigma, Gamepad2, Palette, Music, Timer, Boxes, Layers, Sparkles, MousePointerClick,
  LayoutGrid, Component, Droplets, FileCode,
} from "lucide-react";

export interface Skill {
  label: string;
  Icon: LucideIcon;
}

export interface SkillProject {
  id: string;
  name: string;
  tagline: string;
  /** Per-project hue — tints icons + the active thumbnail glyph. */
  accent: string;
  /** Thumbnail glyph for the tab. */
  Glyph: LucideIcon;
  skills: Skill[];
}

/** The four things I've built — each tab reveals the skills applied on it. */
export const SKILL_PROJECTS: SkillProject[] = [
  {
    id: "hydro-cube",
    name: "The Hydro Cube",
    tagline: "A sugar-cube-sized device that turns any water bottle into a smart one — pressure physics, on-device.",
    accent: "#3f93b8",
    Glyph: Droplets,
    skills: [
      { label: "ESP32-C3", Icon: Cpu },
      { label: "BMP280 sensor", Icon: Gauge },
      { label: "Gyroscope · I²C", Icon: Move3d },
      { label: "OLED display", Icon: Smartphone },
      { label: "Custom PCB", Icon: CircuitBoard },
      { label: "3D printing", Icon: Box },
      { label: "Firmware · C", Icon: FileCode },
      { label: "Physics modeling", Icon: Sigma },
    ],
  },
  {
    id: "clad-in-plaid",
    name: "Clad in Plaid",
    tagline: "A solo game-design-competition build — designed, coded, and shipped in 48 hours.",
    accent: "#7b6fc7",
    Glyph: Gamepad2,
    skills: [
      { label: "Unity", Icon: Gamepad2 },
      { label: "C#", Icon: Code },
      { label: "Game design", Icon: Sparkles },
      { label: "Pixel art · GIMP", Icon: Palette },
      { label: "Sound design", Icon: Music },
      { label: "48-hour ship", Icon: Timer },
    ],
  },
  {
    id: "session-recorder",
    name: "Session Recorder",
    tagline: "Custom hardware that streams conference audio to a web app, transcribes it, and turns each talk into structured AI notes.",
    accent: "#3f6fae",
    Glyph: Mic,
    skills: [
      { label: "ESP32 · ESP-IDF", Icon: Cpu },
      { label: "BLE · Wi-Fi · OTA", Icon: Wifi },
      { label: "Deepgram ASR", Icon: Mic },
      { label: "Gemini 2.5 Pro", Icon: Brain },
      { label: "Next.js + React", Icon: Code },
      { label: "Firebase · Functions", Icon: Flame },
      { label: "Custom PCB", Icon: CircuitBoard },
      { label: "3D-printed case", Icon: Box },
    ],
  },
  {
    id: "this-portfolio",
    name: "This portfolio",
    tagline: "The site you're scrolling — a scroll-driven 3D world, hand-built down to the shaders and the soft UI.",
    accent: "#c0883e",
    Glyph: Boxes,
    skills: [
      { label: "React Three Fiber", Icon: Boxes },
      { label: "WebGL · GLSL", Icon: Layers },
      { label: "Framer Motion", Icon: Sparkles },
      { label: "Scroll choreography", Icon: MousePointerClick },
      { label: "Neumorphism", Icon: LayoutGrid },
      { label: "Design systems", Icon: Component },
    ],
  },
];
