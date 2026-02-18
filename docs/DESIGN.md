# Design System: Chimero HabitFlow
**Project:** Chimero HabitFlow - Cyberpunk Habit Tracking Application

## 1. Visual Theme & Atmosphere
**Chimero Cyberpunk Dark** - A sophisticated, low-contrast dark theme with purple accent highlights. The aesthetic blends modern cyberpunk aesthetics with functional data visualization, creating a moody, focused environment for habit tracking. The interface feels dense yet breathable, with careful use of negative space and subtle glow effects that activate on interaction.

## 2. Color Palette & Roles

### Core Backgrounds
- **Deep Space Background** (`hsl(210 35% 7%)`) - Primary application background, almost black with subtle blue undertones
- **Card Background** (`hsl(210 25% 11%)`) - Slightly lighter background for cards and containers
- **Secondary Background** (`hsl(210 20% 15%)`) - Input fields and interactive elements

### Primary Accents
- **Neon Purple** (`hsl(266 73% 63%)`) - Primary action color, used for buttons, highlights, and key interactive elements
- **Purple Glow** (`hsl(266 73% 63% / 0.2)`) - Subtle background accent for icon containers

### Supporting Colors
- **Muted Foreground** (`hsl(210 12% 47%)`) - Secondary text, labels, and descriptions
- **Primary Foreground** (`hsl(210 25% 97%)`) - Main text content and headings
- **Border Color** (`hsl(210 18% 22%)`) - Subtle borders for cards and inputs

### Status Colors
- **Success Emerald** (`#10b981`) - Positive correlations and success states
- **Danger Rose** (`#f43f5e`) - Negative correlations and destructive interference
- **Neutral Blue** (`#3b82f6`) - Neutral correlations and informational states

### Glow Effects
- **Green Glow** (`shadow-emerald-500/20`) - Positive result card highlighting
- **Red Glow** (`shadow-rose-500/20`) - Negative result card highlighting
- **Blue Glow** (`shadow-blue-500/20`) - Neutral result card highlighting

## 3. Typography Rules

### Font Families
- **Display Font** - 'Space Grotesk' for headings and large numbers (font-display class)
- **Body Font** - 'DM Sans' for regular text and UI elements
- **Monospace Font** - System monospace for data values and technical labels

### Typography Hierarchy
- **Main Headers** - 3xl font-display font-bold, Primary Foreground color
- **Section Headers** - lg font-semibold, Primary Foreground color  
- **Labels** - sm font-mono uppercase tracking-wider, Muted Foreground color
- **Body Text** - Base font-normal, Primary Foreground color
- **Data Values** - font-mono, Primary Foreground color for emphasis

## 4. Component Stylings

### Buttons
- **Primary Actions** - Neon Purple background, white text, rounded-lg corners, hover state with darker purple
- **Secondary Actions** - Card Background with borders, Primary Foreground text, hover state with slightly lighter background
- **Toggle Buttons** - Same as secondary but with active state using Neon Purple background
- **Icon Buttons** - Square containers with rounded-xl corners, Purple Glow background accents

### Cards & Containers
- **Main Cards** - Card Background, Border Color borders, rounded-2xl corners, subtle depth
- **Result Cards** - Same as main cards but with conditional glow effects based on impact type
- **Widget Cards** - Card Background, rounded-3xl corners, hover glow effect with widget-glow class
- **Input Containers** - Secondary Background, Border Color borders, rounded-lg corners

### Inputs & Forms
- **Select Dropdowns** - Secondary Background, Border Color borders, rounded-lg corners, Primary Foreground text
- **Focus States** - 2px Neon Purple ring, no outline
- **Disabled States** - Muted Foreground text, cursor-not-allowed
- **Loading States** - Spinner with Neon Purple color

### Special Effects
- **Widget Glow** - Subtle gradient border effect on hover using linear-gradient with purple tones
- **Glassmorphism** - Used for result cards with conditional colored glows
- **Custom Scrollbar** - 8px width, muted colors with hover states

## 5. Layout Principles

### Spacing Strategy
- **Page Padding** - 8x (32px) consistent page margins
- **Card Padding** - 6x (24px) for main cards, 4x (16px) for smaller cards
- **Component Gaps** - 4x (16px) between related elements, 6x (24px) between sections
- **Text Spacing** - 2x (8px) between text and icons

### Grid System
- **Dashboard Grid** - 12-column grid with 6x gaps, auto-rows for responsive widget sizing
- **Responsive Layout** - Single column on mobile, multi-column on larger screens
- **Widget Sizes** - Small (140px min), Medium, Large variants with different grid spans

### Border Radius
- **Large Elements** - rounded-3xl (1.5rem) for main cards and widgets
- **Medium Elements** - rounded-2xl (1rem) for containers
- **Small Elements** - rounded-lg (0.5rem) for inputs and buttons
- **Icon Containers** - rounded-xl (0.75rem) for icon backgrounds

### Depth & Elevation
- **Primary Depth** - Flat design with subtle borders, no heavy shadows
- **Interactive Depth** - Glow effects on hover and focus states
- **Result Highlighting** - Colored shadow glows for correlation results
- **Widget Hover** - Gradient border effect for visual feedback

## 6. Data Visualization

### Chart Styling
- **Grid Lines** - Muted color (#374151) with dashed patterns
- **Axis Labels** - Muted Foreground color (#9ca3af)
- **Chart Colors** - Purple primary palette with conditional colors for correlation types
- **Tooltip Style** - Card Background with Border Color borders, rounded-lg corners

### Data Display
- **Large Numbers** - 6xl font-display font-bold for impact percentages
- **Monospace Data** - font-mono for all statistical values and confidence scores
- **Status Icons** - Color-coded based on correlation type (green/red/blue)
- **Progressive Disclosure** - Basic results visible, detailed stats in expandable sections
