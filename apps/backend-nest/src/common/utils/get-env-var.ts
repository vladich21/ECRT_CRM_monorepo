import { ConfigService } from '@nestjs/config';

export function getEnvVar(
  configService: ConfigService,
  key: string,
  fallback?: string,
): string | undefined {
  const env = (
    configService.get<string>('NODE_ENV') ||
    process.env.NODE_ENV ||
    'development'
  ).toLowerCase();

  let envPrefix = 'DEV';
  if (env.startsWith('prod')) envPrefix = 'PROD';
  else if (env.startsWith('stag')) envPrefix = 'STAGE';

  return (
    configService.get<string>(`${envPrefix}_${key}`) ||
    configService.get<string>(key) ||
    fallback
  );
}
