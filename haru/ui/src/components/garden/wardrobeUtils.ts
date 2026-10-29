import { KiroAgentOption, KiroModelOption } from '../../types/haru';

export type AgentGearId =
  | 'worker'
  | 'research'
  | 'conductor'
  | 'executor'
  | 'coder'
  | 'reviewer'
  | 'creative'
  | 'explorer'
  | 'wizard'
  | 'chef'
  | 'botanist'
  | 'gamer'
  | 'pilot'
  | 'royal';

export type ModelStyleId =
  | 'celestial'
  | 'cyber'
  | 'shinobi'
  | 'dragon'
  | 'prism'
  | 'solar'
  | 'breeze'
  | 'classic'
  | 'angel'
  | 'galaxy'
  | 'phoenix'
  | 'frost';

export interface AgentGearDef {
  id: AgentGearId;
  label: string;
  emoji: string;
  hat: string;
  tool: string;
  description: string;
}

export interface ModelStyleDef {
  id: ModelStyleId;
  label: string;
  emoji: string;
  headpiece: string;
  aura: string;
  description: string;
}

export const AGENT_GEAR_CATALOG: AgentGearDef[] = [
  { id: 'worker', label: 'Builder', emoji: '👷', hat: 'Hardhat', tool: 'Golden Wrench', description: 'Yellow construction hardhat & golden wrench' },
  { id: 'research', label: 'Scholar', emoji: '🔬', hat: 'Spectacles', tool: 'Ancient Scroll', description: 'Brass research goggles & wisdom scroll' },
  { id: 'conductor', label: 'Maestro', emoji: '🎩', hat: 'Conductor Cap', tool: 'Sparkle Baton', description: 'Starry peaked cap & sparkle baton' },
  { id: 'executor', label: 'Runner', emoji: '🏃', hat: 'Speed Bandana', tool: 'Task Board', description: 'Red speed headband & task checklist' },
  { id: 'coder', label: 'Hacker', emoji: '🎧', hat: 'Over-Ear Headphones', tool: 'Cyber Key', description: 'Gaming headphones & glowing cyber key' },
  { id: 'reviewer', label: 'Detective', emoji: '🕵️', hat: 'Deerstalker', tool: 'Inspection Badge', description: 'Sherlock houndstooth cap & magnifying badge' },
  { id: 'creative', label: 'Artist', emoji: '🎨', hat: 'Pastel Beret', tool: 'Paintbrush', description: 'Pastel artist beret & colorful paint brush' },
  { id: 'explorer', label: 'Scout', emoji: '🎒', hat: 'Leaf Bandana', tool: 'Pocket Compass', description: 'Explorer bandana & acorn scout compass' },
  { id: 'wizard', label: 'Sorcerer', emoji: '🧙', hat: 'Pointed Wizard Hat', tool: 'Magic Wand', description: 'Midnight purple star hat & glowing crystal wand' },
  { id: 'chef', label: 'Gourmet', emoji: '🧑‍🍳', hat: 'Puffy Chef Toque', tool: 'Wooden Spoon', description: 'Crisp white baker toque & sweet tasting spoon' },
  { id: 'botanist', label: 'Gardener', emoji: '🌸', hat: 'Flower Wreath', tool: 'Watering Can', description: 'Blossom flower crown & silver watering can' },
  { id: 'gamer', label: 'Arcade', emoji: '🎮', hat: 'Cat-Ear Headset', tool: 'Retro Pad', description: 'Pastel cat-ear headset & mini retro controller' },
  { id: 'pilot', label: 'Aviator', emoji: '✈️', hat: 'Aviator Goggles', tool: 'Brass Compass', description: 'Leather flying helmet with goggles & wind compass' },
  { id: 'royal', label: 'Monarch', emoji: '👑', hat: 'Golden Tiara', tool: 'Royal Scepter', description: 'Jeweled gold crown & diamond topped scepter' },
];

