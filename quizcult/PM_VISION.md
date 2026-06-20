# QuizCult PM Vision: Any Topic, Any Time

## Insight
Users don't want "trending news quizzes." They want to prove they know more than their friends about WHATEVER they're already talking about.

## The Real Use Cases

### 1. IPL Match Last Night
- Friend posts: "RCV totally choked yesterday"
- You: *creates quiz* "RCB vs CSK - What Actually Happened?"
- Score 5/5, share: "I actually watched the match 😎"

### 2. Movie Weekend
- Group chat: "Did you see Kalki?"
- You: *creates quiz* "Kalki 2898 AD - Real or Fake?"
- Challenge the friend who claims they "got it"

### 3. Office Drama
- Slack: "Did you hear about the reorg?"
- You: *creates quiz* "Who's Getting Fired? (The Quiz)"
- Obviously keep it fun, not mean

### 4. Family WhatsApp
- Dad forwards: "Modi's new scheme"
- You: *creates quiz* "Scheme Name or Movie Title?"
- Roast dad's forwarding habits

### 5. Twitter/X Drama
- "Did you see what that founder tweeted?"
- Quiz: "Founder Meltdown or Motivational Quote?"

## How It Works (User Flow)

```
User sees something interesting
    ↓
"Make this a quiz" (one tap)
    ↓
AI generates 5 questions from the topic
    ↓
User plays first (to set the score to beat)
    ↓
"Share to challenge friends"
    ↓
Friend gets: "Gagan scored 4/5 on [Topic]. Can you beat?"
```

## Input Methods (Progressive)

### MVP: Text Input
- User pastes a headline / tweet / message
- "Generate quiz from this"

### V2: Screenshot
- User shares screenshot of tweet/news
- OCR + AI = quiz

### V3: URL
- Paste any URL (news article, tweet, blog)
- AI reads + generates quiz

### V4: Voice
- "Make a quiz about today's IPL match"
- Speech-to-text → generate

## Technical Reality

### What we have now:
- ✅ AI generates quiz from any text topic
- ✅ Challenge/share flow works
- ❌ User can't input custom topic

### What we need:
1. **Topic input field** (text box + submit)
2. **Topic-to-quiz generation** (already works with LLM)
3. **Save to database** (already works)
4. **Show on home feed** (already works)

### Time to build: ~2 hours

## Why This Changes Everything

| Before | After |
|--------|-------|
| 7 pre-made quizzes | Infinite user-generated quizzes |
| "Play Python quiz" | "Play quiz about what WE'RE talking about" |
| Generic share | "I made this quiz about [specific thing]" |
| Passive consumer | Active creator |

## The Metric That Matters

**"Quizzes Created Per User Per Week"**

- < 0.1: Dead product
- 0.5: Okay
- > 1.0: Viral (users creating more than they consume)

## Next Steps

1. Add "Create Quiz" button to home page
2. Text input + "Generate" 
3. User plays first (sets baseline)
4. Auto-share flow
5. Track "quizzes created" metric

## Edge Cases

- Inappropriate content → AI moderation
- Nonsense input → "Couldn't make a quiz from that"
- Too niche → "Try something more general"
- Existing quiz → "There's already a quiz about this!"
