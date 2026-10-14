import assert from 'node:assert/strict'
import { formatTileSizeLabel, isSlab2x4, isTile1x2, STANDARD_DIMENSIONS } from '../src/catalog.ts'

console.log('Testing tile dimension formatting and classification...')

// Test formatTileSizeLabel
assert.equal(formatTileSizeLabel("600 x 1200 mm"), "4×2")
assert.equal(formatTileSizeLabel("600 × 1200 mm"), "4×2")
assert.equal(formatTileSizeLabel("1200 x 600 mm"), "4×2")
assert.equal(formatTileSizeLabel("2' × 4' (600 × 1200 mm)"), "4×2")
assert.equal(formatTileSizeLabel("4' × 2'"), "4×2")
assert.equal(formatTileSizeLabel("4x2"), "4×2")

assert.equal(formatTileSizeLabel("600 x 600 mm"), "2×2")
assert.equal(formatTileSizeLabel("2' × 2' (600 × 600 mm)"), "2×2")
assert.equal(formatTileSizeLabel("2x2"), "2×2")

assert.equal(formatTileSizeLabel("300 x 600 mm"), "1×2")
assert.equal(formatTileSizeLabel("600 x 300 mm"), "1×2")
assert.equal(formatTileSizeLabel("1' × 2' (300 × 600 mm)"), "1×2")
assert.equal(formatTileSizeLabel("1x2"), "1×2")

assert.equal(formatTileSizeLabel("300 x 300 mm"), "1×1")
assert.equal(formatTileSizeLabel(undefined), "2×2")

// Test isSlab2x4
assert.equal(isSlab2x4("600 x 1200 mm"), true)
assert.equal(isSlab2x4("2' × 4' (600 × 1200 mm)"), true)
assert.equal(isSlab2x4("4' × 2'"), true)
assert.equal(isSlab2x4("600 x 600 mm"), false)
assert.equal(isSlab2x4("300 x 600 mm"), false)

// Test isTile1x2
assert.equal(isTile1x2("300 x 600 mm"), true)
assert.equal(isTile1x2("1' × 2' (300 × 600 mm)"), true)
assert.equal(isTile1x2("600 x 600 mm"), false)
assert.equal(isTile1x2("600 x 1200 mm"), false)

// Test STANDARD_DIMENSIONS
assert.equal(STANDARD_DIMENSIONS.length, 3)
assert.deepEqual(STANDARD_DIMENSIONS.map(d => d.label), ['1×2', '2×2', '4×2'])

console.log('✓ All tile dimension tests passed successfully!')
