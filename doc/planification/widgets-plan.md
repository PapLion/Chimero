EXECUTION ROADMAP
PHASE 1: Infrastructure & Database (Backend)
Target: packages/db/schema.ts, apps/electron/src/main/services/asset-manager.ts

1.1 Image Optimization (Sharp):

Install sharp.

Update upload-asset logic: When an image is uploaded, generate a Thumbnail (e.g., 300x300px, webp/jpeg, 80% quality) alongside the original.

Update assets table: Add thumbnailPath column.

1.2 Entries Schema:

Update entries table: Add note (text, nullable) and asset_id (integer, FK to assets, nullable).

Run migrations (pnpm db:generate / db:push).

PHASE 2: Dynamic Quick Entry (Frontend Input)
Target: apps/electron/src/renderer/src/components/quick-entry.tsx

2.1 Dynamic Form Logic:

Replace the single numeric input with a conditional render:

Weight/Diet/Exercise: Number Input (Main) + Optional Note.

Books/Games/TV/Media: Text Input (Title/Note is Main) + Optional Rating (1-5) or Number (Pages/Hours).

Tasks: Text Input only.

2.2 Asset Picker:

Add a button to attach an image.

Open a selector showing Thumbnails (from Phase 1).

Save the assetId in the mutation.

PHASE 3: Interactive & Specialized Widgets (Frontend Output)
Target: apps/electron/src/renderer/src/components/widget-card.tsx (Suggest splitting into widgets/ folder if file exceeds 300 lines).

3.1 Graph Interactivity (Fixing "Visual Only" charts):

Update Recharts components (AreaChart, LineChart).

Add <Tooltip />: On hover, show the specific date and value (e.g., "Feb 5: 70kg").

Add <XAxis />: Show minimal date labels (e.g., "Mon", "Tue") so the user has context.

UX: The chart must be useful for analysis, not just a decoration.

3.2 Implement 10 Tracker Archetypes:

Weight: Large current number + Interactive Line Chart + Background Image (if asset attached to today's entry, use thumbnail with blur).

Media (Books/TV/Games): List view of recent entries. Show the Thumbnail (book cover/game art) on the left of the note/title.

Diet/Exercise: Radial Progress for daily goals + Tooltip for breakdown.

Task: Checkbox list (filtered by Today).

Mood: Emoji + Interactive Sparkline (hover to see mood history).

PHASE 4: Performance Integration
Target: BentoGrid.tsx, useAssets hook.

4.1 Data Fetching:

Ensure useAssets returns the thumbnailUrl (mapped from chimero-asset://...).

In the Grid/Widgets, ALWAYS use the thumbnail URL for rendering images. Only load the full resolution if the user clicks to expand (modal).