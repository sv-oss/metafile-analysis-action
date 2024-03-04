import { ActionConfig } from "./config";

export enum Status {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  INFO = 4,
}

export const statusForSize = (
  size: number,
  thresholds: ActionConfig["thresholds"],
) => {
  switch (true) {
    case size > thresholds.critical:
      return Status.CRITICAL;
    case size > thresholds.high: // 1MB+
      return Status.HIGH;
    case size > thresholds.medium:
      return Status.MEDIUM;
    case size > thresholds.low:
      return Status.LOW;
    default:
      return Status.INFO;
  }
};

export const emojiForStatus = (status: Status) => {
  switch (status) {
    case Status.CRITICAL:
      return "🚨";
    case Status.HIGH:
      return "🚩";
    case Status.MEDIUM:
      return "⚠️";
    case Status.LOW:
      return "⚠";
    case Status.INFO:
      return "🟢";
    default:
      throw new Error(`[emojiForStatus] Unknown status "${status}" received`);
  }
};

export const labelForStatus = (status: Status) => {
  switch (status) {
    case Status.CRITICAL:
      return "Critical";
    case Status.HIGH:
      return "High";
    case Status.MEDIUM:
      return "Medium";
    case Status.LOW:
      return "Low";
    case Status.INFO:
      return "Info";
    default:
      throw new Error(`[labelForStatus] Unknown status "${status}" received`);
  }
};

export const statusFromString = (str: string) => {
  switch (str.toUpperCase()) {
    case "CRITICAL":
      return Status.CRITICAL;
    case "HIGH":
      return Status.HIGH;
    case "MEDIUM":
      return Status.MEDIUM;
    case "LOW":
      return Status.LOW;
    case "INFO":
      return Status.INFO;
    default:
      throw new Error(`[statusFromString] Unknown status of "${str}" received`);
  }
};
