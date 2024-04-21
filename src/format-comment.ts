import { readFileSync } from 'fs';
import path from 'path';
import bytes from 'bytes';
import { ActionConfig } from './config';
import { emojiForStatus, statusForSize } from './status-data';

const toKb = (size: number) => bytes(size);

export function buildMetadataForFile(
  fileName: string,
  metafile: ReturnType<typeof breakdownMetafile>,
  actionConfig: ActionConfig,
) {
  const metadata = metafile[0]!;
  const largerNodeMods = metadata.nodeModules.filter(
    (mod) => mod.size > actionConfig.largeNodeModulesThreshold,
  );

  const status = statusForSize(metadata.totalSize, actionConfig.thresholds);

  return {
    status,
    totalSize: metadata.totalSize,
    fileName,
    comment: `<details><summary>${fileName} <b>(${toKb(metadata.totalSize)})</b> ${emojiForStatus(status)}
    </summary>
  
  | Description | Size |
  |--------|--------|
  | **Total Size** | ${toKb(metadata.totalSize)} |
  | **Source Files** | ${toKb(metadata.srcFile.size)} |
  | **node_modules** | ${toKb(metadata.totalSize - metadata.srcFile.size)} |
  ${largerNodeMods.length ? largerNodeMods.map((mod) => `| <li>${mod.name}</li> | ${toKb(mod.size)} |`).join('\n') : ''}
  </details>
    `,
  };
}

export function breakdownMetafile(
  filePath: string,
  directory: string,
): BreakdownMetafileResponse[] {
  let srcSize = 0;
  const topLevelNodeModules: Record<string, number> = {};
  const metafile = JSON.parse(
    readFileSync(path.join(directory, filePath), 'utf-8'),
  );

  return Object.entries(
    metafile.outputs as Record<
    string,
    { inputs: Record<string, { bytesInOutput: number }>; bytes: number }
    >,
  )
    .map(([outputFile, { inputs, bytes: totalSize }]) => {
      // skip map files
      if (outputFile.endsWith('.map')) return;

      Object.entries(inputs).forEach(([key, value]) => {
        if (key.startsWith('node_modules')) {
          const [, host, module] = key.split('/');
          let objKey = host;
          if (host.startsWith('@')) {
            objKey = `${host}/${module}`;
          }
          if (!topLevelNodeModules[objKey]) {
            topLevelNodeModules[objKey] = 0;
          }
          topLevelNodeModules[objKey] += value.bytesInOutput;
        } else {
          srcSize += value.bytesInOutput;
        }
      });

      const nodeModules = Object.entries(topLevelNodeModules).map(
        ([name, size]) => ({ name, size }),
      );

      // sort largest -> smallest
      nodeModules.sort((a, b) => b.size - a.size);

      return {
        nodeModules,
        totalSize,
        srcFile: {
          size: srcSize,
        },
        filePath: filePath.replace('.meta.json', ''),
      };
    })
    .filter((i) => !!i) as BreakdownMetafileResponse[];
}

export type BreakdownMetafileResponse = {
  nodeModules: { name: string; size: number }[];
  totalSize: number;
  srcFile: {
    size: number;
  };
  filePath: string;
};
