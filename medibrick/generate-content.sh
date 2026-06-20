#!/bin/bash
# Medibrick Content Generator — Isolated Script
# Run this to generate new content without affecting main session context

echo "📝 Medibrick Content Generator"
echo "=============================="
echo ""

DATE=$(date +%Y-%m-%d)
CONTENT_DIR="/Users/gagandeep/.openclaw/workspace/medibrick/content"

# Check if content already exists for today
if [ -f "$CONTENT_DIR/blog-$DATE.md" ]; then
    echo "Content for $DATE already exists."
    echo "Use --force to regenerate."
    echo ""
    echo "Existing files:"
    ls -la $CONTENT_DIR/*-$DATE.md 2>/dev/null
    exit 0
fi

echo "Generating content for $DATE..."
echo ""

# Note: This requires Ollama to be running
# Generate blog post
echo "1. Blog post..."
curl -s http://localhost:11434/api/chat -d "{
  \"model\": \"kimi-k2.6:cloud\",
  \"messages\": [{\"role\": \"user\", \"content\": \"Write 800-word blog post about healthcare staffing challenges in India. SEO keywords: healthcare staffing india, hospital recruitment, nurse shortage. Professional tone.\"}],
  \"stream\": false,
  \"options\": {\"temperature\": 0.7}
}" | jq -r '.message.content' > "$CONTENT_DIR/blog-$DATE.md" 2>/dev/null

if [ -s "$CONTENT_DIR/blog-$DATE.md" ]; then
    echo "   ✅ Blog post generated ($(wc -l < "$CONTENT_DIR/blog-$DATE.md") lines)"
else
    echo "   ❌ Blog generation failed (Ollama not running?)"
fi

# Generate LinkedIn posts
echo "2. LinkedIn posts..."
cat > "$CONTENT_DIR/linkedin-$DATE.md" << 'EOF'
# LinkedIn Content — $DATE

## Post 1: Founder Journey
[Generated content placeholder - customize with your story]

## Post 2: Industry Insight  
[Generated content placeholder - add current news]

## Post 3: Call to Action
[Generated content placeholder - add your pitch]

#healthcare #staffing #india #startups
EOF

echo "   ✅ LinkedIn template created"

# Generate newsletter
echo "3. Newsletter..."
cat > "$CONTENT_DIR/newsletter-$DATE.md" << 'EOF'
# The Medibrick Brief — $DATE

## 🏥 This Week in Indian Healthcare
[Add industry news here]

## 📊 Staffing Stats
[Add relevant statistics]

## 💡 Medibrick Updates
[Add your updates]

## 🎯 Lead Opportunities
[Add new leads]

---
Generated: $DATE
EOF

echo "   ✅ Newsletter template created"

echo ""
echo "✨ Content generation complete!"
echo ""
echo "Files created:"
ls -la $CONTENT_DIR/*-$DATE.md

echo ""
echo "Next steps:"
echo "  1. Edit the files to add your voice"
echo "  2. Publish blog to medibrick.com"
echo "  3. Schedule LinkedIn posts"
echo "  4. Send newsletter to subscribers"
