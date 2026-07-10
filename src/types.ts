export interface Vision {
  id: string;
  text: string;
  whisper: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  color: string;
  size: number;
  createdAt: string;
}

export interface Theme {
  id: "dawn" | "noon" | "dusk" | "night";
  name: string;
  nameRu: string;
  bgGradient: string;
  grassColor1: string;
  grassColor2: string;
  sporeColor: string;
  accentColor: string;
  textColor: string;
  textMutedColor: string;
  cardBg: string;
  cardBorder: string;
}
