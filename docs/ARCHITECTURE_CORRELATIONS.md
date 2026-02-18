# Insight Lab Feature Manual

> **Single Source of Truth** for the Insight Lab (StatsPage) correlation engine and user interface. This document consolidates the philosophy, technical architecture, visual design system, and integration patterns for the complete feature.

---

## SECTION 1: THE PHILOSOPHY

### The Butterfly Effect Manifesto

**Core Principle:** Everything in your life is interconnected. Small changes in one area can create cascading effects throughout your entire system. The Insight Lab exists to make these invisible connections visible through data-driven analysis.

**Anti-AI Hallucination Clause:** This feature uses **deterministic SQL mathematics**, not machine learning guesswork. Every correlation is calculated using precise cohort analysis with transparent logic. No black boxes, no AI hallucinations - just mathematical truth derived from your actual behavior patterns.

**The Promise:** By understanding how your habits influence each other across time, you can make intentional decisions about which behaviors to combine, separate, or modify to achieve your goals.

---

## SECTION 2: TECHNICAL ARCHITECTURE

### The Logic: Cohort Analysis Engine

#### Methodology: Triggered vs Baseline Cohorts

The correlation engine analyzes behavior by comparing two distinct cohorts:

**Cohort A (Triggered):** Days where the Source habit has a value > 0 or exists
- Represents days when you actively performed the source behavior
- Target habit values are measured on `TriggerDate + offsetDays`

**Cohort B (Baseline):** Days where the Source habit has a value of 0 or is null
- Represents normal days without the source behavior
- Target habit values provide the baseline comparison

#### Offset Logic: Time-Based Causality

- **offsetDays = 0:** Same Day analysis - "If I do X, then Y happens on the same day"
- **offsetDays = 1:** Next Day analysis - "If I do X, then Y happens tomorrow"
- **Range:** -30 to +30 days (prevents unreasonable time spans)

#### Impact Calculation Formula

```typescript
// Percentage difference between cohorts
if (baselineAvg > 0) {
  impact = ((impactedAvg - baselineAvg) / baselineAvg) * 100;
} else if (impactedAvg > 0) {
  impact = 100; // Infinite positive impact when baseline is 0
} else {
  impact = 0; // No meaningful change
}
```

#### Confidence Algorithm

```typescript
// Sample size + cohort balance
baseConfidence = Math.min(100, (totalSamples / 30) * 100); // 30 days = 100%
cohortBalance = Math.min(cohortA, cohortB) / Math.max(cohortA, cohortB);
balanceBonus = cohortBalance * 20; // Up to 20% bonus for balanced data
finalConfidence = Math.min(100, baseConfidence + balanceBonus);
```

### Data Types: TypeScript Interfaces

```typescript
interface CorrelationResult {
  sourceTrackerId: number;
  targetTrackerId: number;
  offsetDays: number;
  impact: number; // Percentage difference (-100 to +100)
  confidence: number; // Sample size confidence (0-100)
  baselineAvg: number; // Cohort B average
  impactedAvg: number; // Cohort A average
  triggeredDays: number; // Days where source > 0
  baselineDays: number; // Days where source = 0/null
}

interface EnhancedCorrelationResult extends CorrelationResult {
  metadata: CorrelationMetadata;
  insightType: 'positive_synergy' | 'destructive_interference' | 'neutral_correlation';
  userFriendlyConfidence: string;
}

interface CorrelationMetadata {
  totalDays: number;
  dataQuality: 'high' | 'medium' | 'low';
  hasSufficientData: boolean;
  recommendedActions: string[];
}
```

### SQL Implementation: SQLite Optimized

The `calculateImpact` function in `apps/electron/src/main/services/stats-service.ts` implements:

1. **Data Retrieval:** Parallel queries for source and target tracker entries (last 365 days)
2. **Date Mapping:** Efficient Map-based lookup for O(1) data access
3. **Offset Calculation:** Proper date arithmetic for time-shifted analysis
4. **Cohort Assignment:** Logical separation based on source activity
5. **Statistical Analysis:** Averages, percentages, confidence scoring

