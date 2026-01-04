type EnvSource = Record<string, string | undefined> | undefined | null;

const defaultSources: EnvSource[] = [import.meta.env, process.env];

export const getServerEnv = (key: string, sources: EnvSource[] = defaultSources) => {
  for (const source of sources) {
    if (!source) {
      continue;
    }
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
};
