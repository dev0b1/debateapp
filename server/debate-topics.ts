import { ConversationTopic } from "@shared/schema";

export const debateTopics: ConversationTopic[] = [
  {
    id: "ai-regulation",
    title: "AI Regulation & Ethics",
    description: "Should AI development be heavily regulated?",
    difficulty: "advanced",
    category: "Technology",
    prompt: `You are engaging in a debate about AI regulation and ethics. Choose a clear position and defend it passionately.

DEBATE FOCUS:
- AI safety and control
- Economic impact and job displacement
- Privacy and surveillance concerns
- Innovation vs. safety trade-offs
- International competition and regulation

KEY ARGUMENTS TO CONSIDER:
- Should AI development be slowed down for safety?
- Who should control AI development - governments or private companies?
- How do we balance innovation with ethical concerns?
- What role should international cooperation play?

DEBATE STYLE:
- Present clear, compelling arguments
- Use specific examples and evidence
- Address counterarguments proactively
- Stay focused on the core issue
- Respect your opponent while defending your position`
  },
  {
    id: "universal-basic-income",
    title: "Universal Basic Income",
    description: "Should every citizen receive a guaranteed basic income?",
    difficulty: "intermediate",
    category: "Economics",
    prompt: `You are debating Universal Basic Income (UBI). Take a clear position and defend it with evidence and reasoning.

DEBATE FOCUS:
- Economic feasibility and cost
- Impact on work motivation and productivity
- Poverty reduction and social welfare
- Automation and job displacement
- Implementation challenges

KEY ARGUMENTS TO CONSIDER:
- Can we afford UBI without massive tax increases?
- Would UBI reduce or increase work motivation?
- How would UBI affect inflation and the economy?
- What about the dignity of work vs. basic security?

DEBATE STYLE:
- Use economic data and studies when possible
- Address both practical and philosophical aspects
- Consider real-world pilot programs
- Balance idealism with practical implementation`
  },
  {
    id: "social-media-regulation",
    title: "Social Media Regulation",
    description: "Should social media platforms be more heavily regulated?",
    difficulty: "intermediate",
    category: "Technology",
    prompt: `You are debating social media regulation. Defend your position on how much control governments should have over these platforms.

DEBATE FOCUS:
- Free speech vs. harmful content
- Mental health impacts, especially on youth
- Political polarization and misinformation
- Privacy and data protection
- Competition and market concentration

KEY ARGUMENTS TO CONSIDER:
- Should platforms be responsible for user-generated content?
- How do we balance free speech with preventing harm?
- What role should government play in content moderation?
- Are current platforms too powerful and need breaking up?

DEBATE STYLE:
- Use specific examples of both benefits and harms
- Consider international perspectives and regulations
- Address the technical challenges of content moderation
- Balance individual rights with collective welfare`
  },
  {
    id: "climate-action",
    title: "Climate Action vs. Economic Growth",
    description: "Should we prioritize climate action over economic growth?",
    difficulty: "intermediate",
    category: "Environment",
    prompt: `You are debating the trade-off between climate action and economic growth. Take a position on which should be prioritized.

DEBATE FOCUS:
- Economic costs of climate action
- Long-term economic benefits of sustainability
- Global cooperation and fairness
- Technology and innovation solutions
- Immediate vs. long-term priorities

KEY ARGUMENTS TO CONSIDER:
- Can we afford aggressive climate action without economic harm?
- What about developing countries' right to grow?
- Are renewable energy costs worth the investment?
- How urgent is the climate crisis really?

DEBATE STYLE:
- Use scientific data and economic projections
- Consider both developed and developing world perspectives
- Address the urgency vs. feasibility balance
- Present practical solutions and alternatives`
  },
  {
    id: "remote-work",
    title: "Remote Work vs. Office Work",
    description: "Is remote work better than traditional office work?",
    difficulty: "beginner",
    category: "Business",
    prompt: `You are debating the future of work - remote vs. office. Defend your preferred work model with evidence and reasoning.

DEBATE FOCUS:
- Productivity and performance
- Work-life balance and mental health
- Team collaboration and culture
- Cost savings and environmental impact
- Career development and networking

KEY ARGUMENTS TO CONSIDER:
- Are people more or less productive working remotely?
- How does remote work affect team dynamics and innovation?
- What about the social aspects and mental health?
- Is remote work sustainable long-term?

DEBATE STYLE:
- Use data from recent remote work experiments
- Consider different industries and job types
- Address both employee and employer perspectives
- Present hybrid solutions as alternatives`
  },
  {
    id: "education-reform",
    title: "Education System Reform",
    description: "Should we completely reform our education system?",
    difficulty: "intermediate",
    category: "Education",
    prompt: `You are debating education system reform. Take a position on whether our current system needs major changes.

DEBATE FOCUS:
- Standardized testing and assessment
- Curriculum relevance and job preparation
- Technology integration and online learning
- Teacher training and compensation
- Access and equity in education

KEY ARGUMENTS TO CONSIDER:
- Is the current system preparing students for the future?
- Should we focus more on skills vs. traditional subjects?
- How important is standardized testing?
- What role should technology play in education?

DEBATE STYLE:
- Use international comparisons and educational research
- Consider different student needs and learning styles
- Address both academic and practical outcomes
- Present specific reform proposals`
  },
  {
    id: "healthcare-system",
    title: "Healthcare System Reform",
    description: "Should we move to a single-payer healthcare system?",
    difficulty: "advanced",
    category: "Healthcare",
    prompt: `You are debating healthcare system reform, specifically single-payer vs. private insurance models.

DEBATE FOCUS:
- Cost and efficiency of different systems
- Quality of care and patient outcomes
- Access and equity in healthcare
- Innovation and medical advancement
- Implementation challenges and transition costs

KEY ARGUMENTS TO CONSIDER:
- Can single-payer provide better care at lower cost?
- How would it affect medical innovation and research?
- What about choice and competition in healthcare?
- Is the current system sustainable?

DEBATE STYLE:
- Use international healthcare system comparisons
- Address both economic and moral arguments
- Consider practical implementation challenges
- Present evidence from existing single-payer systems`
  },
  {
    id: "immigration-policy",
    title: "Immigration Policy",
    description: "Should we have more open or restrictive immigration policies?",
    difficulty: "advanced",
    category: "Politics",
    prompt: `You are debating immigration policy. Take a position on whether countries should have more open or restrictive policies.

DEBATE FOCUS:
- Economic impact of immigration
- Cultural integration and social cohesion
- Security and border control
- Humanitarian obligations and human rights
- Labor market effects and job competition

KEY ARGUMENTS TO CONSIDER:
- Do immigrants help or hurt the economy?
- How do we balance security with humanitarian concerns?
- What about cultural integration and social cohesion?
- Should we prioritize skilled vs. family-based immigration?

DEBATE STYLE:
- Use economic data and demographic studies
- Consider both humanitarian and practical concerns
- Address security and integration challenges
- Present balanced policy proposals`
  }
];

export function getTopicById(id: string): ConversationTopic | undefined {
  return debateTopics.find(topic => topic.id === id);
}

export function getTopicsByCategory(category: string): ConversationTopic[] {
  return debateTopics.filter(topic => topic.category === category);
}

export function getTopicsByDifficulty(difficulty: ConversationTopic['difficulty']): ConversationTopic[] {
  return debateTopics.filter(topic => topic.difficulty === difficulty);
}

export function getRandomTopic(): ConversationTopic {
  return debateTopics[Math.floor(Math.random() * debateTopics.length)];
} 