**Performance Optimizations:**
- Ordered queries for consistent results
- Map-based data structures for fast lookups
- Minimal memory allocation during calculations
- Early validation to prevent invalid queries

---

## SECTION 3: VISUAL DESIGN SYSTEM

### The Look: Chimero Cyberpunk Aesthetic

The Insight Lab follows the established **Chimero Cyberpunk Dark** theme with sophisticated visual hierarchy and interactive feedback.

### Color Palette: Emotional Data Visualization

#### Backgrounds
- **Deep Space Background:** `hsl(210 35% 7%)` - Primary application background
- **Card Background:** `hsl(210 25% 11%)` - Container backgrounds
- **Secondary Background:** `hsl(210 20% 15%)` - Input fields and interactive elements

#### Primary Accents
- **Neon Purple:** `hsl(266 73% 63%)` - Primary actions, highlights, key interactive elements
- **Purple Glow:** `hsl(266 73% 63% / 0.2)` - Subtle background accents

#### Status Colors (Correlation Results)
- **Positive Synergy:** `#10b981` (Emerald) with `shadow-emerald-500/20` glow
- **Destructive Interference:** `#f43f5e` (Rose) with `shadow-rose-500/20` glow  
- **Neutral Correlation:** `#3b82f6` (Blue) with `shadow-blue-500/20` glow

#### Supporting Colors
- **Muted Foreground:** `hsl(210 12% 47%)` - Secondary text, labels
- **Primary Foreground:** `hsl(210 25% 97%)` - Main content and headings
- **Border Color:** `hsl(210 18% 22%)` - Subtle borders for depth

### Typography: Information Hierarchy

#### Font Families
- **Display Font:** 'Space Grotesk' for headings and large numbers (font-display class)
- **Body Font:** 'DM Sans' for regular text and UI elements
- **Monospace Font:** System monospace for data values and technical labels

#### Typography Scale
- **Main Headers:** `text-3xl font-display font-bold` - Page titles
- **Section Headers:** `text-lg font-semibold` - Component titles  
- **Labels:** `text-sm font-mono uppercase tracking-wider` - UI labels
- **Data Values:** `font-mono` - Statistical numbers and percentages
- **Body Text:** `text-base font-normal` - Descriptive content

### Component Patterns: Reusable Design Language

#### Social Initials Bubbles
**Pattern:** Colored circular bubbles with person initials for social mentions
- **Implementation:** `widget-card.tsx` SocialWidget component
- **Logic:** Extract names from @mentions and "with Name" patterns
- **Styling:** `rounded-full bg-[hsl(266_73%_63%)] text-white flex items-center justify-center text-xs font-bold`
- **Fallback:** Automatic initial extraction (first letters of words, max 2 characters)
- **Container:** `rounded-full` pill with neon purple border and background

#### Asset Geometry: Conditional Rounding
**Pattern:** Dynamic border radius based on asset categorization
- **Implementation:** `AssetsPage.tsx` with `isPersonAsset()` helper function
- **Logic:** Detect person/social assets by type and filename keywords
- **Person Assets:** `rounded-full` for profiles, avatars, contacts
- **Standard Assets:** `rounded-lg` for games, books, media, other content
- **Keywords:** person, people, social, profile, avatar, contact
- **Categories:** Added "person" to AssetCategory type for explicit tagging

#### Cyberpunk Dropdowns: Terminal-Style Selects
**Pattern:** Custom dropdown with terminal/code block aesthetic
- **Component:** `CyberpunkSelect.tsx` - Reusable across application
- **Terminal Header:** Red/yellow/green control buttons with "terminal" label
- **Styling:** Monospace font, neon borders, dark background
- **Interactive States:** Hover glow, focus rings, smooth transitions
- **Check Indicators:** Visual feedback for selected options
- **Implementation:** Replaced HTML selects in HypothesisBuilder and QuickEntry
- **Accessibility:** Full keyboard navigation and screen reader support

