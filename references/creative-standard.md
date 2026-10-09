# Creative Standard — AI Explainer Video Studio

## Purpose

This document defines the **creative quality bar** for the AI explainer video studio.

It is not an implementation specification.

The production system may be redesigned, simplified, or reorganized as needed. The references are the source of truth for what the finished work should feel like.

The goal is:

> **An autonomous local system that turns arbitrary scripts in the target niche into professionally designed educational motion-graphics videos for TikTok and Instagram Reels.**

The finished result should feel intentionally art-directed, not automatically assembled.

---

## 1. Reference-Level Visual Identity

The target visual language is an editorial educational motion-graphics system.

Its strongest characteristics are:

- vertical 9:16 composition designed for phone viewing
- restrained, intentional use of empty space
- strong typographic hierarchy
- clean shared alignment between type and visual objects
- sparse but meaningful color
- visual mechanisms that explain the narration
- professionally designed objects rather than rough geometric stand-ins
- recurring visual motifs that create a coherent film
- deliberate scale changes based on the importance of the idea
- continuity across related narration rather than constant visual resets
- captions that support the narration without becoming the main visual
- a recurring illustrated presenter integrated into the composition

The references do **not** feel like slides.

They feel like a motion designer has interpreted the narration and decided what the viewer needs to see.

---

## 2. Core Creative Principle

> **The picture should explain the narration, not merely repeat it.**

The visual should increase comprehension.

Examples:

- process → show the process happening
- comparison → make the difference visible
- quantity → make scale visible
- system → expose the components and relationships
- transformation → visibly change the object
- success/failure → show the state change
- sequence → evolve one visual over time
- constraint → show the boundary or limit
- cause/effect → make the relationship visible
- data → show the actual structure of the data
- tool/interface → represent the interaction rather than label it

A heading plus decorative shapes is not a sufficient explanation.

---

## 3. Two Visual Families in the References

The references combine two important kinds of visual material.

### A. Precision motion graphics

These are best represented through deterministic layout and components:

- typography
- captions
- meters
- counters
- tables
- records
- cards
- dashboards
- terminals
- charts
- comparisons
- timelines
- kanban boards
- forms
- UI panels
- connectors
- highlights
- stamps
- workflow elements

These objects depend on:

- accurate alignment
- exact text
- consistent spacing
- reliable sizing
- clean state changes

They should not be approximated with arbitrary model-generated coordinates when a proper layout/component system can solve them reliably.

### B. Illustrated or object-driven scenes

The references also contain richer objects such as:

- rooms
- desks
- devices
- brains
- televisions
- doors
- people
- office props
- environments
- metaphorical objects

These objects have interior detail and visual character.

A crude rectangle labeled “PHONE” or an oval labeled “PERSON” does not match the reference quality bar.

The system should acknowledge when a scene requires a real visual object rather than pretending a primitive diagram is sufficient.

The implementation may solve this through existing designed components, reusable assets, illustration, generation, or another method. The creative requirement is simply that the visual must feel intentional and finished.

---

## 4. Composition

Every frame should feel solved.

Important characteristics:

- shared edges
- clean alignment
- intentional spacing
- controlled visual density
- clear hierarchy
- meaningful negative space
- readable scale on a phone
- no accidental collisions
- no clipped text
- no undersized “diagram floating in space”
- no repeated macro-layout simply because it is convenient

Empty space is valuable only when it feels intentional.

The main explanatory object should be large enough to function as the content of the frame.

Important ideas may take over most of the visual workspace.

Secondary ideas may remain small.

Composition should respond to meaning.

---

## 5. Continuity and Scene Evolution

The references often establish a visual object and then evolve it across several narration beats.

Preferred behavior:

> object appears → information is added → state changes → consequence becomes visible → payoff lands

Avoid unnecessary:

> narration line → entirely new frame → narration line → entirely new frame

Related narration should be allowed to share one evolving scene.

The system should understand:

- what persists
- what changes
- what gets introduced
- what gets removed
- what becomes the payoff

Continuity should be semantic, not merely visual repetition.

---

## 6. Visual Variety

Consistency does not mean repetition.

The system should preserve one overall art direction while allowing radically different visual explanations.

Across a video, the viewer may see:

- diagrammatic scenes
- interface scenes
- object scenes
- comparisons
- workflows
- data visualizations
- character-led moments
- full-canvas visual payoffs
- sparse text-led moments when text is genuinely the strongest treatment

The same component or macro-layout should not become the answer to every idea.

Reusable components are **materials**, not scene templates.

---

## 7. Designed Objects vs. Generic UI

Production-ready components are useful because they solve:

- typography
- padding
- alignment
- responsive layout
- animation mechanics
- internal detail

However, default component styling is not the creative target.

The final video should not look like:

> a general-purpose SaaS component library placed on a paper background

The objects must feel integrated into the film’s visual identity.

The creative system should determine whether a component:

- truly helps explain the idea
- should be restyled
- should be combined with other pieces
- should occupy more or less of the frame
- should be ignored in favor of another visual treatment

