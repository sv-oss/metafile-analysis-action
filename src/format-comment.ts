import { readFileSync } from 'fs';
import bytes from 'bytes';

export interface ActionConfig {
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  largeNodeModulesThreshold: number;
};

const toKb = (size: number) => bytes(size);

export function buildMetadataForFile(
  fullName: string,
  metafile: ReturnType<typeof breakdownMetafile>,
  actionConfig: ActionConfig
) {
  const metadata = metafile[0]!;
  const largerNodeMods = metadata.nodeModules.filter((mod) => mod.size > actionConfig.largeNodeModulesThreshold);

  const status = statusForSize(metadata.totalSize, actionConfig.thresholds);

  const fileName = fullName.replace('.meta.json', '');

  return {
    status,
    comment: `<details><summary>${fileName} <b>(${toKb(metadata.totalSize)})</b> ${status.emoji}
    </summary>
  
  | Description | Size |
  |--------|--------|
  | **Total Size** | ${toKb(metadata.totalSize)} |
  | **Source Files** | ${toKb(metadata.srcFile.size)} |
  | **node_modules** | ${toKb(metadata.totalSize - metadata.srcFile.size)} |
  ${largerNodeMods.length ? largerNodeMods.map((mod) => `| <li>${mod.name}</li> | ${toKb(mod.size)} |`).join('\n') : ''}
  </details>
    `
  };
}

const statusForSize = (size: number, thresholds: ActionConfig['thresholds']): { emoji: string; enum: string } => {
  switch (true) {
    case size > thresholds.critical:
      return {
        emoji: '🚨',
        enum: 'Critical',
      };
    case size > thresholds.high: // 1MB+
      return {
        emoji: '🚩',
        enum: 'High',
      };
    case size > thresholds.medium:
      return {
        emoji: '⚠️',
        enum: 'Medium',
      };
    case size > thresholds.low:
      return {
        emoji: '⚠',
        enum: 'Low',
      };
    default:
      return { emoji: '', enum: 'Info' };
  }
};

export function breakdownMetafile(filePath: string) {
  let srcSize = 0;
  const topLevelNodeModules: Record<string, number> = {};
  const metafile = JSON.parse(readFileSync(filePath, 'utf-8'));

  return Object.entries(
    metafile.outputs as Record<string, { inputs: Record<string, { bytesInOutput: number }>; bytes: number }>
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

      const nodeModules = Object.entries(topLevelNodeModules).map(([name, size]) => ({ name, size }));

      // sort largest -> smallest
      nodeModules.sort((a, b) => b.size - a.size);

      return {
        nodeModules,
        totalSize,
        srcFile: {
          size: srcSize,
        },
      };
    })
    .filter((i) => !!i);
};
