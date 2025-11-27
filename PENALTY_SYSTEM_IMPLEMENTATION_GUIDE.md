# 🎯 PENALTY SYSTEM - IMPLEMENTATION PLAN & TESTING GUIDE

## 📊 Implementation Status

### ✅ Completed (Steps 1-4)
- [x] Database migration created
- [x] API functions built
- [x] React components created
  - [x] PenaltyModal
  - [x] ForgivenessRequestModal
  - [x] PartnerForgivenessDecisionModal

### 🔄 In Progress (Step 5)
- [ ] Integrate penalty checks into reservation flow

### ⏳ Remaining (Steps 6-8)
- [ ] Create cron job Edge Function
- [ ] Add partner dashboard UI
- [ ] End-to-end testing

---

## 📋 STEP-BY-STEP DEPLOYMENT GUIDE

### **STEP 1: Apply Database Migration** ✅ READY

**File:** `supabase/migrations/20251127_penalty_system_complete.sql`

**Actions:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of migration file
3. Run the SQL script
4. Verify tables created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%penalty%';
   ```

**Expected Output:**
```
user_penalties
penalty_offense_history
penalty_point_transactions
```

**Verify Functions:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%penalty%' 
OR routine_name LIKE '%reliability%';
```

---

### **STEP 2: Test API Functions** ✅ READY

**File:** `src/lib/api/penalty.ts`

**Manual Tests in Browser Console:**

```typescript
// Test 1: Check if user can reserve
import { canUserReserve } from '@/lib/api/penalty';
const result = await canUserReserve('YOUR_USER_ID');
console.log('Can reserve:', result);

// Test 2: Get active penalty
import { getActivePenalty } from '@/lib/api/penalty';
const penalty = await getActivePenalty('YOUR_USER_ID');
console.log('Active penalty:', penalty);

// Test 3: Apply penalty (test with reservation ID)
import { applyPenalty } from '@/lib/api/penalty';
const newPenalty = await applyPenalty('RESERVATION_ID');
console.log('Penalty applied:', newPenalty);
```

---

### **STEP 3: Integrate Penalty Check into Reservation Flow** 🔄 IN PROGRESS

**Files to Modify:**
1. `src/lib/api.ts` - Add penalty check before reservation
2. `src/pages/ReserveOffer.tsx` - Show penalty modal if suspended
3. `src/pages/Index.tsx` - Check penalty on load

**Implementation:**

#### A. Update `src/lib/api.ts` - `createReservation` function

**Add before creating reservation:**
```typescript
// Check if user is suspended
import { canUserReserve, getActivePenalty, getPenaltyDetails } from './api/penalty';

export async function createReservation(offerId: string, userId: string) {
  // NEW: Check penalty status
  const canReserve = await canUserReserve(userId);
  
  if (!canReserve.can_reserve) {
    // Get full penalty details for modal
    if (canReserve.penalty_id) {
      const penaltyDetails = await getPenaltyDetails(canReserve.penalty_id);
      throw new Error(JSON.stringify({
        type: 'PENALTY_BLOCKED',
        penalty: penaltyDetails,
        message: canReserve.reason
      }));
    }
    throw new Error('Cannot create reservation: Account suspended');
  }
  
  // Continue with normal reservation creation...
  const { data, error } = await supabase
    .from('reservations')
    .insert({...})
    ...
}
```

#### B. Update `src/pages/ReserveOffer.tsx`

**Add penalty modal state:**
```typescript
import { useState, useEffect } from 'react';
import { PenaltyModal } from '@/components/PenaltyModal';
import { canUserReserve, getPenaltyDetails } from '@/lib/api/penalty';

export default function ReserveOffer() {
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  
  // Check penalty on mount
  useEffect(() => {
    checkPenaltyStatus();
  }, [user]);
  
  const checkPenaltyStatus = async () => {
    if (!user) return;
    
    const result = await canUserReserve(user.id);
    
    if (!result.can_reserve && result.penalty_id) {
      const penalty = await getPenaltyDetails(result.penalty_id);
      
      // Get user points
      const { data: points } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      setPenaltyData(penalty);
      setUserPoints(points?.balance || 0);
      setShowPenaltyModal(true);
    }
  };
  
  const handleReserve = async () => {
    try {
      await createReservation(offerId, user.id);
      // Success...
    } catch (error) {
      // Check if it's a penalty error
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.type === 'PENALTY_BLOCKED') {
          setPenaltyData(errorData.penalty);
          setShowPenaltyModal(true);
          return;
        }
      } catch {}
      
      // Regular error handling...
    }
  };
  
  return (
    <>
      {/* Your existing UI */}
      
      {/* Penalty Modal */}
      {showPenaltyModal && penaltyData && (
        <PenaltyModal
          penalty={penaltyData}
          userPoints={userPoints}
          onClose={() => setShowPenaltyModal(false)}
          onPenaltyLifted={() => {
            setShowPenaltyModal(false);
            checkPenaltyStatus(); // Refresh
          }}
        />
      )}
    </>
  );
}
```

