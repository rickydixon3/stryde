// One-time backfill script: computes ef_value, effort_level, drift_percent,
// drift_flag, ef_first_half, ef_last_half for all existing activities using
// their activity_streams data, then writes those values directly onto the
// activities table. Run this once, before dropping activity_streams, since
// this is the last time raw stream data will be read for these activities.
//
// Usage: npx ts-node src/scripts/backfillComputedSignals.ts

import 'dotenv/config';
import { supabase } from '../supabase';
import { computeRunEfficiency, RunEfficiencyViable } from '../signals/runEfficiency';
import { computeRunDrift } from '../signals/cardiacDrift';
import { computeBaselines } from '../utils/baselines';

async function backfill() {
  console.log('Starting backfill...');

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, resting_hr, max_hr');

  if (usersError || !users) {
    console.error('Failed to load users:', usersError);
    return;
  }

  for (const user of users) {
    if (!user.resting_hr || !user.max_hr) {
      console.log(`Skipping user ${user.id}: missing resting_hr/max_hr`);
      continue;
    }

    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id);

    if (activitiesError || !activities) {
      console.error(`Failed to load activities for user ${user.id}:`, activitiesError);
      continue;
    }

    const { data: streams, error: streamsError } = await supabase
      .from('activity_streams')
      .select('*')
      .in('activity_id', activities.map(a => a.id));

    if (streamsError) {
      console.error(`Failed to load streams for user ${user.id}:`, streamsError);
      continue;
    }

    const baselines = computeBaselines(activities);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const activity of activities) {
      const stream = streams?.find(s => s.activity_id === activity.id);
      const activityWithStream = { ...activity, stream };

      const efResult = computeRunEfficiency(
        activityWithStream,
        user.resting_hr,
        user.max_hr,
        baselines
      );

      const driftResult = computeRunDrift(
        activityWithStream,
        user.resting_hr,
        user.max_hr
      );

      const updatePayload: Record<string, number | string | null> = {
        ef_value: null,
        effort_level: null,
        drift_percent: null,
        drift_flag: null,
        ef_first_half: null,
        ef_last_half: null,
      };

      if (efResult.viable) {
        updatePayload.ef_value = (efResult as RunEfficiencyViable).efValue;
        updatePayload.effort_level = (efResult as RunEfficiencyViable).effortLevel;
      }

      if (driftResult.viable) {
        updatePayload.drift_percent = driftResult.drift;
        updatePayload.drift_flag = driftResult.flag;
        updatePayload.ef_first_half = driftResult.efFirstHalf;
        updatePayload.ef_last_half = driftResult.efLastHalf;
      }

      const hasAnyComputedValue = Object.values(updatePayload).some(v => v !== null);

      if (!hasAnyComputedValue) {
        skippedCount++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('activities')
        .update(updatePayload)
        .eq('id', activity.id);

      if (updateError) {
        console.error(`Failed to update activity ${activity.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`User ${user.id}: updated ${updatedCount}, skipped ${skippedCount} (not viable)`);
  }

  console.log('Backfill complete.');
}

backfill().catch(err => {
  console.error('Backfill script failed:', err);
  process.exit(1);
});