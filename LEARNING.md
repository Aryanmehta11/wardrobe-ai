# Learning React Native + FastAPI through Wardrobe AI

This codebase is small enough to read in full but touches every core concept.
Read in the order below — each step builds on the previous one.

---

## Part 1 — React Native (the `mobile/` folder)

**Mindset shift from web React:** there is no HTML. `<View>` replaces `<div>`,
`<Text>` replaces `<p>/<span>` (ALL text must be inside `<Text>`),
`<TouchableOpacity>` replaces `<button>`. Styles are JS objects (no CSS files),
laid out with flexbox by default.

### Reading order

**1. `index.ts` + `App.tsx` — entry point & navigation** (~15 min)
- `registerRootComponent` is RN's `ReactDOM.render`.
- `App.tsx` sets up a **native stack navigator** — think of it as the router.
  Each `<Stack.Screen>` maps a name ("Closet", "AddItem") to a component,
  like routes in a web app. `navigation.navigate('AddItem')` = clicking a link.
- Key concept: **params** — `navigation.navigate('Match', { itemId })` passes
  data between screens; the receiving screen reads `route.params.itemId`.
  See `src/types.ts` bottom for the typed param list (`RootStackParamList`).

**2. `src/types.ts` — TypeScript as the app's contract** (~10 min)
- Union types (`type Color = 'black' | 'white' | ...`) make invalid data
  unrepresentable. The backend, the DB, and every screen all agree on these.

**3. `src/theme.ts` + `src/components/TagForm.tsx` — styling & reusable components** (~20 min)
- `StyleSheet.create({...})` is the RN way to style. Note there's no cascade —
  every component is styled explicitly.
- `TagForm` is a **controlled component**: it owns no data, it receives `tags`
  and calls `onChange` — same pattern as a controlled `<input>` in web React.

**4. `src/db/database.ts` — SQLite on the phone** (~20 min)
- The phone has a real SQL database. `openDatabaseAsync`, then
  `getAllAsync/runAsync` with `?` placeholders (SQL injection safety, even locally).
- Notice everything is `async` — mobile UIs must never block the main thread,
  or the app freezes.

**5. `src/screens/ClosetScreen.tsx` — lists, state, effects** (~30 min)
- `FlatList` is THE core RN list component: it virtualizes (only renders
  what's on screen) so a 500-item closet stays fast. `numColumns={2}` = grid.
- `useFocusEffect` vs `useEffect`: screens stay mounted when you navigate
  away, so "refresh when the user comes back" needs the focus hook.
- Filter chips are just state + `.filter()` — no library needed.

**6. `src/screens/AddItemScreen.tsx` — the money screen** (~45 min)
This one file teaches half of mobile development:
- **Permissions** (`useCameraPermissions`) — you must ask before using the camera.
- **expo-camera / expo-image-picker** — native device APIs wrapped in JS.
- **Networking**: `fetch` + `FormData` for file upload, `AbortController`
  for timeouts. Note the `Platform.OS === 'web'` branches — same code,
  three platforms, occasionally different plumbing.
- **Graceful degradation**: if the backend is down, it falls back to manual
  tagging instead of erroring. Production apps are defined by their failure paths.
- `compressImage` / `persistImage` — real-world lessons: camera photos are
  huge (compress before upload) and cache files get deleted by the OS
  (copy to permanent storage before saving a reference).

**7. `src/logic/matcher.ts` — pure business logic** (~30 min)
- Zero React in this file, and that's the point: scoring is pure functions
  (`(itemA, itemB) → score`), which makes it trivially testable and reusable.
- Read `scoreMatch` rule by rule against the color wheel. This separation —
  UI in screens, logic in plain modules — is the single best habit to copy.

**8. `MatchScreen.tsx`, `ItemDetailScreen.tsx`, `OutfitsScreen.tsx`** (~30 min)
- Nothing new — these recombine everything above. Good self-test: can you
  follow the data flow from tap → param → DB query → `rankMatches` → FlatList?

### Exercises (in rising difficulty)
1. Change the accent color in `theme.ts` and watch it ripple everywhere.
2. Add a "denim" style chip — you'll touch `types.ts`, backend `ENUMS`, done.
3. Add a search box to ClosetScreen that filters items by color name.
4. Add a "worn today" button on ItemDetailScreen writing to the `wear_log`
   table (the table already exists), and show a wear count.
5. Hard: add a "Suggest full outfit" button that picks the best-scoring
   top+bottom+shoes combination from the whole closet (reuse `scoreMatch`).

---

## Part 2 — FastAPI (the `backend/` folder — one file!)

**Mindset:** FastAPI = "type hints become the API." You declare what a
request looks like with Python types; validation, parsing, and docs are free.

### Read `main.py` top to bottom (~45 min)

- `app = FastAPI()` + `@app.post("/tag")` — a decorator turns a function
  into an HTTP endpoint. That's the whole framework.
- `image: UploadFile = File(...)` — parameter declaration IS the validation.
  Send a request without an image and FastAPI returns a 422 for you
  (you saw this live: our first test sent the wrong field name and got a
  clean error listing exactly what was missing).
- `async def` — FastAPI is async-first, like Node. While one request waits
  on Groq's API, the server handles other requests.
- `HTTPException(status_code=503, detail=...)` — errors as first-class
  responses with useful messages, not stack traces.
- **CORS middleware** — why the browser version of the app can call a
  different origin. Classic web gotcha, solved in 5 lines.
- The Groq call — an OpenAI-style chat request with an image as a base64
  data URL, asking for strict JSON. Note the **defensive parsing**: models
  sometimes wrap JSON in prose, so we regex it out and sanitize every enum.
  Never trust model output blindly.
- The `APP_SECRET` header check — the simplest possible auth. Understand
  it before learning JWT/OAuth; it's the same idea (prove you're allowed)
  minus the ceremony.

### Try this now
Run the backend, then open **http://localhost:8010/docs** — FastAPI
auto-generates interactive Swagger docs from the type hints. You can upload
a photo and test `/tag` from the browser. This is the feature that made
FastAPI famous.

### Exercises
1. Add a `GET /models` endpoint returning the MODEL constant. (5 min)
2. Add a `max_size` check: reject uploads over 8 MB with a 413 error.
3. Add a `/describe` endpoint that returns a one-sentence styling tip for
   the uploaded item (new prompt, same Groq plumbing).
4. Hard: add an in-memory rate limiter — max 30 tags per hour per
   `x-app-secret`, returning 429 when exceeded.

---

## How the pieces talk (the full-stack picture)

```
[Phone: React Native]                      [Cloud: FastAPI]
photo → compress → FormData ── HTTP POST ──→ /tag → base64 → Groq vision
    ↓                                              ↓
SQLite (closet)  ←── editable tags ←── JSON {type, colors, pattern...}
    ↓
matcher.ts (pure TS, offline) → scores → outfits
```

The design principle worth internalizing: **the network is only used when
unavoidable** (AI vision needs a big model), everything else is local.
Cheap, fast, private, and works offline.
