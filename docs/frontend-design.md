# Linoryx frontend design

The approved Linoryx reference defines a light-only enterprise workspace: charcoal typography, terracotta identity, warm ivory backgrounds, warm gray borders and Inter. The existing screens and business workflows remain in the React feature structure.

## Shared design system

All raw UI colors live in [tokens.css](../linoryx-web/src/tokens.css), organized as brand primitives, semantic roles and component aliases. Application CSS uses those variables. PDF exports resolve colors from the same stylesheet and use self-hosted static Inter fonts. The web UI uses the Inter variable font, including regular, medium, semibold and bold weights.

Exact terracotta is used in the logo and chart accents. Small action text and links use darker derived tones for AA contrast. Success, warning, error and information keep separate semantic colors. The light sidebar, white cards and ivory canvas share a 4px spacing rhythm, restrained borders and consistent radii. Forms and search controls have visible boundaries and focus indicators.

There is one color scheme, declared as light-only in the document and CSS. There is no theme provider, theme toggle, persisted theme preference or operating-system color-scheme branch. Reduced-motion preferences remain supported.

## Components and layouts

- Navigation retains role-scoped links. A desktop sidebar becomes a wrapping header on smaller screens.
- Tables share headings, search, filters, selection, pagination, hover states and semantic badges. Wide tables scroll inside their panels; reports adapt to stacked fields in narrow containers.
- Shared FormDialog owns modal headings, body scrolling, actions, focus management and Escape dismissal. Parent/child dialogs retain their existing behavior.
- Authentication uses a white form panel on roughly one third of the desktop width (at least 400px) and the supplied red artwork in the remaining space. The artwork panel contains only a centered SVG card, without promotional copy. Both auth screens stack on smaller displays. The gently floating card shows the form's live name/email values and masked password length; the float is disabled for reduced-motion preferences.
- Dashboard charts use flat fills and the central tokens. Existing chart periods and legend controls remain functional.
- Network and technician maps retain location behavior and provider attribution. Map markers use the shared accent and status tokens.
- Empty, loading, notice and error states inherit the same typography, surfaces and accessible semantic colors.

The visual treatment replaces the prior frontend direction. The pre-existing CSS attribution to [unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0, remains in the relevant source comments.

See [brand guidelines](brand-guidelines.md) for asset usage and compatibility exceptions, and [validation](rebrand-validation.md) for the actual checks performed.