#### Hypothesis Builder Interface
**Pattern:** "IF I DO... AND WAIT... THEN... IS..." sentence structure
- **Dropdowns:** CyberpunkSelect with terminal styling and monospace fonts
- **Toggle Buttons:** Same Day vs Next Day selection with active state highlighting
- **Calculate Button:** Primary action with loading spinner and disabled states
- **Mobile Responsive:** Single column on mobile, flex row on desktop

#### Glassmorphism Result Cards
**Pattern:** Sophisticated layered design with conditional colored glows
- **Base:** `bg-[hsl(210_25%_11%)] border rounded-2xl` with backdrop blur
- **Conditional Glow:** Based on insight type (green/red/blue shadow effects)
- **Icon Integration:** TrendingUp/Down/Target icons matching correlation type
- **Data Display:** Large impact percentage with confidence metrics and tooltips

#### Modal Layout: Responsive Overflow Management
**Pattern:** Fixed height containers with scrollable content
- **Implementation:** `CreateTrackerDialog.tsx` with `max-h-[80vh] overflow-y-auto`
- **Purpose:** Prevent vertical overflow on smaller screens and Wayland compatibility
- **Container:** `relative w-full max-w-lg` with proper spacing
- **Scroll Behavior:** Smooth scrolling with proper touch support

#### Chart Visualization
**Pattern:** Cohort comparison with cyberpunk styling
- **Grid:** `strokeDasharray="3 3" stroke="#374151"` - Subtle grid lines
- **Axes:** `stroke="#9ca3af"` - Muted axis styling
- **Tooltip:** Dark background with rounded corners matching design system
- **Bars:** `radius={[8, 8, 0, 0]}` - Rounded top edges, flat bottom

### Interactive States: Micro-interactions

#### Hover Effects
- **Buttons:** `hover:scale-105 active:scale-95` with smooth transitions
- **Cards:** Subtle glow activation on hover (widget-glow class)
- **Tooltips:** `opacity-0 group-hover:opacity-100` for confidence explanations

#### Loading States
- **Spinner:** `animate-spin` with Neon Purple color
- **Disabled:** `opacity-50 cursor-not-allowed` for non-interactive elements
- **Skeleton:** Not implemented yet, but planned for future iterations

---

## SECTION 4: INTEGRATION GUIDE

### Application Integration: Wiring Everything Together

#### Store Integration: Page Type System
```typescript
// In apps/electron/src/renderer/src/lib/store.ts
interface AppState {
  activeTracker: number | null;
  selectedDate: string;
  pageType: 'dashboard' | 'stats' | 'settings'; // 'stats' for Insight Lab
}
```

#### Router Integration: Navigation Structure
```typescript
// In apps/electron/src/renderer/src/App.tsx
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'stats', label: 'Insight Lab', icon: Brain }, // FlaskConical icon
  { id: 'settings', label: 'Settings', icon: Settings }
];
```

#### Sidebar Integration: Visual Navigation
- **Icon:** FlaskConical (representing experimental analysis)
- **Label:** "Insight Lab" 
- **Active State:** Neon Purple highlight when on stats page
- **Position:** Usually second or third in navigation order

### IPC Communication: Main Process Bridge

#### API Endpoints
```typescript
// In apps/electron/src/preload/index.ts
contextBridge.exposeInMainWorld('api', {
  calculateImpact: (sourceId: number, targetId: number, offset: number) => 
    ipcRenderer.invoke('calculate-impact', sourceId, targetId, offset)
});
```

#### Main Process Handler
```typescript
// In apps/electron/src/main/index.ts
ipcMain.handle('calculate-impact', async (event, sourceId, targetId, offset) => {
  return await calculateImpact(sourceId, targetId, offset);
});
```

### Component Architecture: Modular Design

#### File Structure
```
apps/electron/src/renderer/src/
├── pages/
│   └── StatsPage.tsx              # Main page component
├── components/
│   ├── EmptyState.tsx             # Helpful empty states
│   ├── HypothesisBuilder.tsx       # Input interface
│   ├── CorrelationResultCard.tsx  # Results display
│   └── MemoizedChart.tsx          # Optimized chart
├── hooks/
│   └── useCorrelationCalculation.ts # State management hook
└── types/
    └── correlation.ts             # TypeScript interfaces
```

