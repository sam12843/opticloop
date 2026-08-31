# Optic Loop architecture

Optic Loop is an always-on visual critic for coding agents, not a screenshot uploader.

## Closed loop

1. A source change or explicit agent call triggers a render.
2. Playwright collects deterministic evidence: DOM geometry, accessibility-relevant controls, console output, HTTP failures, and responsive behavior.
3. The rendered frame is compared with an approved baseline.
4. Only the changed bounding region is cropped for optional semantic vision.
5. The agent receives a compact result containing failures, measurements, visual score, and artifact paths.
6. The task is complete only when acceptance checks pass.

## Why this can beat screenshot-first tools

Full screenshots are retained as evidence but are not placed into model context by default. Most failures can be expressed in tens or hundreds of tokens. When appearance requires semantic judgment, the vision adapter receives the changed crop plus the relevant acceptance criterion—not an entire page and repository history.

## Next layers

### Persistent real-time observer

Keep browser contexts alive, subscribe to DOM mutations, route changes, layout shifts, and network-idle boundaries, then emit stable frames. Coalesce rapid build events so agents never inspect half-rendered UI.

### Acceptance compiler

Compile natural-language goals such as “the hero is centered, premium, and matches this reference” into deterministic geometry checks plus narrowly scoped semantic rubrics. Every verdict must include evidence.

### Pluggable vision critics

Support local vision models and optional hosted providers behind one interface. The open-source deterministic engine and baseline workflow remain fully usable without API keys.

### Benchmark harness

Run paired agent trials with and without Optic Loop. Record wall time, model tokens, tool-output bytes, agent turns, visual score, acceptance-pass rate, and human interventions. The primary metric is cost per correctly completed UI task.

## Trust rules

- Coding agents may check baselines but may not approve new ones silently.
- Pixel similarity is evidence, not proof of aesthetic quality.
- Token-reduction estimates are telemetry, not benchmark claims.
- All semantic verdicts should retain the criterion, crop, model identity, and explanation needed to audit them.
