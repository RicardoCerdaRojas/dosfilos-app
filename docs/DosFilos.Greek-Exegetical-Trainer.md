# **DosFilos.Preach**

## **Greek Exegetical Trainer Module**

### **Technical Vision & Implementation Specification (MVP)**

---

## **1\. Purpose of This Document**

This document defines the **vision, scope, pedagogical model, AI behavior, architecture, and implementation constraints** of the **Greek Exegetical Trainer Module** for DosFilos.Preach.

It is written to:

* guide AI-assisted development under human supervision

* ensure theological, pedagogical, and architectural coherence

* prevent feature drift or competition with the Sermon Generation module

This document is **authoritative** for this module.

---

## **2\. Product Vision**

### **2.1 Core Vision Statement**

The Greek Exegetical Trainer exists to **train discernment**, not to produce content.  
 It teaches pastors how to **recognize, understand, and responsibly use Greek** during exegesis.

---

### **2.2 What This Module Is**

* A **training layer embedded inside the Exegesis step**

* A **Greek tutor**, not a grammar course

* A system that:

  * explains *what a form is*

  * explains *how it functions here*

  * explains *why it matters exegetically*

  * optionally explains *how one could recognize it again*

* An assistant that **strengthens the pastor’s judgment**, not replaces it

---

### **2.3 What This Module Is NOT (Non-Negotiable)**

The module must never:

* Generate sermon outlines or homiletical content

* Write sermon paragraphs or applications

* Replace the Sermon Generator workflow

* Behave like a full Greek grammar curriculum

* Act as a passive parser without explanation

**Design Rule:**  
 If a feature answers *“What should I preach?”*, it is out of scope.

---

## **3\. Position Within the DosFilos Workflow**

### **3.1 Existing Master Workflow**

`Text Selection`  
   `↓`  
`Deep Exegesis`  
   `↓`  
`Homiletical Analysis`  
   `↓`  
`Assisted Writing`  
   `↓`  
`Preach & Share`

---

### **3.2 Placement of the Greek Trainer**

`Deep Exegesis`  
   `├─ Literary Context`  
   `├─ Historical Context`  
   `├─ Structural Analysis`  
   `└─ Greek Exegetical Trainer  ← (this module)`

The Greek Trainer:

* is optional

* is contextual

* never runs as a standalone feature

---

## **4\. Core Use Case (Authoritative)**

### **UC-EXG-01**

**Greek Training Inside Exegesis**

**Actor:** Pastor / Theology Student  
 **Context:** User is inside an active Exegesis step  
 **Goal:** Be trained to understand and use Greek responsibly in this passage

---

### **Flow**

1. User opens or creates a Sermon Preparation Flow

2. User enters **Deep Exegesis**

3. System detects Greek NT availability

4. UI offers:

    “Train this passage with the Greek Tutor”

5. User activates **Greek Training Mode**

6. System identifies **exegetically significant Greek forms**

7. For each form, the system runs a **Training Unit**

8. User saves insights

9. User exits training and continues exegesis

---

### **Output**

* Trained understanding

* Saved exegetical insights

* No sermon text generated

---

## **5\. Pedagogical Model**

### **5.1 Training Unit (Canonical Structure)**

Every training unit MUST follow this structure:

`1. Identification`  
`2. Recognition Guidance (optional)`  
`3. Function in Context`  
`4. Exegetical / Theological Significance`  
`5. Reflective Question`  
`6. Corrective Feedback`

Each unit is **small, focused, and contextual**.

---

### **5.2 Identification**

Purpose: Answer **“What is this?”**

Includes:

* grammatical category

* tense / voice / case (as applicable)

* minimal terminology (pastor-friendly)

Example:

“This is an aorist passive participle.”

---

### **5.3 Recognition Guidance (Optional, Expandable)**

Purpose: Answer **“How could I recognize this myself?”**

This section is:

* optional (collapsed by default)

* non-exhaustive

* visual / pattern-based

* designed for transfer of learning

#### **Allowed content:**

* observable markers (e.g. \-θη-)

* common endings

* visible agreement patterns

* brief warnings about limits

#### **Disallowed content:**

* full paradigms

* rare exceptions

* exhaustive rules

* academic debates

Example:

“Notice the **\-θη- marker**, often used to form the aorist passive.  
 This does not always guarantee passive meaning, but here it strongly indicates received action.”

---

### **5.4 Function in Context**

Purpose: Answer **“What does this form do here?”**

Includes:

* syntactic role

* relationship to main verb

* contribution to flow of thought

---

### **5.5 Exegetical / Theological Significance**

Purpose: Answer **“Why does this matter?”**

Includes:

* interpretive impact

* theological nuance

* connection to authorial intent