#### Data Flow
1. **User Input** → HypothesisBuilder component
2. **State Management** → useCorrelationCalculation hook
3. **API Call** → Main process calculateImpact function
4. **Results Processing** → Enhanced correlation result with metadata
5. **UI Update** → CorrelationResultCard and MemoizedChart components

### Performance Considerations: Optimization Patterns

#### React Optimizations
- **useMemo:** Chart data and expensive calculations
- **React.memo:** Chart component to prevent unnecessary re-renders
- **useCallback:** Event handlers to maintain referential equality
- **Lazy Loading:** Components loaded only when needed

#### Memory Management
- **Map-based Lookups:** O(1) data access in correlation engine
- **Proper Cleanup:** Event listeners and timers in useEffect hooks
- **Minimal State:** Only store what's necessary for UI updates

---

## SECTION 5: MAINTENANCE & EVOLUTION

### Testing Strategy: Quality Assurance

#### Unit Tests
- **Correlation Engine:** Test all edge cases and mathematical accuracy
- **Component Tests:** Verify UI interactions and state changes
- **Hook Tests:** Ensure proper state management and cleanup

#### Integration Tests
- **Full User Flow:** From hypothesis building to results display
- **IPC Communication:** Main/renderer process communication
- **Error Scenarios:** Invalid inputs, network failures, edge cases

### Future Enhancements: Evolution Path

#### Advanced Analysis
- **Multiple Offset Analysis:** Compare effects across multiple time periods
- **Habit Networks:** Visualize correlation webs between multiple habits
- **Seasonal Patterns:** Time-based correlation analysis
- **Predictive Modeling:** Forecast future habit impacts

#### UX Improvements
- **Progressive Disclosure:** Advanced options in collapsible sections
- **Export Functionality:** Save correlation results as reports
- **Historical Tracking:** Compare correlation changes over time
- **Collaborative Insights:** Share correlation discoveries with others

---

## CONCLUSION

The Insight Lab represents the perfect fusion of **deterministic data analysis** and **cyberpunk aesthetic design**. Every correlation is mathematically sound, every interaction is visually polished, and every result is actionable.

This manual serves as the **definitive guide** for understanding, maintaining, and evolving the Insight Lab feature. Whether you're debugging issues, adding enhancements, or onboarding new developers, this document provides the complete context needed to work with the correlation engine effectively.

**Remember:** In the interconnected web of human behavior, the Butterfly Effect Engine reveals the invisible threads that connect your actions to their outcomes. Use this knowledge wisely.

In Chimero, we treat all data points as interconnected nodes in a complex system. Every tracker—whether it's "Weight", "Mood", "Social", or "Video Games"—can potentially influence every other tracker, either immediately or with a temporal delay.

This philosophy rejects the notion of isolated data silos. Instead, we embrace the complexity of human life where:

- **Social interactions** might affect **sleep quality** the next day
- **Sugar intake** could influence **energy levels** within hours  
- **Exercise** might impact **mood** immediately
- **Screen time** may affect **productivity** with a 1-day lag

### The Universal Correlations Engine

#### Architecture Overview

The Correlation Engine is built on three fundamental principles:

1. **Universality**: Any tracker can be a source or target
2. **Determinism**: Pure SQL math, no AI hallucinations
3. **Temporal Flexibility**: Support for same-day and next-day effects

#### Technical Implementation

**Location**: `packages/db/src/stats-service.ts`

**Core Function**: `calculateImpact(sourceTrackerId, targetTrackerId, offsetDays)`

**Methodology**: Cohort Analysis
- **Cohort A (Triggered)**: Days where Source Value > 0 (or exists)
- **Cohort B (Baseline)**: Days where Source Value is 0/Null
- **Analysis**: Compare Target averages on TriggerDate + offsetDays

#### The Offset Logic

The `offsetDays` parameter is crucial for modeling real-world cause-effect relationships:

- `offsetDays = 0`: Same Day impact
  - Example: Exercise → Mood (immediate effect)
  - Example: Social → Energy (same day boost)

