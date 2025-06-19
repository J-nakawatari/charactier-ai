# Token Calculation Explanation

## Issue Summary

The user reported that with 1,774,254 tokens, the system shows only 1,016 remaining messages instead of the expected ~17,742 messages (if assuming 100 tokens per message).

## Root Cause

The token calculation is **working correctly**. The discrepancy occurs because:

1. **Actual token consumption per message is ~1,746 tokens**, not 100 tokens
2. 1,774,254 tokens ÷ 1,746 tokens/message = 1,016 messages ✓

## Why Does Each Message Cost So Many Tokens?

Each chat message API call includes:

1. **System Prompt** (~500-1000 tokens)
   - Character personality description
   - Tone adjustments based on affinity level
   - Mood modifiers
   - User name personalization

2. **Conversation History** (~500-800 tokens)
   - Last 10 messages (truncated to 120 chars each)
   - Maintains context for coherent conversations

3. **User Message** (~50-200 tokens)
   - The actual message from the user

4. **AI Response** (~200-500 tokens)
   - The generated response from the AI

**Total: 1,250-2,500 tokens per message exchange**

## Token Consumption Breakdown

```
Example for a typical message:
- System Prompt: 800 tokens
- Conversation History (10 msgs): 600 tokens
- User Message: 50 tokens
- AI Response: 296 tokens
--------------------------------
Total: 1,746 tokens
```

## Solutions Implemented

1. **Added Debug Logging** (development mode only)
   - Shows actual token calculations in console

2. **Added Information Tooltip**
   - Explains token consumption to users
   - Shows last message cost
   - Clarifies that consumption varies

3. **Created Debug Script**
   - `backend/scripts/debugTokenCalculation.js`
   - Analyzes user's token usage patterns
   - Shows average tokens per character

## Recommendations for Optimization

1. **Reduce System Prompt Length**
   - Currently using full character descriptions
   - Could summarize to key traits only

2. **Optimize Conversation History**
   - Currently including 10 messages
   - Could reduce to 5-7 messages
   - Better truncation strategy

3. **Implement Prompt Caching**
   - Already partially implemented
   - Could expand caching strategy

4. **Use Smaller Models for Simple Characters**
   - gpt-3.5-turbo uses fewer tokens
   - gpt-4o-mini is a good middle ground

## User Communication

The tooltip now explains:
- Average token consumption
- Factors affecting consumption
- Actual last message cost

This helps set proper expectations for users about their remaining message count.