---
name: Linker High-Fidelity Messaging
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#414755'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#5d5e60'
  on-secondary: '#ffffff'
  secondary-container: '#dfdfe1'
  on-secondary-container: '#616365'
  tertiary: '#006672'
  on-tertiary: '#ffffff'
  tertiary-container: '#00818f'
  on-tertiary-container: '#f7feff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#e2e2e4'
  secondary-fixed-dim: '#c6c6c8'
  on-secondary-fixed: '#1a1c1d'
  on-secondary-fixed-variant: '#454749'
  tertiary-fixed: '#9af0ff'
  tertiary-fixed-dim: '#46d8ee'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
  me-bubble: '#007AFF'
  partner-bubble: '#E9E9EB'
  partner-text: '#1C1C1E'
  system-background: '#FFFFFF'
  glass-blur: rgba(255, 255, 255, 0.7)
  sky-gradient-start: '#2AC7DC'
  sky-gradient-end: '#007AFF'
typography:
  display-lg:
    fontFamily: metropolis
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: metropolis
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-text:
    fontFamily: inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 13px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-edge: 16px
  bubble-gap-same: 2px
  bubble-gap-different: 12px
  header-height: 88px
  input-min-height: 44px
---

## Brand & Style

The design system is centered on the concept of the **"Private Sanctuary."** It is an ultra-premium, zero-knowledge environment designed exclusively for two people. The brand personality is clinical yet intimate—combining the sterile security of high-end encryption with the warmth of a dedicated personal connection.

The visual direction follows a **Corporate / Modern** aesthetic with heavy **Glassmorphic** influences. It mimics the native iOS Human Interface Guidelines (HIG) to leverage user familiarity and inherent trust in the platform's security. The UI should feel lightweight, utilizing depth through translucency rather than heavy shadows, ensuring the conversation remains the singular focus.

## Colors

The palette is strictly anchored in Apple’s functional color language. 

- **Primary:** The iconic Apple Royal Blue (#007AFF) is reserved for 'Me' messages and primary action triggers.
- **Secondary:** Light Gray (#E9E9EB) provides a neutral, non-distracting container for the 'Partner' messages.
- **Tertiary:** A Sky Blue gradient derived from the application icon acts as a branding accent for the onboarding flow and launcher states.
- **Surface Strategy:** Backgrounds are pure white or system-grouped gray. Navigation headers and the message input bar must utilize a translucent background-blur effect to allow message content to peak through as it scrolls.

## Typography

This design system uses **Metropolis** for display and headline levels to achieve the geometric precision of SF Pro Display, while **Inter** is utilized for body and UI labels to ensure maximum legibility and a systematic, utilitarian feel.

- **Scale:** All sizing follows the 4pt grid logic. 
- **Tracking:** Headings use tighter tracking (-0.02em) to feel premium and compact.
- **Alignment:** Chat typography is strictly left or right justified based on the sender to reinforce the spatial 1:1 logic.
- **Emojis:** System-wide Apple Emoji rendering is mandatory for all text strings to maintain a consistent emotional baseline.

## Layout & Spacing

The layout is a **Fixed Grid** model optimized for mobile-first 1:1 interaction. 

- **The Chat Timeline:** A single-column vertical feed. 
- **Margins:** Standard 16px horizontal margins for the main container.
- **Bubble Logic:** Spacing between consecutive messages from the same sender is 2px. When the sender changes, the gap increases to 12px.
- **Adaptive Reflow:** On larger devices (tablets), the chat viewport remains centered with a max-width of 600px to maintain the intimacy of the 1:1 format.
- **Safe Areas:** Strict adherence to iOS top notch and bottom "home indicator" safe areas is required.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and layering rather than traditional drop shadows.

1. **Base Layer:** The Chat Wallpaper (Personalized or Neutral).
2. **Content Layer:** Chat bubbles with flat fills (no shadows).
3. **Overlay Layer:** Headers and Input bars. These use a `backdrop-filter: blur(20px)` with a 70% opacity white tint. 
4. **Modals:** Slide-up sheets for settings use a soft 10% black ambient shadow to separate the utility layer from the conversation layer.

## Shapes

The shape language is sophisticated and specific to the messenger category.

- **Standard Containers:** UI elements like cards or buttons use a 0.5rem (8px) radius.
- **Message Bubbles (Me):** 18px corner radius on three sides, with a sharp 4px anchor on the bottom-right corner.
- **Message Bubbles (Partner):** 18px corner radius on three sides, with a sharp 4px anchor on the bottom-left corner.
- **Input Fields:** Fully pill-shaped (rounded-full) to encourage a friendly, approachable touch target.

## Components

### Chat Bubbles
- **Sender:** Royal Blue background, White text. Tail on the bottom right.
- **Receiver:** Light Gray background, Charcoal text. Tail on the bottom left.
- **Status:** "Delivered" or "Read" labels appear in 11px Inter, 4px below the final bubble in a sequence.

### Interaction Elements
- **Buttons:** Primary buttons use the Sky Blue gradient with 600 weight text.
- **Input Bar:** A persistent white bar with a blur effect. The "Send" button is a 32px circular icon that only highlights when text is present.
- **Avatars:** Circular (1:1 aspect ratio). In this system, only the partner's avatar is shown to maximize space, positioned to the left of their message clusters.

### Onboarding "The Link"
- **Pairing View:** A centered, high-contrast numeric input field for the partner's phone number. The interface remains "empty" and focused until the link is established.