- `offsetDays = 1`: Next Day impact  
  - Example: Alcohol → Hangover/Mood (delayed consequence)
  - Example: Sleep → Productivity (next day performance)

- Future: `offsetDays = 2+`: Extended lag effects
  - Example: Diet → Weight trends (multi-day accumulation)

### Why We Avoid AI Hallucinations

#### The Mathematical Purity Clause

The correlation engine explicitly avoids AI/ML approaches for several critical reasons:

1. **Deterministic Results**: SQL provides repeatable, verifiable calculations
2. **Transparency**: Every step can be traced and audited
3. **No Black Boxes**: Users can understand exactly why a correlation exists
4. **Statistical Rigor**: Proper cohort analysis with confidence metrics
5. **Privacy**: All computation happens locally, no cloud inference

#### The Anti-Hallucination Guarantee

```typescript
// This is what we DON'T do:
// const correlation = aiModel.predict(sourceData, targetData) // ❌ Black magic

// This is what we DO:
const cohortA = await getTriggeredDays(sourceTrackerId) // ✅ Real data
const cohortB = await getBaselineDays(sourceTrackerId)   // ✅ Real data  
const impact = calculateDeterministicImpact(cohortA, cohortB, offsetDays) // ✅ Pure math
```

### The Data Flow Architecture

```
UI (StatsPage.tsx) 
    ↓ [IPC: calculate-impact]
Main Process (ipc-handlers.ts)
    ↓ [Direct call]
Stats Service (stats-service.ts)
    ↓ [SQL queries]
SQLite Database (entries table)
    ↓ [Raw data]
Cohort Analysis Engine
    ↓ [Mathematical comparison]
Correlation Result
    ↑ [Response chain]
UI Display (Impact %, Confidence, Charts)
```

### The Universal Interface Design

#### Hypothesis Builder Pattern

The UI follows a linguistic pattern that reads like natural science:

```
IF I DO... [Source Tracker] 
...AND WAIT [Same Day/Next Day] 
...THEN [Target Tracker] IS...
```

This design ensures:
- **Universality**: Dropdowns populate from `useTrackers()` - no hardcoded relationships
- **Clarity**: Users understand exactly what they're testing
- **Flexibility**: Any combination can be tested
- **Scientific Feel**: Resembles research lab interface

#### Visual Feedback System

- **Positive Synergy** (>10% impact): Green neon glow
- **Destructive Interference** (<-10% impact): Red glitch effect  
- **Neutral Correlation**: Blue neutral state
- **Confidence Score**: Sample size transparency (30 days = 100% confidence)

### Future AI Agent Compliance

#### The Legacy Mandate

This document serves as a permanent architectural directive for all future AI agents working on Chimero:

**THOU SHALT NOT**:
- Replace the correlation engine with AI inference
- Add "smart" predictions that obscure the methodology
- Implement black-box ML models for user correlations
- Hallucinate relationships that don't exist in the data

**THOU SHALT**:
- Maintain the deterministic SQL-based approach
- Preserve the cohort analysis methodology
- Keep the universal source/target pattern
- Respect the offset-based temporal modeling
- Extend the engine with more sophisticated statistical tests ONLY if they remain transparent and deterministic

#### The Extension Protocol

If future enhancements are needed, they must follow this pattern:

1. **New Statistical Tests**: Add new functions to `stats-service.ts`
2. **Maintain SQL Foundation**: All logic must remain in pure SQL/TypeScript
3. **Preserve Interface**: Keep the universal source/target API
4. **Document Rigorously**: Update this architecture file

### The Philosophical Foundation

#### Complexity Science Approach

We embrace the reality that human behavior is a complex adaptive system. Rather than simplifying away the connections, we provide tools to explore them safely.

#### Empirical Over Theoretical

Every correlation claim must be backed by actual user data. No theoretical relationships—only empirical evidence from the user's own life.

#### User as Scientist

The user is the researcher. We provide the laboratory tools; they design the experiments and interpret the results.

---

**Version**: 1.0  
**Created**: 2026-02-16  
**Maintainer**: Chimero Architecture Team  
**Status**: Core Architecture - Do Not Modify Without Review
