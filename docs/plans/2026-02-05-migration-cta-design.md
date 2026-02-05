# Migration CTA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Proactively detect legacy IDB data on boot and show a non-blocking banner prompting the user to migrate to SQLite, with a duration estimate.

**Architecture:** On boot (inside `lib.rs` async block, after sessions load), check `legacy_idb_has_data()` + `migration_summary()`. If legacy data exists and migration hasn't started/completed, show a banner with store counts and estimated duration. Banner uses the existing `.banner` CSS pattern. Migration CTA logic lives in `db_migration.rs` (extends existing module). Dismiss state persisted in localStorage to avoid nagging.

**Tech Stack:** Rust/Wasm (wasm-bindgen), existing `dom::` helpers, existing `storage::` IDB queries, HTML `data-*` attributes, Vitest (happy-dom) for shell test.

---

### Task 1: Add migration banner HTML to index.html

**Files:**
- Modify: `index.html:64-95` (banner section, after error-banner)

**Step 1: Add the banner markup**

Insert after the `error-banner` aside (line 95) and before the main content:

```html
    <aside class="banner migrate-banner" data-migrate-banner hidden>
      <div>
        <p class="banner-title">Upgrade your data</p>
        <p class="banner-copy" data-migrate-banner-copy>Your practice data can be upgraded to a faster local database.</p>
      </div>
      <div class="banner-actions">
        <button class="btn btn-primary" type="button" data-migrate-banner-action>Migrate now</button>
        <button class="btn btn-ghost" type="button" data-migrate-banner-dismiss>Not now</button>
      </div>
    </aside>
```

**Step 2: Run shell test to verify markup**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test`
Expected: existing tests still pass (new markup is additive, no tests assert on it yet).

**Step 3: Commit**

```bash
git add index.html
git commit -m "ui: add migration CTA banner markup"
```

---

### Task 2: Add shell test for migration banner

**Files:**
- Modify: `tests/rebuild/shell.test.js`

**Step 1: Write the failing test (it will pass because markup already added)**

Add to the `Rust-first shell markup` describe block:

```javascript
  it('includes migration CTA banner', () => {
    expect(indexHtml).toContain('data-migrate-banner');
    expect(indexHtml).toContain('data-migrate-banner-action');
    expect(indexHtml).toContain('data-migrate-banner-dismiss');
    expect(indexHtml).toContain('data-migrate-banner-copy');
  });
```

**Step 2: Run tests**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test`
Expected: PASS (markup was already added in Task 1).

**Step 3: Commit**

```bash
git add tests/rebuild/shell.test.js
git commit -m "test: add shell test for migration CTA banner"
```

---

### Task 3: Add IDB store count summary to storage.rs

**Files:**
- Modify: `rust/storage.rs`

**Step 1: Add a public function that returns total IDB record count across all stores**

Add after `legacy_idb_has_data()` (around line 577):

```rust
pub async fn legacy_idb_total_count() -> usize {
  let mut total = 0usize;
  for store in IDB_STORES {
    if let Ok(count) = get_store_count(store).await {
      total = total.saturating_add(count as usize);
    }
  }
  total
}
```

**Step 2: Verify it compiles**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && cargo check --target wasm32-unknown-unknown`
Expected: compiles with no errors related to this function.

**Step 3: Commit**

```bash
git add rust/storage.rs
git commit -m "feat: add legacy_idb_total_count for migration CTA"
```

---

### Task 4: Add migration CTA logic to db_migration.rs

**Files:**
- Modify: `rust/db_migration.rs`

**Step 1: Add constants and dismiss helpers**

Add near the top of `db_migration.rs` (after existing constants):

```rust
const CTA_DISMISSED_KEY: &str = "migrate:cta-dismissed";

fn cta_dismissed() -> bool {
  dom::window()
    .local_storage()
    .ok()
    .flatten()
    .and_then(|ls| ls.get_item(CTA_DISMISSED_KEY).ok().flatten())
    .is_some()
}

