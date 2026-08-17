
import { z } from 'zod';

export const ConfiguratorSchema = z.object({
  template: z.string().min(1, 'Template is required.'),
  site: z.string().min(1, 'Site is required.'),
  ipType: z.string().min(1, 'IP Type is required.'),
  ipOutput: z.string().min(1, 'IP Output is required.'),
  logo: z.string().optional(),
  logoPosition: z.string().optional(),
});

export type ConfiguratorValues = z.infer<typeof ConfiguratorSchema>;

// src/lib/definitions.ts
export interface TitanJsonEntry {
    Name?: string;
    Device?: {
        Template?: {
            Name?: string;
            Tracks?: {
                VideoTracks?: VideoTrack[];
            };
        };
    };
    Outputs?: (OutputGroup[] | null)[] | null;
}

export interface VideoTrack {
    LogoInsertions?: LogoInsertion[] | null;
    Variants?: Variant[] | null;
}

export interface Variant {
    LogoInsertions?: LogoInsertion[] | null;
}

export interface LogoInsertion {
    Enable?: boolean;
    FileName?: string;
    Left?: number;
    Top?: number;
}

export interface OutputGroup {
    Outputs?: (Output[] | null)[] | null;
}

export interface Output {
    Url?: string;
    Interface?: string;
    Outputs?: InnerOutput[] | null;
}

export interface InnerOutput {
    Url?: string;
    Interface?: string;
}

export type TitanJson = TitanJsonEntry[];
