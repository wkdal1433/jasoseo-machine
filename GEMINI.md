# Gemini Project Rules

## 🎨 Iconography Standards
- **Unified Icon Library**: All icons in this project must use the **Lucide-react** library.
- **No Emojis**: Do not use raw text emojis for UI elements.
- **No Inline SVGs**: Avoid hardcoding SVG paths directly in component files. Use the corresponding Lucide component instead.
- **Consistency**: Maintain consistent size and stroke width across all icons (default: `size={20}`, `strokeWidth={2}`).

## 🛠 Usage Example
```tsx
import { Rocket } from 'lucide-react';

const MyComponent = () => (
  <button>
    <Rocket size={16} />
    Launch
  </button>
);
```
