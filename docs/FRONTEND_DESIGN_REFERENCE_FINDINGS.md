# Frontend Design Reference Findings

## Reference

- Linktree public website: https://linktr.ee/

## Observed patterns

The public Linktree homepage uses a high-contrast, editorial visual system rather than a generic dashboard treatment. Its hero uses a saturated lime background, dark oversized display typography, a white pill-shaped navigation container, and one strong dark rounded CTA. The page uses asymmetry: copy and the primary action are on one side while a large rounded image card occupies the other side.

The navigation is compact and easy to scan. The main actions are visually distinct from the secondary links, and the desktop navigation is contained inside a white rounded capsule that remains readable against the high-color background.

Content is organized into large, clearly separated sections with short headings and a single primary action per section. Repeated CTAs use consistent styling. Social proof is presented through a logo/profile grid and short testimonial blocks rather than dense data tables.

The visual language relies on a small number of deliberate shapes: large corner radii, pill controls, image cards, and generous whitespace. Contrast is strong: dark text on bright color fields, white content surfaces when needed, and dark buttons for emphasis.

## ApplyAi translation

For ApplyAi, the appropriate adaptation is not to copy the lime palette or creator-focused imagery literally. The useful principles are: a bold accent surface for the hero or high-priority state, a readable light content canvas, strong dark text, rounded surfaces, clear primary actions, asymmetrical dashboard composition, and simplified section hierarchy.

The existing app is authenticated and task-oriented, so the redesign should preserve the persistent sidebar and functional density. It should introduce a more editorial page header, a consistent accent gradient, clearer primary/secondary button contrast, elevated cards with subtle shadows, and compact status pills. Sign-in and onboarding should use the same tokens but remain focused and trustworthy.

## Motion and performance constraints

Use CSS transitions for frequent interactions and reserve GSAP for one-time page-intro or hero reveals only if needed. Animate only opacity and transform, keep durations below 300ms, gate non-essential animation with `prefers-reduced-motion`, and avoid layout-affecting animation. Do not add large image/video assets solely for decoration. Preserve the existing build and route structure.