Component availability should not drive the creative concept.

---

## 8. Typography

Typography is a primary design element.

The references use clear hierarchy rather than many competing styles.

Desired behavior:

- large important statements when appropriate
- smaller editorial labels and figure markers
- concise captions
- disciplined line lengths
- readable phone-size type
- text sized based on its role
- exact fitting inside containers

Avoid:

- uncontrolled wrapping
- text spilling out of components
- tiny explanatory labels
- excessive all-caps
- using text as a substitute for a missing visual

---

## 9. Color

The visual system is restrained.

Current house direction:

- warm/light editorial paper base
- dark/black ink as the dominant drawing/type color
- coral as a primary emphasis color
- green/red only where semantic success/failure or positive/negative state warrants it
- additional colors only when they have a clear information purpose

Color should guide comprehension.

It should not create decorative noise.

---

## 10. Corporate Defector

The Corporate Defector is a recurring presenter and brand element.

Approved character assets are the identity source of truth.

He should not be redesigned.

He is not required to remain in the same position or size throughout the video.

The creative direction may decide:

- prominent presenter moment
- small presenter beside information
- temporary absence
- entrance/exit
- slight scale/position movement
- environment moving around him

The character should not consume valuable canvas simply because the layout expects him.

When the visual explanation needs the full frame, it may take the full frame.

Character motion may remain simple. The environment and information graphics can carry most of the animation.

---

## 11. Motion

Motion should communicate.

Good motion:

- reveals structure
- connects two things
- changes a state
- shows flow
- builds a diagram
- transforms one object into another
- emphasizes a payoff
- preserves continuity

Avoid motion that exists only to make the frame “busy.”

The videos should feel alive without becoming frantic.

Every important animation should be legible on a phone.

---

## 12. Captions

Captions support comprehension but should not become the main visual design.

They should:

- reflect the currently spoken phrase
- remain readable over TikTok / Reels UI
- use consistent styling
- avoid covering the primary visual
- reinforce rhythm without distracting from the explanation

The visual explanation should still make sense if the caption is mentally removed.

---

## 13. Mobile Standard

Primary platforms:

- TikTok
- Instagram Reels

Output:

- 1080 × 1920
- 9:16

Creative work must be judged at phone scale.

A visual may be technically correct at desktop resolution and still fail production.

Important information must remain clear despite:

- right-side action controls
- bottom platform UI
- captions
- small physical display size

---

## 14. Narration Relationship

The narration is educational.

The visual system should give the viewer enough time to understand what is being shown.

Narration target:

- calm
- confident
- firm
- brisk within phrases
- natural thought separation
- engaging without salesman energy

Visual pacing should respect comprehension time.

A visually dense idea may deserve more screen time than a simple connective line.

---

## 15. Creative Autonomy

The system should be genuinely creative.

It should reason from:

> **What would make this idea easiest to understand visually?**

not:

> Which preset should I choose?

and not:

> Which component happens to exist?

The creative layer should be allowed to use existing materials intelligently, combine them, evolve them, or reject them when they do not serve the idea.

The goal is to standardize:

- quality
- identity
- grammar
- polish

not the answer to every scene.

---

## 16. Failure Modes Already Observed

Previous experiments demonstrated several failure modes that should not return.

### Fixed-menu failure
A tiny menu of cards/counters/flows caused different ideas to collapse into the same few visuals.

### Raw-coordinate failure
Giving a language model low-level drawing coordinates increased variety but produced collisions, clipping, crude illustrations, weak proportions, and poor alignment.

### Fallback masking
When creative direction failed to cover a long script, generic fallback scenes hid the failure. Full narration coverage must be intentional.

### Default-component leakage
Production-ready components improved mechanical quality but can make the film feel like generic SaaS UI if their native visual identity dominates the house art direction.

### Constant presenter layout
The character should not force every scene into “presenter lower-left + small diagram upper-right.”

### Undersized explanation
A logically correct visual is still a failure if it occupies too little of the phone frame to teach effectively.

---

## 17. Quality Gate

A scene is not successful merely because:

- it rendered
- it used a valid component
- it contains every narrated word
- nothing technically overflowed

The question is:

> **Does this frame look intentionally designed, and does it make the narrated idea easier to understand?**

A complete video should also feel coherent from beginning to end.

Useful review questions:

1. What is the visual idea of this scene?
2. Could the viewer understand it at phone size?
3. Is the composition balanced and intentional?
4. Is the most important object visually dominant?
5. Does this scene evolve from or into its neighbors when appropriate?
6. Does the visual do more than repeat the narration?
7. Is the component/object styling integrated into the film?
8. Does the character help?
9. Does anything feel like default UI, placeholder content, or generic stock treatment?
10. Does the payoff visually land?

---

## 18. North Star

The desired reaction is not:

> “This AI generated a pretty good diagram.”

It is:

> **“This looks like a professionally art-directed educational motion-graphics video.”**

The references define that standard.

Implementation should be judged by whether it gets closer to that result.
