# Insight Lab Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate the Insight Lab (StatsPage) from functional to production-grade with robust UX, performance optimization, and architectural alignment with the Chimero Cyberpunk design system.

**Architecture:** Sequential refinement through 5 phases - Data layer optimization with strict TypeScript types, UI component refactoring with design system compliance, performance optimization with React best practices, and comprehensive error handling with user-friendly states.

**Tech Stack:** React 18, TypeScript, Drizzle ORM with SQLite, Tailwind CSS, Recharts, Electron IPC, React Query for data fetching

---

### Task 1: Data Layer Type Safety Enhancement

**Files:**
- Modify: `chimero-habit-flow/apps/electron/src/main/services/stats-service.ts`
- Test: `chimero-habit-flow/test/stats-service.test.ts` (create if not exists)

**Step 1: Add comprehensive TypeScript interfaces**

```typescript
// Add to stats-service.ts
export interface CorrelationCalculationOptions {
  sourceTrackerId: number;
  targetTrackerId: number;
  offsetDays: number;
  minSampleSize?: number;
  confidenceThreshold?: number;
}

export interface CorrelationMetadata {
  totalDays: number;
  dataQuality: 'high' | 'medium' | 'low';
  hasSufficientData: boolean;
  recommendedActions: string[];
}

export interface EnhancedCorrelationResult extends CorrelationResult {
  metadata: CorrelationMetadata;
  insightType: 'positive_synergy' | 'destructive_interference' | 'neutral_correlation';
  userFriendlyConfidence: string;
}
```

**Step 2: Enhance calculateImpact function with better error handling**

```typescript
export async function calculateImpact(
  sourceTrackerId: number,
  targetTrackerId: number,
  offsetDays: number = 0,
  options: Partial<CorrelationCalculationOptions> = {}
): Promise<EnhancedCorrelationResult> {
  // Input validation
  if (sourceTrackerId === targetTrackerId) {
    throw new Error('Source and target trackers must be different');
  }
  
  // Enhanced calculation with metadata
  // ... implementation
}
```

**Step 3: Add data quality assessment helper**

```typescript
function assessDataQuality(totalSamples: number, cohortBalance: number): 'high' | 'medium' | 'low' {
  if (totalSamples >= 30 && cohortBalance >= 0.3) return 'high';
  if (totalSamples >= 15 && cohortBalance >= 0.2) return 'medium';
  return 'low';
}
```

**Step 4: Write tests for enhanced correlation engine**

```typescript
// Create test file
describe('Enhanced Correlation Engine', () => {
  test('should throw error for same tracker correlation', async () => {
    await expect(calculateImpact(1, 1, 0)).rejects.toThrow('Source and target trackers must be different');
  });
  
  test('should return low data quality for insufficient samples', async () => {
    // Mock low data scenario
    const result = await calculateImpact(1, 2, 0);
    expect(result.metadata.dataQuality).toBe('low');
    expect(result.metadata.hasSufficientData).toBe(false);
  });
});
```

**Step 5: Run tests to verify functionality**

Run: `cd chimero-habit-flow && npm test -- test/stats-service.test.ts`
Expected: All tests pass

**Step 6: Commit data layer improvements**

```bash
git add chimero-habit-flow/apps/electron/src/main/services/stats-service.ts
git add chimero-habit-flow/test/stats-service.test.ts
git commit -m "feat: enhance correlation engine with type safety and data quality assessment"
```

---

### Task 2: UI Component Refactor - Design System Compliance

**Files:**
- Modify: `chimero-habit-flow/apps/electron/src/renderer/src/pages/StatsPage.tsx`
- Create: `chimero-habit-flow/apps/electron/src/renderer/src/components/CorrelationResultCard.tsx`
- Create: `chimero-habit-flow/apps/electron/src/renderer/src/components/HypothesisBuilder.tsx`

**Step 1: Create reusable HypothesisBuilder component**

