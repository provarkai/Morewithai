import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export interface VisualContentRequest {
  type: 'FEATURED_IMAGE' | 'SOCIAL_CARD' | 'INFOGRAPHIC' | 'THUMBNAIL' | 'OPEN_GRAPH';
  articleId?: string;
  title: string;
  description?: string;
  style?: string;
  dimensions?: { width: number; height: number };
  brandColors?: { primary: string; secondary: string };
  text?: string; // Text overlay for cards
}

export interface VisualContentResult {
  id: string;
  type: string;
  prompt: string;
  revisedPrompt: string;
  imageUrl: string;
  width: number;
  height: number;
  altText: string;
  metadata: {
    model: string;
    style: string;
    generatedAt: string;
  };
}

export interface VisualTemplate {
  id: string;
  name: string;
  type: VisualContentRequest['type'];
  dimensions: { width: number; height: number };
  description: string;
  promptTemplate: string;
  styleOptions: string[];
}

// ─── Templates ──────────────────────────────────────────────

export const VISUAL_TEMPLATES: VisualTemplate[] = [
  {
    id: 'blog-featured',
    name: 'Blog Featured Image',
    type: 'FEATURED_IMAGE',
    dimensions: { width: 1200, height: 630 },
    description: 'Hero image for blog articles',
    promptTemplate: 'Professional blog featured image for "{title}". Clean, modern design with subtle gradients. No text.',
    styleOptions: ['photography', 'illustration', 'abstract', 'minimal'],
  },
  {
    id: 'twitter-card',
    name: 'Twitter/X Card',
    type: 'SOCIAL_CARD',
    dimensions: { width: 1200, height: 675 },
    description: 'Optimized for Twitter/X timeline',
    promptTemplate: 'Social media card for "{title}". Bold, eye-catching with space for text overlay.',
    styleOptions: ['bold', 'professional', 'creative', 'tech'],
  },
  {
    id: 'linkedin-card',
    name: 'LinkedIn Card',
    type: 'SOCIAL_CARD',
    dimensions: { width: 1200, height: 627 },
    description: 'Professional card for LinkedIn',
    promptTemplate: 'Professional LinkedIn card for "{title}". Corporate, clean, trustworthy.',
    styleOptions: ['corporate', 'modern', 'data-driven'],
  },
  {
    id: 'instagram-square',
    name: 'Instagram Square',
    type: 'SOCIAL_CARD',
    dimensions: { width: 1080, height: 1080 },
    description: 'Square format for Instagram feed',
    promptTemplate: 'Instagram-worthy square image for "{title}". Visually striking, scroll-stopping.',
    styleOptions: ['vibrant', 'minimal', 'photo', 'artistic'],
  },
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Thumbnail',
    type: 'THUMBNAIL',
    dimensions: { width: 1280, height: 720 },
    description: 'YouTube video thumbnail',
    promptTemplate: 'YouTube thumbnail for "{title}". Bold, high-contrast, expressive.',
    styleOptions: ['dramatic', 'colorful', 'professional', 'fun'],
  },
  {
    id: 'og-image',
    name: 'Open Graph Image',
    type: 'OPEN_GRAPH',
    dimensions: { width: 1200, height: 630 },
    description: 'Default social sharing image',
    promptTemplate: 'Open Graph image for "{title}". Brand-consistent, professional, readable at small sizes.',
    styleOptions: ['clean', 'branded', 'minimal'],
  },
];

// ─── Image Generation ───────────────────────────────────────

const IMAGE_PROMPT_SYSTEM = `You are an expert AI image prompt engineer. Create detailed, specific image generation prompts that produce high-quality, professional images.

Your prompts should be:
1. Specific and descriptive (not vague)
2. Include composition, lighting, color palette
3. Specify the style and mood
4. Avoid text in the image (unless specifically requested)
5. Be appropriate for the content type`;