export const MODEL_STYLE_CATALOG: ModelStyleDef[] = [
  { id: 'celestial', label: 'Celestial Royalty', emoji: '👑', headpiece: 'Royal Crown', aura: 'Purple Starlight', description: 'Floating royal star crown with orbiting starlight' },
  { id: 'cyber', label: 'Cyber Matrix', emoji: '🥽', headpiece: 'Cyber Visor', aura: 'Cyan Digital Sparks', description: 'High-tech neon cyan visor & digital sparks' },
  { id: 'shinobi', label: 'Shinobi Flame', emoji: '🥷', headpiece: 'Ninja Protector', aura: 'Crimson Wind', description: 'Crimson shinobi forehead protector & wind chakra' },
  { id: 'dragon', label: 'Dragon Spirit', emoji: '🐉', headpiece: 'Pastel Horns', aura: 'Ember Wisps', description: 'Cute mythical dragon horns with flame embers' },
  { id: 'prism', label: 'Prism Halo', emoji: '🌈', headpiece: 'Rainbow Crystal', aura: 'Prismatic Ring', description: 'Iridescent rainbow crystal gem & gentle halo' },
  { id: 'solar', label: 'Solar Flare', emoji: '☀️', headpiece: 'Sun Tiara', aura: 'Golden Radiance', description: 'Sunny warm radiance ring & golden crown' },
  { id: 'breeze', label: 'Mint Breeze', emoji: '🍃', headpiece: 'Wing Clips', aura: 'Speed Lines', description: 'Feathered ear wings with fast mint breeze lines' },
  { id: 'angel', label: 'Angelic Wings', emoji: '🪽', headpiece: 'Golden Halo', aura: 'Feather Wisps', description: 'Glowing golden angel halo & gentle fluttering wings' },
  { id: 'galaxy', label: 'Cosmic Nebula', emoji: '🌌', headpiece: 'Moon Crescent', aura: 'Orbiting Moons', description: 'Glowing lunar crescent with orbiting mini moons' },
  { id: 'phoenix', label: 'Phoenix Blaze', emoji: '🔥', headpiece: 'Flame Crest', aura: 'Fiery Sparks', description: 'Golden flame feather crest & rising warm embers' },
  { id: 'frost', label: 'Crystal Frost', emoji: '❄️', headpiece: 'Ice Antlers', aura: 'Snowflakes', description: 'Glistening frosted crystal horns & gentle falling snow' },
  { id: 'classic', label: 'Pure Sprout', emoji: '🌱', headpiece: 'Healthy Leaf', aura: 'Gentle Glow', description: 'Classic clean green Mochi Bud sprout & orange antennae' },
];

/**
 * Smart Heuristic: maps any agent name/id/description to one of the gears
 */
export function heuristicAgentGear(agent: KiroAgentOption | string): AgentGearId {
  const text = (typeof agent === 'string' ? agent : `${agent.id} ${agent.name} ${agent.description || ''}`).toLowerCase();
  
  if (text.includes('magic') || text.includes('wizard') || text.includes('spell') || text.includes('ai') || text.includes('synth')) {
    return 'wizard';
  }
  if (text.includes('cook') || text.includes('food') || text.includes('recipe') || text.includes('chef')) {
    return 'chef';
  }
  if (text.includes('plant') || text.includes('garden') || text.includes('nature') || text.includes('bio')) {
    return 'botanist';
  }
  if (text.includes('game') || text.includes('play') || text.includes('stream') || text.includes('fun')) {
    return 'gamer';
  }
  if (text.includes('fly') || text.includes('pilot') || text.includes('cloud') || text.includes('air')) {
    return 'pilot';
  }
  if (text.includes('king') || text.includes('queen') || text.includes('chief') || text.includes('lead') || text.includes('boss')) {
    return 'royal';
  }
  if (text.includes('work') || text.includes('build') || text.includes('exec') || text.includes('task')) {
    return text.includes('exec') ? 'executor' : 'worker';
  }
  if (text.includes('research') || text.includes('search') || text.includes('doc') || text.includes('anal')) {
    return 'research';
  }
  if (text.includes('conduct') || text.includes('orchestrat') || text.includes('plan')) {
    return 'conductor';
  }
  if (text.includes('code') || text.includes('dev') || text.includes('program') || text.includes('eng')) {
    return 'coder';
  }
  if (text.includes('review') || text.includes('qa') || text.includes('test') || text.includes('audit')) {
    return 'reviewer';
  }
  if (text.includes('art') || text.includes('design') || text.includes('ui') || text.includes('creativ')) {
    return 'creative';
  }
  if (text.includes('run') || text.includes('speed') || text.includes('fast')) {
    return 'executor';
  }
  return 'explorer';
}