```typescript
// Create HypothesisBuilder.tsx
interface HypothesisBuilderProps {
  trackers: Array<{ id: number; name: string }>;
  sourceTracker: number | null;
  targetTracker: number | null;
  offsetDays: number;
  onSourceChange: (id: number | null) => void;
  onTargetChange: (id: number | null) => void;
  onOffsetChange: (days: number) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  disabled: boolean;
}

export function HypothesisBuilder({ ... }: HypothesisBuilderProps) {
  // Implementation following DESIGN.md patterns
  // - rounded-lg for inputs
  // - Neon Purple for primary actions
  // - Proper focus states with ring-2 ring-[hsl(266_73%_63%)]
}
```

**Step 2: Create CorrelationResultCard component**

```typescript
// Create CorrelationResultCard.tsx
interface CorrelationResultCardProps {
  result: EnhancedCorrelationResult;
  trackers: Array<{ id: number; name: string }>;
}

export function CorrelationResultCard({ result, trackers }: CorrelationResultCardProps) {
  const impactStyle = getImpactStyle(result.impact);
  
  return (
    <div className={cn(
      "bg-[hsl(210_25%_11%)] border rounded-2xl p-8 text-center",
      impactStyle.border, 
      impactStyle.glow
    )}>
      {/* Glassmorphism effect with conditional glow */}
    </div>
  );
}
```

**Step 3: Refactor main StatsPage to use new components**

```typescript
// Update StatsPage.tsx imports and component usage
import { HypothesisBuilder } from "../components/HypothesisBuilder";
import { CorrelationResultCard } from "../components/CorrelationResultCard";

// Replace existing JSX with component calls
<HypothesisBuilder
  trackers={trackers}
  sourceTracker={sourceTracker}
  targetTracker={targetTracker}
  offsetDays={offsetDays}
  onSourceChange={setSourceTracker}
  onTargetChange={setTargetTracker}
  onOffsetChange={setOffsetDays}
  onCalculate={calculateCorrelation}
  isCalculating={isCalculating}
  disabled={!sourceTracker || !targetTracker}
/>
```

**Step 4: Add mobile-responsive layout fixes**

```css
/* Add responsive classes to hypothesis builder */
/* Mobile: single column, Desktop: flex row */
```

**Step 5: Test UI components in development**

Run: `cd chimero-habit-flow && npm run dev`
Expected: Components render correctly with design system compliance

**Step 6: Commit UI refactor**

```bash
git add chimero-habit-flow/apps/electron/src/renderer/src/pages/StatsPage.tsx
git add chimero-habit-flow/apps/electron/src/renderer/src/components/HypothesisBuilder.tsx
git add chimero-habit-flow/apps/electron/src/renderer/src/components/CorrelationResultCard.tsx
git commit -m "feat: refactor Insight Lab UI with design system compliance"
```

---

### Task 3: Performance Optimization & React Best Practices

**Files:**
- Modify: `chimero-habit-flow/apps/electron/src/renderer/src/pages/StatsPage.tsx`
- Create: `chimero-habit-flow/apps/electron/src/renderer/src/hooks/useCorrelationCalculation.ts`

**Step 1: Create custom hook for correlation logic**

```typescript
// Create useCorrelationCalculation.ts
export function useCorrelationCalculation() {
  const [result, setResult] = useState<EnhancedCorrelationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateCorrelation = useCallback(async (
    sourceTrackerId: number,
    targetTrackerId: number,
    offsetDays: number
  ) => {
    setIsCalculating(true);
    setError(null);
    
    try {
      const correlation = await (window as any).api.calculateImpact(
        sourceTrackerId, 
        targetTrackerId, 
        offsetDays
      );
      setResult(correlation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  }, []);

  return { result, isCalculating, error, calculateCorrelation };
}
```

**Step 2: Memoize chart data to prevent re-renders**

```typescript
// Add to StatsPage.tsx
const chartData = useMemo(() => {
  if (!result) return [];
  
  return [
    {
      name: "Baseline",
      value: result.baselineAvg,
      fill: "#64748b"
    },
    {
      name: "Impacted", 
      value: result.impactedAvg,
      fill: result.impact > 10 ? "#10b981" : result.impact < -10 ? "#f43f5e" : "#3b82f6"
    }
  ];
}, [result]);
```

