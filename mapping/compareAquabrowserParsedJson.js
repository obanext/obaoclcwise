const DEFAULT_DYNAMIC_PATHS = [
  '_attributes.before-rendering-time',
  '_attributes.total-time',
  'meta.rctx._text',
  'meta.query._text',
];

export function compareParsedJson(expected, actual, options = {}) {
  const {
    mode = 'exact',
    ignorePaths = [],
    dynamicPaths = DEFAULT_DYNAMIC_PATHS,
    maxDifferences = 500,
  } = options;

  const ignored = new Set([...(mode === 'compat' ? dynamicPaths : []), ...ignorePaths]);
  const differences = [];

  walkCompare(expected, actual, '', differences, {
    ignored,
    maxDifferences,
    shapeOnly: mode === 'shape',
  });

  return {
    equal: differences.length === 0,
    mode,
    comparedAt: new Date().toISOString(),
    differenceCount: differences.length,
    truncated: differences.length >= maxDifferences,
    differences,
  };
}

export function compareSearchParsedJson(expectedSearchParsedJson, actualSearchParsedJson, options = {}) {
  return compareParsedJson(expectedSearchParsedJson, actualSearchParsedJson, {
    mode: 'compat',
    ...options,
    ignorePaths: [
      'meta.rctx._text',
      ...(options.ignorePaths || []),
    ],
  });
}

export function compareDetailParsedJson(expectedDetailParsedJson, actualDetailParsedJson, options = {}) {
  return compareParsedJson(expectedDetailParsedJson, actualDetailParsedJson, {
    mode: 'compat',
    ...options,
    ignorePaths: [
      'meta.rctx._text',
      ...(options.ignorePaths || []),
    ],
  });
}

export function compareParsedJsonShape(expected, actual, options = {}) {
  return compareParsedJson(expected, actual, {
    mode: 'shape',
    ...options,
  });
}

function walkCompare(expected, actual, path, differences, context) {
  if (differences.length >= context.maxDifferences) return;
  if (isIgnored(path, context.ignored)) return;

  const expectedType = valueType(expected);
  const actualType = valueType(actual);

  if (expectedType !== actualType) {
    differences.push({
      type: 'type-mismatch',
      path: path || '<root>',
      expectedType,
      actualType,
      expected: preview(expected),
      actual: preview(actual),
    });
    return;
  }

  if (expectedType === 'object') {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();

    for (const key of expectedKeys) {
      const childPath = joinPath(path, key);
      if (isIgnored(childPath, context.ignored)) continue;
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        differences.push({
          type: 'missing-key',
          path: childPath,
          expected: preview(expected[key]),
          actual: undefined,
        });
        if (differences.length >= context.maxDifferences) return;
      }
    }

    for (const key of actualKeys) {
      const childPath = joinPath(path, key);
      if (isIgnored(childPath, context.ignored)) continue;
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        differences.push({
          type: 'unexpected-key',
          path: childPath,
          expected: undefined,
          actual: preview(actual[key]),
        });
        if (differences.length >= context.maxDifferences) return;
      }
    }

    for (const key of expectedKeys) {
      const childPath = joinPath(path, key);
      if (!Object.prototype.hasOwnProperty.call(actual, key)) continue;
      walkCompare(expected[key], actual[key], childPath, differences, context);
      if (differences.length >= context.maxDifferences) return;
    }
    return;
  }

  if (expectedType === 'array') {
    if (expected.length !== actual.length) {
      differences.push({
        type: 'array-length-mismatch',
        path: path || '<root>',
        expectedLength: expected.length,
        actualLength: actual.length,
      });
      if (differences.length >= context.maxDifferences) return;
    }

    const limit = Math.min(expected.length, actual.length);
    for (let index = 0; index < limit; index += 1) {
      walkCompare(expected[index], actual[index], `${path}[${index}]`, differences, context);
      if (differences.length >= context.maxDifferences) return;
    }
    return;
  }

  if (context.shapeOnly) return;

  if (expected !== actual) {
    differences.push({
      type: 'value-mismatch',
      path: path || '<root>',
      expected,
      actual,
    });
  }
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function joinPath(base, key) {
  return base ? `${base}.${key}` : key;
}

function isIgnored(path, ignored) {
  if (!path) return false;
  if (ignored.has(path)) return true;
  for (const ignoredPath of ignored) {
    if (!ignoredPath) continue;
    if (ignoredPath.endsWith('.*') && path.startsWith(ignoredPath.slice(0, -2))) return true;
  }
  return false;
}

function preview(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object') return value;
  const json = JSON.stringify(value);
  return json.length > 300 ? `${json.slice(0, 300)}…` : value;
}
