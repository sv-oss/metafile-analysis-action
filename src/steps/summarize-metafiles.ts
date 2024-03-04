import { globSync } from "glob";
import { breakdownMetafile } from "../format-comment";

export type SummarizeMetafilesRequest = {
  readonly directory: string;
  readonly glob: string;
};

export async function execute({ directory, glob }: SummarizeMetafilesRequest) {
  const files = globSync(glob, {
    cwd: directory,
  });

  return files.map((file) => breakdownMetafile(file, directory)).flat();
}