**Step 3: Add React.memo to Chart component**

```typescript
// Memoize the chart component
const MemoizedChart = React.memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      {/* Chart configuration */}
    </BarChart>
  </ResponsiveContainer>
));
```

**Step 4: Implement proper loading states**

```typescript
// Add loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin w-4 h-4 border-2 border-[hsl(266_73%_63%)] border-t-transparent rounded-full" />
  </div>
);
```

**Step 5: Test performance improvements**

Run: `cd chimero-habit-flow && npm run dev`
Expected: Smooth interactions, no UI freezing during calculations

**Step 6: Commit performance optimizations**

```bash
git add chimero-habit-flow/apps/electron/src/renderer/src/hooks/useCorrelationCalculation.ts
git add chimero-habit-flow/apps/electron/src/renderer/src/pages/StatsPage.tsx
git commit -m "perf: optimize Insight Lab with React best practices"
```

---

### Task 4: Enhanced UX & Error Handling

**Files:**
- Modify: `chimero-habit-flow/apps/electron/src/renderer/src/components/HypothesisBuilder.tsx`
- Modify: `chimero-habit-flow/apps/electron/src/renderer/src/components/CorrelationResultCard.tsx`
- Create: `chimero-habit-flow/apps/electron/src/renderer/src/components/EmptyState.tsx`

**Step 1: Create helpful empty state component**

```typescript
// Create EmptyState.tsx
interface EmptyStateProps {
  hasTrackers: boolean;
  onTrackerSelect?: () => void;
}

export function EmptyState({ hasTrackers, onTrackerSelect }: EmptyStateProps) {
  if (!hasTrackers) {
    return (
      <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-12 text-center">
        <Brain className="w-12 h-12 text-[hsl(210_12%_47%)] mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[hsl(210_25%_97%)] mb-2">No Habits Tracked Yet</h3>
        <p className="text-[hsl(210_12%_47%)] max-w-md mx-auto">
          Start tracking habits to discover patterns and correlations in your behavior.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-12 text-center">
      <Brain className="w-12 h-12 text-[hsl(210_12%_47%)] mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-[hsl(210_25%_97%)] mb-2">Select Two Habits to Begin Research</h3>
      <p className="text-[hsl(210_12%_47%)] max-w-md mx-auto">
        Choose a source habit and target habit to uncover how they influence each other.
      </p>
    </div>
  );
}
```

**Step 2: Add confidence score explanation tooltip**

```typescript
// Add to CorrelationResultCard.tsx
const ConfidenceTooltip = () => (
  <div className="inline-flex items-center gap-1 group relative">
    <Activity className="w-4 h-4 text-[hsl(210_12%_47%)]" />
    <span className="text-[hsl(210_12%_47%)]">Confidence:</span>
    <span className="text-[hsl(210_25%_97%)] font-mono">{result.confidence}%</span>
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-lg text-xs text-[hsl(210_25%_97%)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      Based on {result.triggeredDays + result.baselineDays} days of data
    </div>
  </div>
);
```

**Step 3: Add data sufficiency warnings**

```typescript
// Add to CorrelationResultCard.tsx
const DataQualityWarning = ({ metadata }: { metadata: CorrelationMetadata }) => {
  if (metadata.dataQuality === 'low') {
    return (
      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-sm text-amber-400">
          Limited data: Results may not be reliable. Continue tracking for more accurate insights.
        </p>
      </div>
    );
  }
  return null;
};
```

**Step 4: Enhance error handling in hypothesis builder**

```typescript
// Add to HypothesisBuilder.tsx
const ErrorDisplay = ({ error }: { error: string | null }) => {
  if (!error) return null;
  
  return (
    <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
      <p className="text-sm text-rose-400">{error}</p>
    </div>
  );
};
```

**Step 5: Test enhanced UX flow**

Run: `cd chimero-habit-flow && npm run dev`
Expected: Helpful empty states, clear error messages, informative tooltips

**Step 6: Commit UX enhancements**

