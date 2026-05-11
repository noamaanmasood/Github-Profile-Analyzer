🛡️ GitHub Profile Analyzer
Turn raw GitHub data into a developer narrative.

Most profile viewers just show stars and repos. GitHub Profile Analyzer uses the GitHub API to perform a deep-tissue scan of a developer's digital DNA. It calculates productivity velocity, community influence, and coding habits to assign dynamic Achievement Tags and a custom "Profile Roast" that tells the real story behind the green squares.

🚀 Unique Features
🎭 Dynamic Personality Tags: Automatically assigns titles like "The Open Source Hero" or "The Early Bird" based on commit timestamps, repo originality, and community engagement.

🔥 The Profile Roast: A witty, data-driven critique of a user's coding history, branch naming habits, and language choices.

📊 Productivity Forensics:

Peak Performance Mapping: Identify the exact hour and day a developer is most active.

Originality Score: A deep dive into original work vs. forks to identify true creators.

Influence Ratio: A mathematical look at follower-to-following ratios and "Reach per Repo."

⚔️ Comparison Mode: Battle-test two developers side-by-side to compare tech stacks, stars, and activity levels.

📈 Language Dominance: High-precision breakdown of a user's primary languages and framework preferences.

🛠️ The Tech Stack
Framework: Next.js for a lightning-fast, SEO-friendly frontend.

Styling: Tailwind CSS with a custom dark-mode aesthetic.

Data Fetching: Integration with the GitHub REST & GraphQL APIs for real-time profile auditing.

Animations: Smooth transitions and data loading states powered by Framer Motion.

Deployment: Optimized for Vercel.

🚦 Getting Started
1. Installation
Bash
git clone https://github.com/your-username/github-profile-analyzer.git
cd github-profile-analyzer
npm install
2. API Configuration
To avoid GitHub's rate limits and access all features, create a .env.local file:

Code snippet
GITHUB_TOKEN=your_personal_access_token_here
3. Run Locally
Bash
npm run dev
📖 How the "Tags" Work
The analyzer doesn't just count repos; it evaluates performance metrics:

Velocity: repos updated in the last 90 days.

Longevity: Account age (e.g., "GitHub Veteran").

Specialization: High percentage in a single language triggers specific expert tags.
