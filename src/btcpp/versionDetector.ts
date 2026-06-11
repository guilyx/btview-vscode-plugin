import { XMLParser } from 'fast-xml-parser';
import type { FormatVersion, ParseOptions } from './types';

const detectorParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export function detectFormatVersion(
  xmlText: string,
  options: ParseOptions = {},
): { formatVersion: FormatVersion; warnings: string[] } {
  const warnings: string[] = [];

  if (options.defaultFormatVersion === '3') {
    return { formatVersion: 3, warnings };
  }
  if (options.defaultFormatVersion === '4') {
    return { formatVersion: 4, warnings };
  }

  try {
    const doc = detectorParser.parse(xmlText) as { root?: { '@_BTCPP_format'?: string } };
    const format = doc.root?.['@_BTCPP_format'];
    if (format === '4') {
      return { formatVersion: 4, warnings };
    }
    if (format !== undefined && format !== '4') {
      warnings.push(`Unknown BTCPP_format="${format}", attempting v4 parser.`);
      return { formatVersion: 4, warnings };
    }
  } catch {
    warnings.push('Failed to detect format from XML; defaulting to v3.8.');
  }

  return { formatVersion: 3, warnings };
}