export async function generateImagePrompt(
  request: VisualContentRequest,
): Promise<{ prompt: string; revisedPrompt: string }> {
  const template = VISUAL_TEMPLATES.find((t) => t.type === request.type);

  const userPrompt = `Generate an image generation prompt for:

Type: ${request.type}
Title: "${request.title}"
${request.description ? `Description: ${request.description}` : ''}
${request.style ? `Style: ${request.style}` : 'Style: professional'}
${request.text ? `Text overlay needed: "${request.text}"` : ''}
${request.brandColors ? `Brand colors: ${request.brandColors.primary}, ${request.brandColors.secondary}` : ''}
Dimensions: ${request.dimensions?.width || template?.dimensions.width || 1200}x${request.dimensions?.height || template?.dimensions.height || 630}

Template: ${template?.name || 'Custom'}

Return JSON:
{
  "prompt": "detailed image generation prompt",
  "revisedPrompt": "optimized version with specific artistic direction"
}

Return ONLY the JSON.`;

  const result = await callAI({
    siteId: 'global',
    jobType: 'IMAGE_PROMPT',
    systemPrompt: IMAGE_PROMPT_SYSTEM,
    userPrompt,
    temperature: 0.7,
    maxTokens: 500,
    responseFormat: 'json',
  });

  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }

  return {
    prompt: `Professional ${request.type.toLowerCase().replace(/_/g, ' ')} for "${request.title}". ${request.description || 'Clean, modern design.'}`,
    revisedPrompt: `High-quality ${request.style || 'professional'} style image for article titled "${request.title}". ${request.description || 'Clean composition with modern aesthetics.'}. No text, no watermarks, ${request.dimensions?.width || 1200}x${request.dimensions?.height || 630} resolution.`,
  };
}

/**
 * Generates visual content metadata and stores the request.
 * In production, this would call DALL-E, Stable Diffusion, or similar.
 */
export async function generateVisualContent(
  request: VisualContentRequest,
  siteId: string,
): Promise<VisualContentResult> {
  const { prompt, revisedPrompt } = await generateImagePrompt(request);
  const template = VISUAL_TEMPLATES.find((t) => t.type === request.type);

  // Store the generation request as a media record
  const media = await db.media.create({
    data: {
      siteId,
      fileName: `${request.type.toLowerCase()}-${Date.now()}.png`,
      originalName: `${request.title.slice(0, 50)}-${request.type}`,
      mimeType: 'image/png',
      fileSize: 0,
      url: `/api/visual/generate/${Date.now()}`, // Placeholder — actual generation happens in the action
      metadata: JSON.stringify({
        type: request.type,
        prompt: revisedPrompt,
        dimensions: request.dimensions || template?.dimensions,
        style: request.style || 'professional',
        articleId: request.articleId,
      }),
    },
  });

  const dimensions = request.dimensions || template?.dimensions || { width: 1200, height: 630 };

  return {
    id: media.id,
    type: request.type,
    prompt,
    revisedPrompt,
    imageUrl: media.url,
    width: dimensions.width,
    height: dimensions.height,
    altText: `Visual for: ${request.title}`,
    metadata: {
      model: 'dall-e-3',
      style: request.style || 'professional',
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get available templates for a given content type.
 */
export function getVisualTemplates(type?: VisualContentRequest['type']): VisualTemplate[] {
  if (type) {
    return VISUAL_TEMPLATES.filter((t) => t.type === type);
  }
  return VISUAL_TEMPLATES;
}

/**
 * Generates alt text for an image based on article context.
 */
export async function generateAltText(
  imageDescription: string,
  articleTitle: string,
  siteId: string,
): Promise<string> {
  const result = await callAI({
    siteId,
    jobType: 'ALT_TEXT',
    systemPrompt: 'Generate concise, descriptive alt text for images. Max 125 characters. Include relevant keywords naturally.',
    userPrompt: `Generate alt text for an image in this article:
Article: "${articleTitle}"
Image description: ${imageDescription}

Return ONLY the alt text string, no quotes or explanation.`,
    temperature: 0.3,
    maxTokens: 200,
  });

  return cleanAIResponse(result.content).slice(0, 125);
}