#### C. Update `src/App.tsx` - Homepage penalty check

**Add to main App component:**
```typescript
import { useEffect, useState } from 'react';
import { PenaltyModal } from '@/components/PenaltyModal';
import { getActivePenalty, getPenaltyDetails } from '@/lib/api/penalty';

export default function App() {
  const [activePenalty, setActivePenalty] = useState(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  
  // Check for unacknowledged penalties on login
  useEffect(() => {
    checkForActivePenalty();
  }, [user]);
  
  const checkForActivePenalty = async () => {
    if (!user) return;
    
    const penalty = await getActivePenalty(user.id);
    
    if (penalty && !penalty.acknowledged) {
      const fullPenalty = await getPenaltyDetails(penalty.penalty_id);
      
      // Get user points
      const { data: points } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      setActivePenalty(fullPenalty);
      setUserPoints(points?.balance || 0);
      setShowPenaltyModal(true);
    }
  };
  
  return (
    <>
      {/* Your existing app */}
      
      {/* Show penalty modal on login if unacknowledged */}
      {showPenaltyModal && activePenalty && (
        <PenaltyModal
          penalty={activePenalty}
          userPoints={userPoints}
          onClose={() => {}}  // Don't allow closing until acknowledged
          onPenaltyLifted={() => {
            setShowPenaltyModal(false);
            checkForActivePenalty(); // Refresh
          }}
        />
      )}
    </>
  );
}
```

---

### **STEP 4: Create Cron Job Edge Function** ⏳ NEXT

**File:** `supabase/functions/detect-missed-pickups/index.ts`

