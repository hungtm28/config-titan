'use server';

import type { ConfiguratorValues, TitanJson } from './definitions';
import { headers } from 'next/headers';
import ipMappingRules from './ip-mapping-rules.json';

// Helper to get base URL
async function getBaseUrl() {
  const heads = headers();
  const protocol = heads.get('x-forwarded-proto') || 'http';
  const host = heads.get('host');
  return `${protocol}://${host}`;
}

export async function getTemplateFileNames(): Promise<string[]> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/templates/index.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to fetch template index: ${response.statusText}`);
    const data = await response.json();
    return data.templates?.filter((t: string) => !t.toLowerCase().endsWith('index.json')) || [];
  } catch (error) {
    console.error('Error fetching template file names:', error);
    return [];
  }
}

async function getTemplateContent(templateName: string): Promise<any> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/templates/${templateName}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Template file not found: ${templateName}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching template content for ${templateName}:`, error);
    throw new Error(`Failed to load template: ${templateName}`);
  }
}

function isCaptureIp(url: string): boolean {
  if (!url || !url.endsWith(':30120')) return false;
  const captureIpPrefixes = ['udp://225.1.9.', 'udp://225.11.99.', 'udp://225.1.19.', 'udp://225.11.19.', 'udp://225.11.91.'];
  return captureIpPrefixes.some(prefix => url.startsWith(prefix));
}

function resolveTemplateVariant(templateName?: string): 'A' | 'B' | '' {
  const candidate = templateName || '';
  const upper = candidate.toUpperCase();
  
  if (upper.includes('_A')) return 'A';
  if (upper.includes('_B')) return 'B';
  if (upper.includes('4KA')) return 'A';
  if (upper.includes('4KB')) return 'B';
  
  return '';
}

function isMergedTemplate(templateName?: string): boolean {
  const candidate = templateName || '';
  const upper = candidate.toUpperCase();
  return upper.includes('4KA') || upper.includes('4KB');
}

function getIpFromUrl(url: string): string | undefined {
  if (!url || !url.startsWith('udp://')) return undefined;

  const urlParts = url.split(':');
  if (urlParts.length !== 3) return undefined;

  const ip = urlParts[1].substring(2);
  return ip.split('.').length === 4 ? ip : undefined;
}

function getInputListIps(item: any): Set<string> {
  const inputListIps = new Set<string>();
  const inputGroups = Array.isArray(item?.Input) ? item.Input : [];

  inputGroups.forEach((inputGroup: any) => {
    const inputList = Array.isArray(inputGroup?.IPInputList) ? inputGroup.IPInputList : [];
    inputList.forEach((input: any) => {
      const ip = getIpFromUrl(input?.Url);
      if (ip) inputListIps.add(ip);
    });
  });

  return inputListIps;
}

