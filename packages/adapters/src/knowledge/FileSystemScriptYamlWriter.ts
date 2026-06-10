/**
 * FileSystemScriptYamlWriter
 *
 * 生成済み YAML を指定された絶対パスに書き出す。
 * 親ディレクトリが存在しなければ作成する。
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdapterError } from '@money-video/shared-ts';

export class FileSystemScriptYamlWriter {
  async write(absolutePath: string, yamlText: string): Promise<void> {
    try {
      await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.promises.writeFile(absolutePath, yamlText, 'utf-8');
    } catch (err) {
      throw new AdapterError(
        `Failed to write YAML to ${absolutePath}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }
}
