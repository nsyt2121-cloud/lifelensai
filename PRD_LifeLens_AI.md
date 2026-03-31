# LifeLens AI - Product Requirements Document (PRD)

## 1. Problem Statement
Every day, people face micro-problems related to planning, decision-making, confusion, and productivity. While large goals are often tracked in generic project management tools, the small, immediate friction points—like figuring out how to study for an upcoming exam, planning a productive Sunday, or breaking down a new hobby—often cause decision paralysis. Users need a system that instantly turns their overwhelming thoughts into structured, actionable, and trackable plans.

## 2. Target Users
- **Students:** Needing structured study plans, assignment breakdowns, or exam prep strategies.
- **Young Professionals:** Balancing work tasks, personal planning, or side projects.
- **Individuals with ADHD / Decision Paralysis:** Those who struggle to start tasks because the path forward is unclear.
- **Goal-Oriented Planners:** Users seeking structured daily or weekly action items.

## 3. Key Features (MVP Scope)
- **Natural Language Input:** A simple input field where users dump their thoughts ("What do you want to do?").
- **AI-Powered Analysis:** Integration with Gemini API to analyze intent, categorize the goal, determine urgency, and generate a structured plan.
- **Dashboard & Visualization:**
  - **Goal Card:** Clear restatement of the objective.
  - **Tasks (Checklist):** Actionable, sequential steps to start.
  - **Timeline:** A logical step flow or schedule.
  - **Risks:** Potential roadblocks to watch out for.
  - **Next Action:** The immediate next step to take right now.
- **Dynamic Theme Adjustments:** UI adaptations based on AI classification (e.g., Red for Urgent, Blue for Productivity, Green for Calm).
- **Interactive Elements:** Staggered animations, loading states ("AI is analyzing..."), and clickable tasks.

## 4. User Flow
1. **Landing:** User opens the web app and sees a centralized, inviting input prompt on a futuristic, glassmorphism UI.
2. **Input:** User types a vague or specific goal (e.g., "I need to prepare for a software engineering interview in 2 weeks") and clicks "Generate Plan".
3. **Processing:** The UI shifts to a loading state with smooth animations.
4. **Display:** The dashboard dynamically populates with staggered animated cards showing the Goal, Tasks, Timeline, Risks, and the Next Action. The theme subtly adjusts based on the context.
5. **Interaction:** User reviews the plan, checks off tasks, or clicks a button to regenerate or explain the plan.

## 5. MVP Scope (3-4 Hour Build)
- **Frontend:** HTML/CSS/JS with a dark futuristic theme, glassmorphism, neon accents (blue, purple), and smooth CSS transitions. No heavy JS framework required for the MVP to ensure speed and simplicity.
- **Backend:** Python Flask API (`/generate`) that accepts the prompt and returns a validated JSON structure.
- **AI Integration:** Direct integration with Google Gemini Python SDK using an environment variable API key.
- **Deployment/Run:** Local execution via `flask run`.