```bash
git add chimero-habit-flow/apps/electron/src/renderer/src/components/EmptyState.tsx
git add chimero-habit-flow/apps/electron/src/renderer/src/components/HypothesisBuilder.tsx
git add chimero-habit-flow/apps/electron/src/renderer/src/components/CorrelationResultCard.tsx
git commit -m "feat: enhance Insight Lab UX with helpful states and error handling"
```

---

### Task 5: Final Integration & Testing

**Files:**
- Modify: `chimero-habit-flow/apps/electron/src/renderer/src/pages/StatsPage.tsx`
- Test: `chimero-habit-flow/test/insight-lab.integration.test.ts` (create)

**Step 1: Integrate all enhancements in main StatsPage**

```typescript
// Final StatsPage.tsx integration
export default function StatsPage() {
  const { data: trackers = [] } = useTrackers();
  const { result, isCalculating, error, calculateCorrelation } = useCorrelationCalculation();
  
  // Component state management
  const [sourceTracker, setSourceTracker] = useState<number | null>(null);
  const [targetTracker, setTargetTracker] = useState<number | null>(null);
  const [offsetDays, setOffsetDays] = useState(0);

  const handleCalculate = useCallback(() => {
    if (sourceTracker && targetTracker) {
      calculateCorrelation(sourceTracker, targetTracker, offsetDays);
    }
  }, [sourceTracker, targetTracker, offsetDays, calculateCorrelation]);

  return (
    <div className="min-h-screen bg-[hsl(210_35%_7%)] p-8">
      {/* Header */}
      {/* HypothesisBuilder */}
      {/* Results or EmptyState */}
    </div>
  );
}
```

**Step 2: Create integration tests**

```typescript
// Create integration test
describe('Insight Lab Integration', () => {
  test('should display empty state when no trackers available', () => {
    // Mock empty trackers
    // Render component
    // Expect EmptyState component
  });

  test('should show hypothesis builder when trackers available', () => {
    // Mock trackers
    // Render component
    // Expect HypothesisBuilder component
  });

  test('should handle correlation calculation flow', async () => {
    // Mock trackers and API response
    // User interaction flow
    // Expect results display
  });
});
```

**Step 3: Run comprehensive test suite**

Run: `cd chimero-habit-flow && npm test`
Expected: All tests pass, coverage maintained

**Step 4: Performance validation**

Run: `cd chimero-habit-flow && npm run build`
Expected: Build succeeds, no performance warnings

**Step 5: Manual testing checklist**

- [ ] Empty states display correctly
- [ ] Hypothesis builder responsive on mobile
- [ ] Loading states show during calculation
- [ ] Error messages display appropriately
- [ ] Results show with correct styling
- [ ] Tooltips and helpful text appear
- [ ] Chart renders correctly with data
- [ ] Performance is smooth during interactions

**Step 6: Final commit and documentation**

```bash
git add chimero-habit-flow/apps/electron/src/renderer/src/pages/StatsPage.tsx
git add chimero-habit-flow/test/insight-lab.integration.test.ts
git add docs/DESIGN.md
git commit -m "feat: complete Insight Lab refactor with production-grade UX and performance"
```

---

## Testing Strategy

### Unit Tests
- Correlation engine logic and edge cases
- Component rendering and interaction
- Hook behavior and state management

### Integration Tests  
- Full user flow from selection to results
- Error handling scenarios
- Performance under load

### Manual Testing
- Mobile responsiveness
- Visual design compliance
- Accessibility (keyboard navigation, screen readers)

## Success Criteria

1. **Design System Compliance**: All components follow docs/DESIGN.md specifications
2. **Performance**: No UI freezing, smooth interactions, optimized re-renders
3. **UX Excellence**: Helpful empty states, clear error messages, intuitive flow
4. **Type Safety**: Full TypeScript coverage, no any types
5. **Test Coverage**: Comprehensive test suite with >80% coverage
6. **Mobile Responsive**: Fully functional on mobile and desktop

## Rollback Plan

If critical issues arise:
1. Revert to previous StatsPage.tsx version
2. Keep enhanced stats-service.ts (backward compatible)
3. Remove new components temporarily
4. Address issues in follow-up iteration