function processIpData(url: string, values: ConfiguratorValues, templateName?: string, specificRule?: string, useAlternativeSite = false, isMerged = false, inputListIps = new Set<string>()): { newUrl: string, newVlan?: string, appliedRule?: string } {
    if (!url || !url.startsWith('udp://')) return { newUrl: url };

    const urlParts = url.split(':');
    if (urlParts.length !== 3) return { newUrl: url };
    
    const originalPort = urlParts[2];
    const currentIp = urlParts[1].substring(2);
    const ipParts = currentIp.split('.');
    if (ipParts.length !== 4) return { newUrl: url };
    if (inputListIps.has(currentIp)) return { newUrl: url };
    
    const rules: any = ipMappingRules;
    const templateCodec = resolveCodecFromName(templateName);
    const templateVariant = resolveTemplateVariant(templateName);
    const ruleOrder = specificRule ? [specificRule] : ["IPTV_4K", "IPTV", "OTT", "DRM", "CaptureLogo", "CaptureNoLogo", "Mono"];

    for (const key of ruleOrder) {
        if (!rules[key]) continue;

        for (const ruleConfig of rules[key].rules) {
            // 1. Check IP pattern match
            const isMatch = (ruleConfig.input_patterns?.some((p: string) => currentIp.startsWith(p))) || 
                            (ruleConfig.input_pattern && currentIp.startsWith(ruleConfig.input_pattern)) ||
                            (ruleConfig.input_pattern_prefix && currentIp.startsWith(ruleConfig.input_pattern_prefix));

            const portMatch = ruleConfig.port ? ruleConfig.port === parseInt(originalPort, 10) : true;

            if (!isMatch || !portMatch) continue;

            // 2. Check site match (if rule specifies a site)
            if (ruleConfig.site) {
                const targetSite = useAlternativeSite ? (values.site === 'HN' ? 'HCM' : 'HN') : values.site;
                if (ruleConfig.site !== targetSite) continue;
            }

            // 3. Check templatePattern match (for DRM codec selection)
            if (ruleConfig.templatePattern) {
                if (templateCodec !== ruleConfig.templatePattern) continue;
            }

            // 4. Check templateCodec + templateVariant match (for CaptureLogo, CaptureNoLogo on merged templates only)
            if ((ruleConfig.templateCodec || ruleConfig.templateVariant) && isMerged) {
                if (ruleConfig.templateCodec) {
                    if (templateCodec !== ruleConfig.templateCodec) continue;
                }
                if (ruleConfig.templateVariant) {
                    if (templateVariant !== ruleConfig.templateVariant) continue;
                }
            }

            // 5. Apply rule with direct url field (new structure: DRM, CaptureLogo, CaptureNoLogo)
            if (ruleConfig.url && !ruleConfig.site_outputs) {
                let finalUrlSegment = ruleConfig.url;
                const outputVlan = ruleConfig.vlan;
                
                const valueMap = ruleConfig.valueMap;
                const lookupKey = String(values.ipOutput);
                let mappedValue = lookupKey;

                if (valueMap && (lookupKey in valueMap)) {
                    mappedValue = valueMap[lookupKey];
                }
                finalUrlSegment = finalUrlSegment.replace('{{mapped_value}}', mappedValue);
                
                const newUrl = `udp://${finalUrlSegment}`;
                return { newUrl, newVlan: outputVlan, appliedRule: key };
            }

            // 6. Apply rule with site_outputs (legacy structure: IPTV, OTT, IPTV_4K)
            if (ruleConfig.site_outputs) {
                const targetSite = useAlternativeSite ? (values.site === 'HN' ? 'HCM' : 'HN') : values.site;
                const siteOutput = ruleConfig.site_outputs[targetSite];

                if (!siteOutput) continue;

                let finalUrlSegment = siteOutput.url;
                const outputVlan = siteOutput.vlan;
                
                if ([ 'IPTV', 'OTT'].includes(key)) {
                    finalUrlSegment = finalUrlSegment.replace('{{x}}', values.ipOutput);
                } else if (['IPTV_4K', 'CaptureLogo', 'CaptureNoLogo', 'Mono'].includes(key)) {
                    const valueMap = ruleConfig.valueMap;
                    const lookupKey = String(values.ipOutput);
                    let mappedValue = lookupKey;

                    if (valueMap && (lookupKey in valueMap)) {
                        mappedValue = valueMap[lookupKey];
                    }
                    finalUrlSegment = finalUrlSegment.replace('{{mapped_value}}', mappedValue);
                }
                
                const newUrl = finalUrlSegment.includes(':') ? `udp://${finalUrlSegment}` : `udp://${finalUrlSegment}:${originalPort}`;

                return { newUrl, newVlan: outputVlan, appliedRule: key };
            }
        }
    }

    return { newUrl: url };
}

function resolveCodecFromName(name?: string): 'H264' | 'H265' | '' {
  const candidate = name || '';
  const upper = candidate.toUpperCase();

  if (upper.includes('H265')) return 'H265';
  if (upper.includes('H264')) return 'H264';

  return '';
}

function isEplTemplate(templateName?: string): boolean {
  return (templateName || '').toUpperCase().startsWith('EPL_');
}

function buildGeneratedName(site: string, templateName: string, ipOutput: string, codec = ''): string {
  const eplPrefix = isEplTemplate(templateName) ? 'EPL_' : '';
  return `${eplPrefix}${site}_${templateName.replace(/\.json/i, '')}_${ipOutput}${codec ? `_${codec}` : ''}`;
}