/**
 * Smart Heuristic: maps any model name/id/provider to one of the model styles
 */
export function heuristicModelStyle(model: KiroModelOption | string): ModelStyleId {
  const id = typeof model === 'string' ? model.toLowerCase() : model.id.toLowerCase();
  const label = typeof model === 'string' ? model.toLowerCase() : (model.label || '').toLowerCase();
  const full = `${id} ${label}`;

  if (full === 'auto' || id === 'auto') return 'prism';
  if (full.includes('opus') || full.includes('sonnet') || full.includes('1m') || full.includes('gpt-4')) {
    return 'celestial';
  }
  if (full.includes('deepseek') || full.includes('reason') || full.includes('r1') || full.includes('o1')) {
    return 'cyber';
  }
  if (full.includes('coder') || full.includes('qwen') || full.includes('codestral')) {
    return 'shinobi';
  }
  if (full.includes('minimax') || full.includes('glm') || full.includes('kimi')) {
    return 'dragon';
  }
  if (full.includes('gemini') || full.includes('angel')) {
    return 'angel';
  }
  if (full.includes('nova') || full.includes('galaxy') || full.includes('space')) {
    return 'galaxy';
  }
  if (full.includes('claude-3-5') || full.includes('phoenix') || full.includes('blaze')) {
    return 'phoenix';
  }
  if (full.includes('frost') || full.includes('mistral') || full.includes('cold')) {
    return 'frost';
  }
  if (full.includes('haiku') || full.includes('flash') || full.includes('lite') || full.includes('small')) {
    return 'breeze';
  }
  if (full.includes('solar') || full.includes('llama')) {
    return 'solar';
  }
  return 'classic';
}

/**
 * Resolves outfit for an agent taking into account custom overrides first
 */
export function resolveAgentGear(
  agentId: string,
  agents: KiroAgentOption[],
  customMap?: Record<string, AgentGearId>
): AgentGearId {
  if (customMap && customMap[agentId]) {
    return customMap[agentId];
  }
  const matched = agents.find((a) => a.id === agentId);
  return heuristicAgentGear(matched || agentId);
}

/**
 * Resolves model aura/style taking into account custom overrides first
 */
export function resolveModelStyle(
  modelId: string,
  models: KiroModelOption[],
  customMap?: Record<string, ModelStyleId>
): ModelStyleId {
  if (customMap && customMap[modelId]) {
    return customMap[modelId];
  }
  const matched = models.find((m) => m.id === modelId);
  return heuristicModelStyle(matched || modelId);
}

/**
 * Smart AI Stylist: builds a cohesive customized wardrobe map for all installed agents & models
 */
export function generateSmartRosterWardrobe(
  agents: KiroAgentOption[],
  models: KiroModelOption[]
): { agentGear: Record<string, AgentGearId>; modelStyle: Record<string, ModelStyleId> } {
  const agentGear: Record<string, AgentGearId> = {};
  const modelStyle: Record<string, ModelStyleId> = {};

  agents.forEach((a) => {
    agentGear[a.id] = heuristicAgentGear(a);
  });

  models.forEach((m) => {
    modelStyle[m.id] = heuristicModelStyle(m);
  });

  return { agentGear, modelStyle };
}