fn dismiss_cta() {
  if let Ok(Some(ls)) = dom::window().local_storage() {
    let _ = ls.set_item(CTA_DISMISSED_KEY, &format!("{:.0}", js_sys::Date::now()));
  }
}
```

**Step 2: Add the CTA check + show/hide logic**

Add a public function:

```rust
pub fn check_migration_cta() {
  spawn_local(async move {
    // Skip if CTA was previously dismissed
    if cta_dismissed() {
      return;
    }

    // Skip if no legacy data
    if !storage::legacy_idb_has_data().await {
      return;
    }

    // Skip if migration already completed successfully
    if let Ok(summary) = storage::get_migration_summary().await {
      if summary.completed && summary.checksums_ok && summary.errors.is_empty() {
        return;
      }
    }

    // Count records for estimate
    let total = storage::legacy_idb_total_count().await;
    if total == 0 {
      return;
    }

    // Estimate: ~50 records/sec for batch migration (conservative)
    let est_seconds = (total as f64 / 50.0).ceil().max(1.0);
    let estimate = if est_seconds < 60.0 {
      format!("{:.0} seconds", est_seconds)
    } else {
      format!("{:.0} minutes", (est_seconds / 60.0).ceil())
    };

    let copy = format!(
      "{} practice records can be upgraded to a faster local database. Estimated time: {}.",
      total, estimate
    );
    dom::set_text("[data-migrate-banner-copy]", &copy);
    show_banner(true);
  });
}

fn show_banner(visible: bool) {
  if let Some(el) = dom::query("[data-migrate-banner]") {
    if visible {
      let _ = el.remove_attribute("hidden");
    } else {
      let _ = el.set_attribute("hidden", "");
    }
  }
}
```

**Step 3: Wire up the banner buttons**

Add to the existing `init()` function in `db_migration.rs`, after the cleanup button handler (before the final `refresh_status()` call):

```rust
  // Migration CTA banner actions
  if let Some(btn) = dom::query("[data-migrate-banner-action]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      show_banner(false);
      // Trigger the existing migration button
      if let Some(migrate_btn) = dom::query("[data-db-migrate]") {
        let _ = migrate_btn.dyn_ref::<web_sys::HtmlElement>().map(|el| el.click());
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-migrate-banner-dismiss]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dismiss_cta();
      show_banner(false);
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
```

**Step 4: Verify it compiles**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && cargo check --target wasm32-unknown-unknown`
Expected: compiles without errors.

**Step 5: Commit**

```bash
git add rust/db_migration.rs
git commit -m "feat: migration CTA banner logic with dismiss + duration estimate"
```

---

### Task 5: Wire CTA check into boot sequence

**Files:**
- Modify: `rust/lib.rs`

**Step 1: Call `check_migration_cta()` from the boot async block**

In `lib.rs`, inside the `spawn_local` block (after `storage_cleanup::run_auto();` on line 158), add:

```rust
    db_migration::check_migration_cta();
```

**Step 2: Verify it compiles**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && cargo check --target wasm32-unknown-unknown`
Expected: compiles without errors.

**Step 3: Commit**

```bash
git add rust/lib.rs
git commit -m "boot: trigger migration CTA check after startup"
```

---

### Task 6: Auto-dismiss banner on migration completion

**Files:**
- Modify: `rust/db_migration.rs`

**Step 1: Hide banner after successful migration**

In the existing `run_migration()` function, after the `state.completed_at = Some(now_ms());` line (around line 394), add:

```rust
  // Auto-hide CTA banner if migration succeeded
  if state.errors.is_empty() {
    show_banner(false);
  }
```

**Step 2: Verify it compiles**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && cargo check --target wasm32-unknown-unknown`
Expected: compiles without errors.

**Step 3: Commit**

```bash
git add rust/db_migration.rs
git commit -m "ux: auto-dismiss migration CTA on successful migration"
```

---

### Task 7: Run full test suite + manual verification

**Step 1: Run vitest**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test`
Expected: all tests pass.

**Step 2: Run cargo check**

Run: `cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && cargo check --target wasm32-unknown-unknown`
Expected: compiles without errors.

**Step 3: Verify git status is clean**

Run: `git status`
Expected: clean working tree.

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Banner HTML | `index.html` |
| 2 | Shell test | `tests/rebuild/shell.test.js` |
| 3 | IDB count helper | `rust/storage.rs` |
| 4 | CTA logic + buttons | `rust/db_migration.rs` |
| 5 | Boot wiring | `rust/lib.rs` |
| 6 | Auto-dismiss | `rust/db_migration.rs` |
| 7 | Full verification | (no files) |

Total: 4 files modified, 0 files created, ~80 lines of Rust, ~12 lines of HTML, ~6 lines of test.
