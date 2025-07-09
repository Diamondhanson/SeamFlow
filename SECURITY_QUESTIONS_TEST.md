# 🔒 Security Questions Backend Testing Guide

## Frontend Testing Steps

### Step 1: Setup Security Questions
1. Launch your app and navigate to Settings → Security Questions
2. Select two different questions
3. Enter answers (e.g., "fluffy" and "pizza")
4. Check browser console for success/error messages
5. **Expected Result**: "Security questions have been set up successfully!"

### Step 2: Verify Database Storage
Go to Supabase dashboard → Table Editor → users_profile:
```sql
SELECT security_question_1, security_answer_1_hash, security_question_2, security_answer_2_hash 
FROM users_profile WHERE id = 'your-user-id';
```
**Expected**: Questions stored as text, answers as SHA-256 hashes

### Step 3: Test PIN Recovery
1. Go to PIN Entry screen
2. Tap "Forgot PIN" → "Use Security Questions"
3. Answer the questions with EXACT same answers
4. **Expected**: PIN should be reset successfully

### Step 4: Test Wrong Answers
1. Try PIN recovery with wrong answers
2. **Expected**: Should show "Invalid security answers" error
3. Check `recovery_audit_log` table for failed attempts

## Database Testing Commands

### Check Hash Consistency
```sql
-- Test that same answer produces same hash
SELECT security_answer_1_hash FROM users_profile WHERE id = 'your-user-id';
-- Run this multiple times with same answer - should match
```

### Check Audit Logging
```sql
SELECT * FROM recovery_audit_log 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;
```

### Verify RLS Policies
```sql
-- Should only return your own data
SELECT * FROM users_profile WHERE id != 'your-user-id';
-- Should return empty if RLS is working
```

## Manual Hash Testing

### Test in Browser Console (Dev Tools):
```javascript
// Test the hash function
const testHash = async () => {
  const answer = "fluffy";
  const hash1 = await hashSecurityAnswer(answer);
  const hash2 = await hashSecurityAnswer(answer);
  console.log("Hash 1:", hash1);
  console.log("Hash 2:", hash2);
  console.log("Match:", hash1 === hash2); // Should be true
};
```

## End-to-End Testing Checklist

- [ ] ✅ Setup questions UI works
- [ ] ✅ Questions stored in database
- [ ] ✅ Answers hashed (not plain text)
- [ ] ✅ PIN recovery works with correct answers
- [ ] ✅ PIN recovery fails with wrong answers
- [ ] ✅ Audit logging works
- [ ] ✅ RLS policies protect data
- [ ] ✅ Same answer produces same hash
- [ ] ✅ Different answers produce different hashes

## Common Issues & Solutions

### "Failed to set up security questions"
- Check database permissions
- Verify users_profile table has required columns
- Check Supabase console for detailed errors

### "Invalid security answers" (but answers are correct)
- Answers are case-sensitive after normalization
- Check for extra spaces
- Verify hash function is working

### No audit logs
- Check if recovery_audit_log table exists
- Verify RLS policies allow inserts

## Production Readiness Check

✅ **Security**: Answers are hashed, not stored as plain text
✅ **Validation**: Proper error handling and user feedback
✅ **Audit Trail**: All attempts logged for security monitoring
✅ **RLS**: Row-level security protecting user data
✅ **Salt**: Consistent salt prevents rainbow table attacks 