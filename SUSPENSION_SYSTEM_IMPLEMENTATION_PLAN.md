# SUSPENSION SYSTEM IMPLEMENTATION PLAN
## Professional 4th & 5th Offense Handling

### 📋 OVERVIEW
Implement a two-tier suspension system with countdown timers, point-based lifting, and integrated point purchase flow.

---

## 🎯 PHASE 1: SUSPENSION MODAL COMPONENT
**File:** `src/components/SuspensionModal.tsx` (NEW)

### Features:
1. **4th Offense (1-hour suspension)**
   - Countdown timer showing remaining time
   - Option to lift with 100 points
   - "Buy Points" button if balance < 100

2. **5th Offense (5-hour suspension)**  
   - Countdown timer showing remaining time
   - Option to lift with 500 points
   - "Buy Points" button if balance < 500

3. **Georgian + English translations**
4. **Real-time countdown updates**
5. **Integrated with point purchase flow**

### Component Props:
```typescript
interface SuspensionModalProps {
  penalty: {
    offense_number: number;
    penalty_type: '1hour' | '24hour' | 'permanent';
    suspended_until: string;
    can_lift_with_points: boolean;
  };
  userBalance: number;
  onLift: () => Promise<void>;
  onClose: () => void;
  onBuyPoints: () => void;
}
```

---

## 🎯 PHASE 2: GEORGIAN TRANSLATIONS
**Files:** 
- `src/locales/ka.json`
- `src/lib/i18n.tsx`

### Translation Keys Needed:
```json
{
  "suspension": {
    "title": "დროებითი შეზღუდვა",
    "subtitle_1hour": "თქვენ გაქვთ 1-საათიანი შეზღუდვა",
    "subtitle_5hour": "თქვენ გაქვთ 5-საათიანი შეზღუდვა",
    
    "reason_4th": "4 წარუმატებელი აღება",
    "reason_5th": "5 წარუმატებელი აღება",
    
    "countdown_label": "დარჩენილი დრო:",
    "hours": "საათი",
    "minutes": "წუთი",
    "seconds": "წამი",
    
    "wait_option": "დაელოდეთ {time}",
    "or": "ან",
    "lift_with_points": "მოხსენით {points} ქულით",
    "lift_button": "მოხსენით ({points} ქულა)",
    
    "insufficient_balance": "არასაკმარისი ქულები",
    "current_balance": "თქვენი ბალანსი: {balance} ქულა",
    "need_more": "გჭირდებათ კიდევ {points} ქულა",
    "buy_points_button": "შეიძინეთ ქულები",
    
    "warning_next": "შემდეგი დარღვევა: {consequence}",
    "consequence_5hour": "5-საათიანი შეზღუდვა (500 ქულა მოსახსნელად)",
    "consequence_24hour": "24-საათიანი შეზღუდვა (1000 ქულა მოსახსნელად)",
    
    "explanation": "დაგვიანებული აღება პრობლემას უქმნის პარტნიორებს და ზღუდავს სხვა მომხმარებლების შესაძლებლობებს."
  }
}
```

---

## 🎯 PHASE 3: POINT PURCHASE MODAL
**File:** `src/components/PointPurchaseModal.tsx` (NEW)

### Features:
- Show available point packages (100, 500, 1000 points)
- Calculate required points to lift penalty
- Highlight recommended package
- Integrate with payment system
- Show current balance

### Packages:
```typescript
const POINT_PACKAGES = [
  { points: 100, price: 5, recommended: penalty.points_to_lift <= 100 },
  { points: 500, price: 20, recommended: penalty.points_to_lift <= 500 },
  { points: 1000, price: 35, recommended: penalty.points_to_lift <= 1000 },
];
```

---

## 🎯 PHASE 4: DATABASE UPDATES

### Update penalty system:
1. **4th offense:** `penalty_type = '1hour'`, `suspended_until = NOW() + 1 hour`
2. **5th offense:** `penalty_type = '5hour'` (NEW TYPE), `suspended_until = NOW() + 5 hours`
3. Add `points_to_lift` column calculation:
   - 4th offense: 100 points
   - 5th offense: 500 points
   - 6th offense: 1000 points

