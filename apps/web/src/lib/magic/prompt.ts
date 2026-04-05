import type { ComponentSummary } from '@21st/types';

// ═══════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════

interface GenerationContext {
  framework: 'next' | 'vite' | 'remix';
  projectDeps: string[];
  tailwindConfig?: string;
  registryContext?: {
    components: Array<{ name: string; description: string; source?: string }>;
  };
}

export function buildSystemPrompt(ctx: GenerationContext): string {
  const depsList = ctx.projectDeps.length
    ? `\n\nAvailable project dependencies:\n${ctx.projectDeps.map(d => `- ${d}`).join('\n')}`
    : '';

  const registrySection = ctx.registryContext?.components?.length
    ? `\n\n## Existing Registry Components for Reference\n${ctx.registryContext.components.map(c =>
        `### ${c.name}\n${c.description}\n${c.source ? `\`\`\`tsx\n${c.source.slice(0, 3000)}\n\`\`\`` : ''}`
      ).join('\n\n')}`
    : '';

  return `You are an expert React/TypeScript UI component engineer for 21st.dev.

## Absolute Rules
1. Output ONLY valid TSX code — no markdown fences, no explanations, no comments about the code.
2. Use Tailwind CSS classes exclusively for styling. No inline styles, no CSS modules.
3. Use shadcn/ui primitives when appropriate (import from "@/components/ui/...").
4. Use CSS variables for theming: --background, --foreground, --primary, --secondary, --accent, --muted, --border, --ring.
5. The component must be a single default export.
6. Include all necessary imports at the top.
7. Use TypeScript with proper type annotations.
8. The component must be self-contained and work without external state management.
9. Framework: ${ctx.framework === 'next' ? 'Next.js (App Router)' : ctx.framework}
10. Make the component visually impressive — use modern design patterns, gradients, glass effects, micro-animations.

## Quality Standards
- Responsive by default (mobile-first)
- Accessible (proper ARIA attributes, keyboard navigation)
- Dark mode compatible via CSS variables
- Clean, production-ready code

${depsList}${registrySection}`;
}
