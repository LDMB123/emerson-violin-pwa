# WASM Sources

Rust sources for `panda-core` and `panda-audio`.

Outputs are generated into `src/core/wasm/` and used by the app at runtime.

Suggested workflow (scripts):
- `npm run wasm:build` to build both crates with wasm-pack
- `npm run wasm:copy` to copy JS + `.wasm` into `src/core/wasm/`
- `npm run wasm:prepare` to run both steps

Manual workflow (if preferred):
- Build core + audio using the existing wasm toolchain
- Copy generated bindings + `.wasm` into `src/core/wasm/`

Note: build tooling is not wired into npm scripts yet.