### SQL Migration:
```sql
-- Add new penalty type for 5-hour suspension
ALTER TABLE user_penalties 
  DROP CONSTRAINT IF EXISTS user_penalties_penalty_type_check;

ALTER TABLE user_penalties 
  ADD CONSTRAINT user_penalties_penalty_type_check 
  CHECK (penalty_type IN ('warning', '1hour', '5hour', '24hour', 'permanent'));

-- Update function to calculate points_to_lift
CREATE OR REPLACE FUNCTION calculate_lift_points(offense_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE 
    WHEN offense_num = 4 THEN 100
    WHEN offense_num = 5 THEN 500
    WHEN offense_num >= 6 THEN 1000
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 PHASE 5: COUNTDOWN TIMER HOOK
**File:** `src/hooks/useCountdown.ts` (NEW)

```typescript
export function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        clearInterval(interval);
      } else {
        setTimeLeft({
          hours: Math.floor(distance / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          isExpired: false
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
```

---

## 🎯 PHASE 6: LIFT PENALTY API
**File:** `src/lib/api/penalty.ts`

### Add function:
```typescript
export async function liftPenaltyWithPoints(
  penaltyId: string,
  pointsCost: number
): Promise<{ success: boolean; newBalance: number }> {
  // 1. Check user balance
  // 2. Deduct points
  // 3. Deactivate penalty
  // 4. Set is_suspended = false
  // 5. Log transaction
  // 6. Return new balance
}
```

### Supabase Function:
```sql
CREATE FUNCTION lift_penalty_with_points(
  p_penalty_id UUID,
  p_user_id UUID,
  p_points_cost INTEGER
) RETURNS JSON ...
```

---

## 🎯 PHASE 7: UPDATE create_reservation_atomic
**Update:** Function should check for active suspensions properly

```sql
-- Check for ACTIVE suspensions (not expired)
SELECT EXISTS(
  SELECT 1 FROM user_penalties
  WHERE user_id = v_customer_id 
  AND is_active = true
  AND penalty_type IN ('1hour', '5hour', '24hour', 'permanent')
  AND (suspended_until IS NULL OR suspended_until > NOW())
) INTO v_has_suspension;
```

---

## 📁 FILE STRUCTURE
```
src/
├── components/
│   ├── SuspensionModal.tsx          [NEW]
│   ├── PointPurchaseModal.tsx       [NEW]
│   └── MissedPickupPopup.tsx        [EXISTING]
├── hooks/
│   └── useCountdown.ts              [NEW]
├── lib/
│   ├── api/
│   │   └── penalty.ts               [UPDATE]
│   └── i18n.tsx                     [UPDATE]
└── locales/
    ├── ka.json                      [UPDATE]
    └── en.json                      [UPDATE]
```

---

## 🔄 IMPLEMENTATION ORDER

### Step 1: Database & Backend (30 min)
1. Create SQL migration for 5-hour penalty type
2. Add `calculate_lift_points()` function
3. Create `lift_penalty_with_points()` function
4. Update `create_reservation_atomic()` to check expiration

### Step 2: Translations (15 min)
1. Add all Georgian translations to ka.json
2. Add English translations to en.json
3. Update i18n.tsx with new keys

### Step 3: Countdown Hook (15 min)
1. Create `useCountdown.ts` hook
2. Test with different time values

### Step 4: SuspensionModal Component (45 min)
1. Create component with countdown display
2. Add lift button with points
3. Add buy points button
4. Style with Tailwind/shadcn
5. Test with Georgian/English

### Step 5: PointPurchaseModal (30 min)
1. Create component with packages
2. Add payment integration
3. Style and test

### Step 6: Integration (30 min)
1. Add SuspensionModal to App.tsx
2. Connect to penalty check flow
3. Test full user journey:
   - 4th offense → suspension modal → countdown/lift
   - 5th offense → stronger suspension → countdown/lift
4. Test insufficient balance → buy points flow

### Step 7: Testing & Polish (30 min)
1. Test all scenarios
2. Fix Georgian text alignment
3. Verify countdown accuracy
4. Test point lifting transaction

---

## ✅ SUCCESS CRITERIA
- [  ] Georgian translations complete and natural
- [  ] Countdown timer updates every second
- [  ] Lift button deducts points correctly
- [  ] Buy points modal opens when balance insufficient
- [  ] 4th offense = 1 hour / 100 points
- [  ] 5th offense = 5 hours / 500 points
- [  ] Suspensions block reservations
- [  ] Expired suspensions auto-lift
- [  ] All modals close properly
- [  ] Mobile responsive

---

## 🎨 UI MOCKUP STRUCTURE

### 4th Offense (1-hour):
```
┌────────────────────────────────────────┐
│  ⏰ დროებითი შეზღუდვა                   │
│                                        │
│  4 წარუმატებელი აღება                  │
│  თქვენ გაქვთ 1-საათიანი შეზღუდვა       │
│                                        │
│  ⏱️ დარჩენილი დრო: 0:47:23            │
│                                        │
│  [━━━━━━━━━━━━━━━━━━━━━] 78%          │
│                                        │
│  გთხოვთ, დაელოდოთ ან მოხსენით ქულებით│
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ მოხსენით 100 ქულით               │ │
│  │ თქვენი ბალანსი: 995 ქულა    ✅   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ⚠️ შემდეგი დარღვევა: 5-საათიანი     │
│     შეზღუდვა (500 ქულა)              │
│                                        │
│  [დახურვა]                             │
└────────────────────────────────────────┘
```

### 4th Offense (insufficient balance):
```
┌────────────────────────────────────────┐
│  ⏰ დროებითი შეზღუდვა                   │
│  ...                                   │
│  ┌──────────────────────────────────┐ │
│  │ ❌ არასაკმარისი ქულები            │ │
│  │ თქვენი ბალანსი: 50 ქულა          │ │
│  │ გჭირდებათ კიდევ 50 ქულა          │ │
│  │                                   │ │
│  │ [💰 შეიძინეთ ქულები]             │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

Ready to implement? Reply "yes" and I'll start with Step 1 (Database & Backend)!