**Create:**
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    console.log('[Cron] Checking for missed pickups...');
    
    // Find reservations past pickup_end that haven't been marked as missed
    const { data: missedReservations, error } = await supabase
      .from('reservations')
      .select('*, users!reservations_user_id_fkey(id), partners!reservations_partner_id_fkey(id)')
      .lt('pickup_end', new Date().toISOString())
      .in('status', ['reserved', 'confirmed'])
      .eq('penalty_applied', false)
      .limit(100);
    
    if (error) throw error;
    
    console.log(`[Cron] Found ${missedReservations?.length || 0} missed pickups`);
    
    const results = [];
    
    for (const reservation of missedReservations || []) {
      try {
        // Apply penalty (uses the applyPenalty logic from penalty.ts)
        const penaltyResult = await applyPenaltyServerSide(reservation);
        results.push({ reservation_id: reservation.id, success: true, penalty: penaltyResult });
      } catch (err) {
        console.error(`[Cron] Error applying penalty for reservation ${reservation.id}:`, err);
        results.push({ reservation_id: reservation.id, success: false, error: err.message });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function applyPenaltyServerSide(reservation: any) {
  // Get user's offense history
  const { data: penalties } = await supabase
    .from('user_penalties')
    .select('offense_number')
    .eq('user_id', reservation.user_id)
    .order('offense_number', { ascending: false });
  
  const offenseNumber = (penalties?.[0]?.offense_number || 0) + 1;
  const config = getPenaltyConfig(offenseNumber);
  
  const suspendedUntil = config.duration 
    ? new Date(Date.now() + config.duration * 1000).toISOString()
    : null;
  
  // Create penalty
  const { data: penalty, error } = await supabase
    .from('user_penalties')
    .insert({
      user_id: reservation.user_id,
      reservation_id: reservation.id,
      partner_id: reservation.partner_id,
      offense_number: offenseNumber,
      offense_type: 'missed_pickup',
      penalty_type: config.type,
      suspended_until: suspendedUntil,
      can_lift_with_points: config.canLift,
      points_required: config.pointCost,
      forgiveness_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Update user
  await supabase
    .from('users')
    .update({
      is_suspended: offenseNumber > 1,
      suspended_until: suspendedUntil,
      current_penalty_level: offenseNumber,
      updated_at: new Date().toISOString()
    })
    .eq('id', reservation.user_id);
  
  // Mark reservation
  await supabase
    .from('reservations')
    .update({ 
      status: 'missed',
      penalty_applied: true,
      penalty_id: penalty.id
    })
    .eq('id', reservation.id);
  
  return penalty;
}

function getPenaltyConfig(offense: number) {
  const configs = {
    1: { type: 'warning', duration: null, canLift: false, pointCost: 0 },
    2: { type: '1hour', duration: 3600, canLift: true, pointCost: 100 },
    3: { type: '24hour', duration: 86400, canLift: true, pointCost: 500 },
    4: { type: 'permanent', duration: null, canLift: false, pointCost: 0 }
  };
  return configs[offense] || configs[4];
}
```

**Deploy:**
```bash
supabase functions deploy detect-missed-pickups
```

**Schedule (Supabase Dashboard → Database → Cron Jobs):**
```sql
SELECT cron.schedule(
  'detect-missed-pickups',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/detect-missed-pickups',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
  ) as request_id;
  $$
);
```

---

### **STEP 5: Add Partner Dashboard Forgiveness UI** ⏳ NEXT

**File:** `src/pages/PartnerDashboard.tsx`

**Add Tab:**
```typescript
import { useState, useEffect } from 'react';
import { PartnerForgivenessDecisionModal } from '@/components/PartnerForgivenessDecisionModal';
import { getPendingForgivenessRequests } from '@/lib/api/penalty';

function PartnerDashboard() {
  const [forgivenessRequests, setForgivenessRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  useEffect(() => {
    loadForgivenessRequests();
  }, [partnerId]);
  
  const loadForgivenessRequests = async () => {
    const requests = await getPendingForgivenessRequests(partnerId);
    setForgivenessRequests(requests);
  };
  
  return (
    <Tabs>
      {/* Existing tabs... */}
      
      <TabsContent value="forgiveness">
        <Card>
          <CardHeader>
            <CardTitle>Forgiveness Requests ({forgivenessRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {forgivenessRequests.length === 0 ? (
              <p className="text-gray-500">No pending forgiveness requests</p>
            ) : (
              <div className="space-y-4">
                {forgivenessRequests.map(request => (
                  <Card key={request.id} className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{request.users.name}</p>
                          <p className="text-sm text-gray-600">
                            Missed: {request.reservations.offer_title}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            "{request.forgiveness_request_message}"
                          </p>
                        </div>
                        <Button
                          onClick={() => setSelectedRequest(request)}
                          variant="outline"
                        >
                          Review Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      {selectedRequest && (
        <PartnerForgivenessDecisionModal
          penalty={selectedRequest}
          partnerId={partnerId}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            loadForgivenessRequests();
          }}
        />
      )}
    </Tabs>
  );
}
```

---

## 🧪 TESTING PLAN

### **Test 1: Database Migration**
```sql
-- Verify tables
SELECT * FROM user_penalties LIMIT 1;
SELECT * FROM penalty_offense_history LIMIT 1;
SELECT * FROM penalty_point_transactions LIMIT 1;

-- Verify functions
SELECT can_user_reserve('YOUR_USER_ID');
SELECT * FROM get_active_penalty('YOUR_USER_ID');
SELECT calculate_reliability_score('YOUR_USER_ID');
```

### **Test 2: Apply First Penalty (Warning)**
```typescript
// In browser console
import { applyPenalty } from '@/lib/api/penalty';
const penalty = await applyPenalty('RESERVATION_ID');
console.log('Penalty:', penalty);
// Expected: offense_number = 1, penalty_type = 'warning', no suspension
```

### **Test 3: Apply Second Penalty (1 Hour Ban)**
```typescript
const penalty2 = await applyPenalty('ANOTHER_RESERVATION_ID');
console.log('Penalty 2:', penalty2);
// Expected: offense_number = 2, penalty_type = '1hour', suspended_until set
```

### **Test 4: Lift Ban with Points**
```typescript
import { liftBanWithPoints } from '@/lib/api/penalty';
const result = await liftBanWithPoints(penalty2.id, 'USER_ID');
console.log('Lift result:', result);
// Expected: success = true, newBalance = oldBalance - 100
```

### **Test 5: Request Forgiveness**
```typescript
import { requestForgiveness } from '@/lib/api/penalty';
const result = await requestForgiveness(penalty2.id, 'USER_ID', 'I am very sorry, traffic was terrible');
console.log('Forgiveness request:', result);
// Expected: success = true
```

### **Test 6: Partner Grant Forgiveness**
```typescript
import { partnerDecideForgiveness } from '@/lib/api/penalty';
const result = await partnerDecideForgiveness(penalty2.id, 'PARTNER_ID', 'granted', 'No problem!');
console.log('Decision:', result);
// Expected: success = true, user's penalty removed
```

### **Test 7: End-to-End Flow**
1. Create reservation
2. Let it expire (change pickup_end to past)
3. Run cron job manually
4. Check user gets penalty
5. Try to create new reservation → blocked
6. Lift ban with points
7. Try again → success

---

## 📝 **NEXT STEPS TO COMPLETE**

1. ✅ Apply database migration in Supabase
2. 🔄 Integrate penalty checks into reservation flow (modify 3 files)
3. ⏳ Create and deploy cron job Edge Function
4. ⏳ Add forgiveness tab to Partner Dashboard
5. ⏳ Test complete end-to-end flow
6. ⏳ Deploy to production

**Estimated Time:** 2-3 hours for remaining steps

---

## 🚨 **IMPORTANT NOTES**

- **Backup database before applying migration**
- **Test thoroughly in development first**
- **Cron job runs every 5 minutes - monitor performance**
- **Forgiveness requests expire after 24 hours automatically**
- **Point lift transactions are irreversible**
- **Permanent bans require admin intervention**

---

Would you like me to proceed with implementing Step 3 (reservation flow integration) now?