export async function generateJson(values: ConfiguratorValues): Promise<string> {
  try {
    const json: TitanJson = await getTemplateContent(values.template);
    const mergedTemplate = isMergedTemplate(values.template);
    const seenUrls = new Set<string>();

    if (Array.isArray(json)) {
      for (const item of json) {
        if (!item) continue;

        const itemName = item?.Name || item?.Device?.Template?.Name || '';
        const inputListIps = getInputListIps(item);
        const codec = resolveCodecFromName(itemName);
        const newName = buildGeneratedName(values.site, values.template, values.ipOutput, codec);

        if (item.Name) item.Name = newName;

        const urlToRuleMap = new Map<string, 'CaptureLogo' | 'CaptureNoLogo'>();

        if (values.ipType === 'DRM') {
          const variantLogoStatus = new Map<number, boolean>();
          const videoTrack = item?.Device?.Template?.Tracks?.VideoTracks?.[0];
          if (videoTrack?.Variants && Array.isArray(videoTrack.Variants)) {
            videoTrack.Variants.forEach((variant: any, index: number) => {
              const hasLogo = variant?.LogoInsertions?.some((logo: any) => logo?.Enable === true) ?? false;
              variantLogoStatus.set(index, hasLogo);
            });
          }

          const outputToVariantMap = new Map<number, number>();
          const muxerProfiles = item?.Device?.Template?.FormatConfigurations?.[0]?.TSMuxer?.Profiles;
          if (muxerProfiles && Array.isArray(muxerProfiles)) {
            muxerProfiles.forEach((profile: any, index: number) => {
              const variantIdx = profile?.TracksMapping?.VideoTrackList?.[0]?.VariantIdx;
              if (variantIdx !== undefined) {
                outputToVariantMap.set(index, variantIdx);
              }
            });
          }

          const outputsList = item?.Outputs?.[0];
          if (outputsList && Array.isArray(outputsList)) {
            outputsList.forEach((outputConfig: any, index: number) => {
              const url = outputConfig?.Outputs?.[0]?.Url;
              if (url && typeof url === 'string' && isCaptureIp(url)) {
                const variantIndex = outputToVariantMap.get(index);
                if (variantIndex !== undefined) {
                  const hasLogo = variantLogoStatus.get(variantIndex) ?? false;
                  urlToRuleMap.set(url, hasLogo ? 'CaptureLogo' : 'CaptureNoLogo');
                } else {
                  // If variant index not found, default to CaptureNoLogo
                  urlToRuleMap.set(url, 'CaptureNoLogo');
                }
              }
            });
          }
        }

        const processUrlsRecursively = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;

          if (obj.Url && typeof obj.Url === 'string') {
            let ruleForProcessing: 'CaptureLogo' | 'CaptureNoLogo' | undefined = undefined;

            if (isCaptureIp(obj.Url)) {
              if (values.ipType === 'DRM') {
                ruleForProcessing = urlToRuleMap.get(obj.Url);
              } else {
                ruleForProcessing = 'CaptureNoLogo';
              }
            }

            let { newUrl, newVlan } = processIpData(obj.Url, values, itemName, ruleForProcessing, false, mergedTemplate, inputListIps);

            if (seenUrls.has(newUrl) && values.ipType !== 'DRM') {
              const alternativeResult = processIpData(obj.Url, values, itemName, ruleForProcessing, true, mergedTemplate, inputListIps);
              newUrl = alternativeResult.newUrl;
              newVlan = alternativeResult.newVlan;
            }
            
            seenUrls.add(newUrl);
            obj.Url = newUrl;
            if (newVlan) obj.Interface = newVlan;
          }

          if (Array.isArray(obj)) {
            obj.forEach(processUrlsRecursively);
          } else {
            Object.values(obj).forEach(processUrlsRecursively);
          }
        };
        
        processUrlsRecursively(item);

        if (item.Device?.Template?.Name) item.Device.Template.Name = newName;

        const isAnyLogoEnabledInProfile = item?.Device?.Template?.Tracks?.VideoTracks?.[0]?.Variants?.some((v: any) => v?.LogoInsertions?.some((l: any) => l.Enable === true));

        if (values.logo && isAnyLogoEnabledInProfile) {
          const getPosition = (logoPosition: string) => {
            const positions: { [key: string]: { Left: number, Top: number } } = {
              'top-right': { Left: 830, Top: 60 }, 'bottom-right': { Left: 830, Top: 858 },
              'top-left': { Left: 72, Top: 60 }, 'bottom-left': { Left: 72, Top: 858 },
              'epl': { Left: 836, Top: 810 }
            };
            return positions[logoPosition] || positions['top-right'];
          };

          const processLogoInsertions = (logoInsertions: any[]) => {
            logoInsertions.forEach(logo => {
              if (logo?.Enable === true && logo.FileName && !['A_OTT', 'B_OTT', 'JAS-DID', 'IPTV'].some(term => logo.FileName.includes(term))) {
                logo.FileName = values.logo;
                if (values.logoPosition) {
                  const { Left, Top } = getPosition(values.logoPosition);
                  logo.Left = Left;
                  logo.Top = Top;
                }
              }
            });
          };

          item.Device?.Template?.Tracks?.VideoTracks?.forEach((videoTrack:any) => {
            videoTrack?.Variants?.forEach((variant:any) => {
              if (variant?.LogoInsertions) processLogoInsertions(variant.LogoInsertions);
            });
          });
        }
      }
    }
    
    return JSON.stringify(json, null, 2);

  } catch (error) {
    console.error('Error in generateJson:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate JSON file.');
  }
}
