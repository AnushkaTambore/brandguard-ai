# BrandGuard AI — Round 3 Development Roadmap

**Team Dashing Cars** | Inkloom AI Hackathon

As committed in the Round 1 proposal (Section 12, Section 15) and Round 2 MVP deliverable specifications, the following three substantial enhancements represent the planned roadmap for Round 3. These are future improvements, clearly distinguished from the already completed and verified Round 2 MVP features.

---

## 1. Advanced Guideline Intelligence & Ambiguity Detection

### Objective
Enable BrandGuard AI to proactively evaluate the brand rules themselves, identifying ambiguities, overlaps, and contradictions across source documents before they cause confusion for content authors.

### Planned Capabilities:
1. **Rule Conflict Detection**:
   - Semantic cross-referencing between guidelines, legal policies, and promotional claims registers.
   - Proactive alert when one rule permits an expression (e.g. "rapid shipping permitted in social posts") while another restricts it (e.g. "guarantees forbidden in commercial ads").
2. **Reviewer Override Pattern Analysis**:
   - Track rule override frequencies across human review decisions.
   - Automatically flag rules with high override rates (>40%) to the Brand Manager with actionable suggestions: "Reviewers frequently override BG-CLM-004 for seasonal event posts. Consider refining the rule scope or adding an approved promotional exemption."
3. **Guideline Version Impact Simulation**:
   - Before a Brand Manager activates a new rule or modifies an existing guideline, simulate the impact across historical content revisions to estimate projected false positive rates.

---

## 2. Visual Brand Compliance & Multi-Modal Analysis

### Objective
Expand governance beyond text to inspect creative visual assets (post graphics, brochures, ad banners) for visual identity and accessibility compliance.

### Planned Capabilities:
1. **Palette & Typography Verification**:
   - Color extraction using Pillow and OpenCV to calculate dominant color palettes against registered brand hex codes (#0052CC, #00B8D9).
   - WCAG 2.1 AA text-to-background contrast ratio calculation on rendered graphic layouts.
2. **Logo Placement & Clear-Space Enforcement**:
   - Computer vision model to detect official brand logo placement, minimum margin/clear space, and aspect-ratio distortions.
3. **OCR Text Governance Pipeline**:
   - Integrated Tesseract OCR / vision extraction to pass all text embedded inside images directly into the deterministic and LLM review pipelines, preventing unapproved claims from slipping through in banner graphics.

---

## 3. Measured Quality, Human Usability Testing & Learning Feedback Loop

### Objective
Systematically measure precision, recall, and real-world reviewer productivity through structured user trials and privacy-preserving reinforcement learning from reviewer edits.

### Planned Capabilities:
1. **Seeded Test Set Expansion (50+ Real-World Texts)**:
   - Expand the benchmark evaluation set to 50 comprehensive multilingual test drafts across social posts, press releases, partner emails, and legal disclosures.
   - Track exact precision and recall metrics per category on every release build via CI/CD test gates.
2. **5-Participant Usability Study (SUS Benchmarking)**:
   - Conduct structured 20-minute task-based usability sessions with 5 independent testers (student club coordinators and small business marketers).
   - Measure task completion time, finding clarity, and calculate the formal System Usability Scale (SUS) score targeting ≥ 70.
3. **Reviewer Feedback Learning Loop**:
   - With explicit organizational consent, utilize human reviewers' custom edits and written override reasons to automatically generate suggested rule improvements and fine-tune prompt few-shot examples for higher accuracy.
