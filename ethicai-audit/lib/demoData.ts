import { Row } from "./metrics";

// Small demo dataset (toy sample) to power the UI quickly.
// Later we can expand this or use a larger embedded sample.
export const demoSexData: Row[] = [
  { y_true: 1, y_pred: 1, group: "Male" },
  { y_true: 1, y_pred: 1, group: "Male" },
  { y_true: 1, y_pred: 0, group: "Male" },
  { y_true: 0, y_pred: 1, group: "Male" },
  { y_true: 0, y_pred: 0, group: "Male" },
  { y_true: 0, y_pred: 0, group: "Male" },

  { y_true: 1, y_pred: 0, group: "Female" },
  { y_true: 1, y_pred: 0, group: "Female" },
  { y_true: 0, y_pred: 0, group: "Female" },
  { y_true: 0, y_pred: 0, group: "Female" },
  { y_true: 0, y_pred: 0, group: "Female" },
];

export const demoRaceData: Row[] = [
  { y_true: 1, y_pred: 1, group: "White" },
  { y_true: 1, y_pred: 1, group: "White" },
  { y_true: 1, y_pred: 0, group: "White" },
  { y_true: 0, y_pred: 1, group: "White" },
  { y_true: 0, y_pred: 0, group: "White" },

  { y_true: 1, y_pred: 0, group: "Black" },
  { y_true: 1, y_pred: 0, group: "Black" },
  { y_true: 0, y_pred: 0, group: "Black" },
  { y_true: 0, y_pred: 0, group: "Black" },

  { y_true: 1, y_pred: 1, group: "Asian-Pac-Islander" },
  { y_true: 1, y_pred: 1, group: "Asian-Pac-Islander" },
  { y_true: 0, y_pred: 1, group: "Asian-Pac-Islander" },
  { y_true: 0, y_pred: 0, group: "Asian-Pac-Islander" },
];
