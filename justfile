set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

default:
    @just --list

build-wasm-st:
    cd wasm-crate; wasm-pack build --target web --out-dir ../src/wasm/st

build-wasm-mt:
    cd wasm-crate; $env:RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+mutable-globals,+simd128"; wasm-pack build --target web --out-dir ../src/wasm/mt -- --features parallel -Z build-std=panic_abort,std

build-wasm:
    cd wasm-crate; wasm-pack build --target web --out-dir ../src/wasm

check-wasm:
    cd wasm-crate; cargo check --target wasm32-unknown-unknown

dev-web:
    bun run dev

build-web:
    bun run build

check-web:
    .\node_modules\.bin\biome.exe check --write
    .\node_modules\.bin\tsc.exe
    bun run scripts/audit-tokens.ts

test-web:
    bunx vitest run
