import bytes from "bytes";
import * as core from "@actions/core";

export interface ActionConfig {
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  largeNodeModulesThreshold: number;
}

export const extractConfig = (): ActionConfig => ({
  thresholds: {
    critical: bytes.parse(core.getInput("comment-threshold-critical")),
    high: bytes.parse(core.getInput("comment-threshold-high")),
    medium: bytes.parse(core.getInput("comment-threshold-medium")),
    low: bytes.parse(core.getInput("comment-threshold-low")),
  },
  largeNodeModulesThreshold: bytes.parse(
    core.getInput("comment-large-node-modules-threshold"),
  ),
});
