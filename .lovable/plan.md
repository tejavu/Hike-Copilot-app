# Why job results still look generic — findings first

I reproduced your exact live results before proposing any change.

## What I verified

**1. Your data does reach the matcher.** Your stored profile has 15 skills (C/C++, VHDL, Verilog, Python, PyTorch, TinyML, FreeRTOS, Vivado, Vitis, ModelSim, MicroBlaze, FPGA, FSM Design, NumPy, SciPy) with confidence levels, and interests (Embedded Systems, TinyML, FPGA Design, Machine Learning, Signal Processing). Your saved jobs are Data Analyst, Backend Engineer, Frontend Engineer, UX Engineer — all Zurich hybrid.

**2. The scoring is wired in and is driving the output.** Running the matcher directly with your exact skills and locations reproduced those four jobs, in that order. Nothing downstream overrides it.

**3. Results do change when skills change.** SQL/Python returns Data Analyst / Backend / ML Engineer; React returns Frontend / Full-Stack / UX. So the scoring runs — it just has nothing good to score against.

## The real causes

- **The job pool is 9 hardcoded generic tech roles** (Frontend, Full-Stack, Data Analyst, ML Engineer, DevOps, Backend, Technical PM, QA, UX). There is no embedded, firmware, FPGA, hardware or signal-processing role anywhere in it. For your profile the "best match" can only ever be a generic web/data role. Passing hardware-only skills (VHDL, Verilog, FPGA) returns zero jobs.
- **Loose substring matching manufactures false positives.** A skill matches a role tag if either string contains the other. "FSM Design" contains "design", which is why Frontend Engineer and UX Engineer scored at all; "TinyML" contains "ml". Removing "FSM Design" from the list drops UX below ML Engineer — proof those matches were spurious.
- **Confidence weights are not actually applied.** Onboarding passes confident skills and then all skills as one flat list; the matcher treats every term with the same weight (the duplication is an accidental, uneven "double"). Chat's re-sweep passes raw profile skills with no confidence at all.
- **Separate location bug:** with on-site + Zurich selected, the city filter relaxes and returns Amsterdam / Paris on-site roles. Setup is respected, city is not.

## Proposed fix

1. **Expand the seed catalog** with the missing families so relevant roles can exist: Embedded / Firmware Engineer, FPGA / Digital Design Engineer, Signal Processing / DSP Engineer, Edge-AI / TinyML Engineer, plus Hardware-adjacent ML and Robotics. Each with realistic Swiss/EU employers, locations and skill lists.
2. **Tighten matching**: exact and alias matching on normalised skills, plus token-level matching with a stop list, instead of raw substring containment. "FSM Design" must no longer match a "design" tag.
3. **Apply confidence properly**: pass `skill_confidence` through (onboarding and chat both), weight by level (level 4-5 highest, 3 normal, 1-2 light) instead of concatenating two lists.
4. **Honest empty state**: when no role clears a real relevance threshold, say so and offer nearest-adjacent roles explicitly labelled as adjacent, rather than silently returning generic ones.
5. **Fix city relaxation**: keep the chosen cities as a hard filter alongside setup; only relax when that combination yields nothing, and label the widened results.
6. **Re-run your exact profile** after the change and report the new list.

## Technical notes

Files: `src/lib/job-sweep.ts` (seed catalog, scoring, filters), `src/components/onboarding/OnboardingForm.tsx` and `src/components/chat/ChatView.tsx` (pass confidence through), no schema change needed. Existing saved jobs are re-swept on the next onboarding save or chat sweep.