---

### **5.6 Reflective Question**

Purpose: Force **active reasoning**.

Allowed formats:

* short free-text reflection

* guided conceptual multiple choice

* contrastive questions (“What would change if…”)

---

### **5.7 Corrective Feedback**

Purpose: Train without overriding.

Rules:

* affirm partial understanding

* gently correct errors

* explain reasoning

* never shame or dismiss

---

## **6\. AI Role & Behavior**

### **6.1 Role Definition**

The AI acts strictly as:

**A Greek exegetical tutor trained in historical-grammatical-literal hermeneutics.**

---

### **6.2 AI Must Never**

* decide sermon meaning for the user

* present itself as final authority

* hide ambiguity

* hallucinate unsupported claims

When uncertain, the AI must say so.

---

## **7\. Corpus-Based Reasoning (Gemini File Search)**

### **7.1 Corpus Description**

The tutor has access to a **curated corpus (\~1000 pages)**, including:

* Greek grammars

* syntax manuals

* lexical-theological resources

* peer-reviewed articles

* internal doctrinal guidelines

---

### **7.2 Corpus Usage Rules**

The AI uses the corpus to:

* verify explanations

* choose defensible interpretations

* avoid hallucination

* align with platform theology

The AI must NOT:

* quote long academic passages

* expose raw source text to users

* overwhelm with citations

---

## **8\. Prompt Architecture (Mandatory)**

### **8.1 Design Rule**

**Never use a single monolithic prompt.**

Each prompt has **one responsibility**.

---

### **8.2 Required Prompt Types**

* `GreekFormSelectionPrompt`

* `GreekIdentificationPrompt`

* `GreekRecognitionGuidancePrompt`

* `GreekSyntaxFunctionPrompt`

* `GreekExegeticalSignificancePrompt`

* `UserResponseEvaluationPrompt`

* `PedagogicalFeedbackPrompt`

Each prompt:

* receives only required context

* queries Gemini File Search explicitly

* returns structured, bounded output

---

## **9\. Technical Architecture**

### **9.1 Stack**

* Frontend: ReactJS

* Backend: Firebase

  * Firestore

  * Auth

  * Cloud Functions (optional)

* AI: Gemini \+ File Search API

---

### **9.2 Clean Architecture Layers**

#### **Domain (Pure TypeScript)**

* `StudySession`

* `GreekForm`

* `TrainingUnit`

* `UserResponse`

* `ExegeticalInsight`

#### **Application (Use Cases)**

* `StartGreekTrainingUseCase`

* `GenerateTrainingUnitsUseCase`

* `EvaluateUserResponseUseCase`

* `SaveInsightUseCase`

* `ExitGreekTrainingUseCase`

#### **Infrastructure**

* `GeminiGreekTutorService`

* `CorpusSearchService`

* `FirestoreSessionRepository`

#### **UI**

* Stateless components

* Hooks invoke use cases

* No Firebase or AI logic in components

---

## **10\. Data Model (MVP)**

`users/{uid}`

`sessions/{sessionId}`  
  `- uid`  
  `- passageRef`  
  `- status`  
  `- createdAt`

`sessions/{sessionId}/trainingUnits/{unitId}`  
  `- greekForm`  
  `- identification`  
  `- recognitionGuidance?`  
  `- function`  
  `- significance`  
  `- question`

`sessions/{sessionId}/responses/{responseId}`  
  `- unitId`  
  `- userAnswer`  
  `- feedback`

`sessions/{sessionId}/insights/{insightId}`  
  `- content`  
  `- createdAt`

---

## **11\. Analytics & Metrics**

### **Activation**

* `greek_training_started`

* `first_training_unit_completed`

### **Engagement**

* units per session

* session duration

* return rate

### **Pedagogical Effectiveness**

* correction rate

* improvement across repeated forms

* self-reported confidence delta

### **Integration**

* insights reused in homiletics

* drop-off after exegesis

* time saved downstream

---

## **12\. Guardrails (Non-Negotiable)**

* No sermon generation

* No hidden reasoning

* No unverified claims

* Ambiguity must be acknowledged

* Theology must remain aligned with platform doctrine

---

## **13\. MVP Scope**

### **Included**

* Greek NT only

* verbs, participles, cases, key particles

* text-based interaction

* saved insights

### **Excluded**

* Hebrew

* audio

* gamification

* community review

* full grammar curriculum

---

## **14\. Success Criteria**

The module is successful if:

* users activate it voluntarily

* users return to it

* users report increased confidence

* exegesis improves without sermon automation

---

## **15\. Final Statement**

This module exists to **train faithful interpreters**.  
 Authority remains in the text.  
 Responsibility remains with the pastor.  
 The system exists to serve both.

