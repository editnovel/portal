set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

default:
    @just --list

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
