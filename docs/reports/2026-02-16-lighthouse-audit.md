# Lighthouse Audit

**Date:** 2026-02-16
**URL:** http://localhost:4173/
**Lighthouse Version:** 13.0.3
**Build:** Production (`npm run build`)

## Scores

- **Performance:** 75/100
- **Accessibility:** 98/100
- **Best Practices:** 100/100
- **SEO:** 92/100
- **PWA:** N/A (category not available in Lighthouse 13.0.3)

## Performance Metrics

- **FCP (First Contentful Paint):** 1,479 ms (96/100)
- **LCP (Largest Contentful Paint):** 8,105 ms (2/100) ⚠️
- **TBT (Total Blocking Time):** 0 ms (100/100) ✓
- **CLS (Cumulative Layout Shift):** 0.000 (100/100) ✓
- **SI (Speed Index):** 1,652 ms (100/100) ✓
- **TTI (Time to Interactive):** 8,100 ms (41/100) ⚠️

## Critical Issues

### Performance (75/100)

**1. Largest Contentful Paint: 8.1s (2/100)**
- Primary performance bottleneck
- Target: <2.5s for good, <4.0s for needs improvement
- Current: 8.1s is in "poor" range
- Likely caused by large initial HTML (173.57 KB) with embedded game templates

**2. Time to Interactive: 8.1s (41/100)**
- Page becomes fully interactive at same time as LCP
- Indicates synchronous loading blocking main thread
- Target: <3.8s

**3. Render Blocking Requests (0/100)**
- Est. savings: 150 ms
- CSS/JS files blocking initial render
- Recommendations: defer non-critical resources

**4. Image Delivery (0/100)**
- Est. savings: 1,040 KB
- Images not optimized for modern formats
- Recommendations: WebP/AVIF formats, lazy loading

### Accessibility (98/100)

**1. Heading Order (0/100)**
- Headings not in sequentially-descending order
- Impacts semantic structure and screen reader navigation
- Fix: Ensure h1 → h2 → h3 hierarchy, no skipped levels

### SEO (92/100)

**1. robots.txt Invalid (0/100)**
- 3,214 errors found
- May prevent proper crawling
- Fix: Validate robots.txt syntax or remove if not needed

## Strengths

- **Zero layout shift** (CLS: 0.000) - excellent stability
- **Zero blocking time** (TBT: 0 ms) - main thread stays responsive
- **Fast Speed Index** (1,652 ms) - quick perceived load
- **Best Practices: 100/100** - no console errors, HTTPS, security headers
- **High Accessibility: 98/100** - only one heading order issue

## Recommendations (Prioritized)

### High Priority

1. **Reduce LCP to <2.5s** (Currently 8.1s)
   - Split large index.html (173.57 KB gzipped to 21.66 KB)
   - Move game templates to lazy-loaded modules
   - Use skeleton screens for initial paint
   - Consider code-splitting game components

2. **Fix heading hierarchy**
   - Audit HTML for proper h1 → h2 → h3 sequence
   - Tools: axe DevTools, WAVE browser extension

3. **Fix or remove robots.txt**
   - Validate syntax at robots-txt-validator
   - Consider removing if not using crawler directives

### Medium Priority

4. **Optimize image delivery**
   - Convert images to WebP/AVIF
   - Implement lazy loading for below-fold images
   - Use `<picture>` with responsive srcsets
   - Potential savings: 1,040 KB

5. **Defer render-blocking resources**
   - Move non-critical CSS to `<link rel="preload">`
   - Use `async` or `defer` for non-critical JS
   - Inline critical CSS in `<head>`
   - Potential savings: 150 ms

### Low Priority

6. **Network dependency optimization**
   - Review critical request chains
   - Reduce waterfall depth
   - Use resource hints (`preconnect`, `dns-prefetch`)

## Analysis

### Bundle Size vs Performance

- **Bundle well-optimized:** 110 entries, largest JS 12.27 KB
- **Issue:** Not bundle size, but loading strategy
- **Root cause:** Large inline HTML with 13 embedded game templates blocks initial render

### LCP Deep Dive

8.1s LCP suggests:
- Initial HTML parsing takes ~6.6s (8.1s - 1.5s FCP)
- Synchronous inline content blocks rendering
- Browser must parse entire 173 KB HTML before rendering LCP element

### Recommended Architecture Change

Current:
```
index.html (173 KB) → Parse ALL → First paint → LCP at 8.1s
```

Proposed:
```
index.html (minimal) → Fast paint → Lazy load games → LCP at <2.5s
```

## Conclusion

- **Strong foundation:** Zero CLS, zero TBT, fast SI, 100/100 Best Practices
- **Single bottleneck:** Large inline HTML causing 8.1s LCP
- **Primary fix:** Extract game templates to lazy modules
- **Expected impact:** LCP reduction from 8.1s → <2.5s (75 → 95+ score)
- **Minimal work:** Architecture already supports dynamic imports

## Next Steps

1. Implement game template code-splitting (Task 7)
2. Re-run Lighthouse to validate LCP improvement
3. Address accessibility heading order
4. Fix robots.txt validation
5. Optimize image delivery
